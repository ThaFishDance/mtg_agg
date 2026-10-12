import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy.engine import make_url

from app.main import create_app


@pytest.fixture
def client(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    schema = "test_" + uuid4().hex
    # Each test uses the supplied migration in a separate disposable schema.
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            admin.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(schema)))
            admin.execute((Path(__file__).parents[1] / "migrations/v001__create_initial_tables.sql").read_text())
            database_url = make_url(url).update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
            monkeypatch.setenv("DATABASE_URL", database_url)
            with TestClient(create_app()) as instance:
                yield instance
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


def user(client, email="one@example.com"):
    response = client.post("/api/v1/users", json={"first_name": "Ada", "last_name": "Lovelace", "email": email})
    assert response.status_code == 201, response.text
    return response.json()


def pod(client, members):
    response = client.post("/api/v1/pods", json={"members": members})
    assert response.status_code == 201, response.text
    return response.json()


def test_user_crud_and_validation(client):
    row = user(client)
    path = f"/api/v1/users/{row['user_id']}"
    assert client.get(path).json() == row
    assert client.get("/api/v1/users?limit=1").json()["items"] == [row]
    assert client.patch(path, json={"first_name": "Grace"}).json()["first_name"] == "Grace"
    assert client.patch(path, json={"first_name": None}).status_code == 422
    assert client.patch(path, json={}).status_code == 422
    assert client.post("/api/v1/users", json={"first_name": " ", "last_name": "X", "email": "bad"}).status_code == 422
    assert client.post("/api/v1/users", json={"first_name": "A", "last_name": "B", "email": row["email"]}).status_code == 409
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.delete(path).status_code == 404


def test_pod_crud_and_user_deletion_preserves_guest(client):
    owner = user(client)
    row = pod(client, [{"user_id": owner["user_id"]}, {"temporary_name": "Guest"}])
    path = f"/api/v1/pods/{row['pod_id']}"
    assert client.get(path).json() == row
    assert client.get("/api/v1/pods").json()["items"] == [row]
    assert client.delete(f"/api/v1/users/{owner['user_id']}").status_code == 204
    member = client.get(path).json()["members"][0]
    assert member["user_id"] is None
    assert member["temporary_name"] == "Ada Lovelace"
    response = client.put(path, json={"members": [{"temporary_name": "Replacement"}]})
    assert response.status_code == 200
    assert response.json()["members"][0]["temporary_name"] == "Replacement"
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404


def test_game_crud_and_pod_cascade(client):
    row = pod(client, [{"temporary_name": "Guest"}])
    member_id = row["members"][0]["pod_member_id"]
    response = client.post("/api/v1/games", json={"pod_id": row["pod_id"], "players": [{"pod_member_id": member_id, "main_card": "Sol Ring"}]})
    assert response.status_code == 201, response.text
    game = response.json()
    path = f"/api/v1/games/{game['game_id']}"
    assert client.get(path).json() == game
    assert client.get(f"/api/v1/games?pod_id={row['pod_id']}").json()["items"] == [game]
    assert client.patch(path, json={"date_played": "2026-10-12T12:00:00Z"}).status_code == 200
    assert client.patch(path, json={"date_played": "2026-10-12T12:00:00"}).status_code == 422
    assert client.patch(path, json={"date_played": None}).json()["date_played"] is None
    assert client.put(f"/api/v1/pods/{row['pod_id']}", json={"members": []}).status_code == 409
    assert len(client.get(f"/api/v1/pods/{row['pod_id']}").json()["members"]) == 1
    response = client.patch(path, json={"players": [{"pod_member_id": member_id, "main_card": "Island"}]})
    assert response.status_code == 200, response.text
    assert response.json()["players"][0]["main_card"] == "Island"
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.post("/api/v1/games", json={"pod_id": row["pod_id"], "players": [{"pod_member_id": member_id}]}).status_code == 201
    assert client.delete(f"/api/v1/pods/{row['pod_id']}").status_code == 204
    assert client.get("/api/v1/games").json()["items"] == []


def test_cross_pod_and_duplicate_players_roll_back(client):
    first = pod(client, [{"temporary_name": "First"}])
    second = pod(client, [{"temporary_name": "Second"}])
    member = first["members"][0]["pod_member_id"]
    foreign = second["members"][0]["pod_member_id"]
    for players, code in [([member, foreign], 422), ([member, member], 409)]:
        response = client.post("/api/v1/games", json={"pod_id": first["pod_id"], "players": [{"pod_member_id": value} for value in players]})
        assert response.status_code == code
        assert client.get("/api/v1/games").json()["items"] == []
    response = client.post("/api/v1/games", json={"pod_id": first["pod_id"], "players": [{"pod_member_id": member}]})
    path = f"/api/v1/games/{response.json()['game_id']}"
    assert client.patch(path, json={"date_played": "2026-10-12T12:00:00Z", "players": [{"pod_member_id": foreign}]}).status_code == 422
    unchanged = client.get(path).json()
    assert unchanged["date_played"] is None
    assert unchanged["players"][0]["pod_member_id"] == member


def test_invalid_references_and_pagination(client):
    assert client.post("/api/v1/pods", json={"members": [{}]}).status_code == 422
    assert client.post("/api/v1/pods", json={"members": [{"user_id": 999}]}).status_code == 409
    assert client.get("/api/v1/pods").json()["items"] == []
    assert client.post("/api/v1/games", json={"pod_id": 999}).status_code == 404
    for resource in ["users", "pods", "games"]:
        assert client.get(f"/api/v1/{resource}/0").status_code == 422
        assert client.get(f"/api/v1/{resource}/999").status_code == 404
        assert client.get(f"/api/v1/{resource}?limit=101").status_code == 422
        assert client.get(f"/api/v1/{resource}?offset=-1").status_code == 422


def test_orm_matches_migration_columns(client):
    from sqlalchemy import inspect
    from app.models import Base

    inspector = inspect(client.app.state.engine)
    for name, table in Base.metadata.tables.items():
        assert {column.name for column in table.columns} == {column["name"] for column in inspector.get_columns(name)}


def test_missing_database_keeps_health_independent(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with TestClient(create_app()) as client:
        assert client.get("/api/v1/health").status_code == 200
        assert client.get("/api/v1/users").status_code == 503


def test_member_crud_and_nested_boundaries(client):
    first = pod(client, [])
    second = pod(client, [])
    path = f"/api/v1/pods/{first['pod_id']}/members"
    response = client.post(path, json={"temporary_name": "Guest"})
    assert response.status_code == 201
    member_id = response.json()["pod_member_id"]
    member_path = f"{path}/{member_id}"
    assert client.put(member_path, json={"temporary_name": "Updated"}).json()["temporary_name"] == "Updated"
    wrong_path = f"/api/v1/pods/{second['pod_id']}/members/{member_id}"
    assert client.put(wrong_path, json={"temporary_name": "Wrong"}).status_code == 404
    assert client.delete(wrong_path).status_code == 404
    game = client.post("/api/v1/games", json={"pod_id": first["pod_id"], "players": [{"pod_member_id": member_id}]}).json()
    assert client.delete(member_path).status_code == 409
    assert client.delete(f"/api/v1/games/{game['game_id']}").status_code == 204
    assert client.delete(member_path).status_code == 204


def test_migration_runner_is_repeatable(monkeypatch):
    from app.db import build_engine
    from app.migrate import apply_migrations

    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run migration integration tests")
    schema = "test_" + uuid4().hex
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        engine_url = make_url(url).update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
        engine = build_engine(engine_url)
        try:
            assert apply_migrations(engine) == ["v001__create_initial_tables.sql"]
            assert apply_migrations(engine) == []
        finally:
            engine.dispose()
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
