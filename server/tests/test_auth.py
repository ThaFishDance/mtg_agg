from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth import optional_subject
from app.models import Pod, User
from conftest import configure_auth, session_token


def headers(client, subject):
    return {"Authorization": "Bearer " + session_token(client.signing_key, subject)}


def account(client, subject):
    response = client.post("/api/v1/users", headers=headers(client, subject), json={
        "first_name": subject, "last_name": "Test", "email": subject + "@example.com",
    })
    assert response.status_code == 201, response.text
    return response.json()


def setup_pod(client):
    owner, member, admin, outsider = [account(client, name) for name in ["owner", "member", "admin", "outsider"]]
    client.headers.update(headers(client, "owner"))
    pod = client.post("/api/v1/pods", json={"members": [
        {"user_id": member["user_id"]}, {"user_id": admin["user_id"]}, {"temporary_name": "Guest"},
    ]}).json()
    assert pod["owner_user_id"] == owner["user_id"] and pod["is_public"] is False
    assert any(row["user_id"] == owner["user_id"] for row in pod["members"])
    assert client.put(f"/api/v1/pods/{pod['pod_id']}/admins/{admin['user_id']}", json={"is_admin": True}).status_code == 200
    response = client.post("/api/v1/games", json={"pod_id": pod["pod_id"], "players": [
        {"pod_member_id": row["pod_member_id"], "main_card": "Card", "color_schema": "WU"} for row in pod["members"]
    ]})
    assert response.status_code == 201
    game = response.json()
    assert client.post(f"/api/v1/games/{game['game_id']}/result", json={"player_winner": None}).status_code == 201
    unfinished = client.post("/api/v1/games", json={"pod_id": pod["pod_id"]}).json()
    return pod, game, unfinished, member, admin, outsider


@pytest.mark.parametrize("changes", [
    {"iss": "https://wrong.test"}, {"azp": "https://wrong.test"},
    {"exp": datetime.now(UTC) - timedelta(minutes=1)},
    {"nbf": datetime.now(UTC) + timedelta(minutes=5)},
    {"iat": datetime.now(UTC) + timedelta(minutes=5)},
    {"sub": ""}, {"sid": ""}, {"sts": "pending"},
])
def test_token_claims_rejected(monkeypatch, signing_key, changes):
    configure_auth(monkeypatch, signing_key)
    with pytest.raises(HTTPException) as caught:
        optional_subject(HTTPAuthorizationCredentials(scheme="Bearer", credentials=session_token(signing_key, **changes)))
    assert caught.value.status_code == 401


def test_signature_algorithm_missing_claims_and_configuration(monkeypatch, signing_key):
    configure_auth(monkeypatch, signing_key)
    def verify(token):
        return optional_subject(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    assert verify(session_token(signing_key)) == "test_default"
    assert optional_subject(None) is None
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    tokens = [session_token(other_key), "garbage", jwt.encode({"sub": "forged"}, "x" * 32, algorithm="HS256")]
    claims = jwt.decode(session_token(signing_key), options={"verify_signature": False})
    for field in ["exp", "nbf", "iat", "iss", "azp", "sid", "sub"]:
        tokens.append(jwt.encode({key: value for key, value in claims.items() if key != field}, signing_key, algorithm="RS256"))
    for token in tokens:
        with pytest.raises(HTTPException) as caught:
            verify(token)
        assert caught.value.status_code == 401
    monkeypatch.setenv("CLERK_AUDIENCE", "mtg-api")
    with pytest.raises(HTTPException) as caught:
        verify(session_token(signing_key, aud="other"))
    assert caught.value.status_code == 401
    assert verify(session_token(signing_key, aud="mtg-api")) == "test_default"
    monkeypatch.delenv("CLERK_JWT_KEY")
    with pytest.raises(HTTPException) as caught:
        verify(session_token(signing_key))
    assert caught.value.status_code == 503
    monkeypatch.setenv("CLERK_JWT_KEY", "not a public key")
    with pytest.raises(HTTPException) as caught:
        verify(session_token(signing_key, aud="mtg-api"))
    assert caught.value.status_code == 503


@pytest.mark.parametrize("subject,allowed", [("owner", True), ("admin", True), ("member", True), ("outsider", False), (None, False)])
def test_private_public_read_matrix(client, subject, allowed):
    pod, game, unfinished, *_ = setup_pod(client)
    client.headers.pop("Authorization", None)
    auth = headers(client, subject) if subject else {}
    paths = [f"/api/v1/games/{game['game_id']}", f"/api/v1/games/{game['game_id']}/result"]
    paths += [f"/api/v1/pods/{pod['pod_id']}/stats/{kind}" for kind in ["players", "commanders", "colors"]]
    for path in paths:
        assert client.get(path, headers=auth).status_code == (200 if allowed else 404)
    assert len(client.get("/api/v1/games", headers=auth).json()["items"]) == (2 if allowed else 0)
    visibility = f"/api/v1/pods/{pod['pod_id']}/visibility"
    assert client.patch(visibility, headers=headers(client, "owner"), json={"is_public": True}).status_code == 200
    for path in paths:
        response = client.get(path, headers=auth)
        assert response.status_code == 200
        assert "@example.com" not in response.text
    assert client.get(f"/api/v1/games/{unfinished['game_id']}", headers=auth).status_code == (200 if allowed else 404)
    assert [row["game_id"] for row in client.get("/api/v1/games?limit=1", headers=auth).json()["items"]] == [game["game_id"]]
    if not allowed:
        assert client.get("/api/v1/games?completed=false", headers=auth).json()["items"] == []
        assert client.get("/api/v1/games?offset=1", headers=auth).json()["items"] == []
        assert client.get(f"/api/v1/pods/{pod['pod_id']}", headers=auth).status_code in [401, 404]
    assert client.patch(visibility, headers=headers(client, "owner"), json={"is_public": False}).status_code == 200
    assert client.get(paths[0], headers=auth).status_code == (200 if allowed else 404)


@pytest.mark.parametrize("subject,status", [("owner", 200), ("admin", 200), ("member", 403), ("outsider", 404), (None, 401)])
def test_write_roles_and_owner_only_controls(client, subject, status):
    pod, game, unfinished, member, *_ = setup_pod(client)
    client.headers.pop("Authorization", None)
    auth = headers(client, subject) if subject else {}
    assert client.patch(f"/api/v1/games/{unfinished['game_id']}", headers=auth, json={"date_played": None}).status_code == status
    assert client.post("/api/v1/games", headers=auth, json={"pod_id": pod["pod_id"]}).status_code == (201 if status == 200 else status)
    assert client.post(f"/api/v1/games/{game['game_id']}/result", headers=auth, json={"player_winner": None}).status_code == status
    assert client.post(f"/api/v1/pods/{pod['pod_id']}/members", headers=auth, json={"temporary_name": "Added"}).status_code == (201 if status == 200 else status)
    owner_status = 200 if subject == "owner" else (403 if subject in ["admin", "member"] else status)
    assert client.patch(f"/api/v1/pods/{pod['pod_id']}/visibility", headers=auth, json={"is_public": True}).status_code == owner_status
    assert client.put(f"/api/v1/pods/{pod['pod_id']}/admins/{member['user_id']}", headers=auth, json={"is_admin": True}).status_code == owner_status
    assert client.delete(f"/api/v1/pods/{pod['pod_id']}", headers=auth).status_code == (204 if subject == "owner" else owner_status)


def test_profile_isolation_and_no_email_linking(client):
    owner = account(client, "owner")
    account(client, "other")
    client.headers.update(headers(client, "other"))
    path = f"/api/v1/users/{owner['user_id']}"
    assert client.get(path).status_code == 404
    assert client.patch(path, json={"first_name": "Taken"}).status_code == 404
    assert client.delete(path).status_code == 404
    assert all(row["user_id"] != owner["user_id"] for row in client.get("/api/v1/users").json()["items"])
    body = {"first_name": "Fake", "last_name": "User", "email": owner["email"]}
    assert client.post("/api/v1/users", headers=headers(client, "unlinked"), json=body).status_code == 409
    assert client.get("/api/v1/users", headers=headers(client, "unlinked")).status_code == 403
    assert client.post("/api/v1/users", headers=headers(client, "unlinked"), json={**body, "clerk_user_id": "owner"}).status_code == 422
    assert client.get(path, headers={"Authorization": "Bearer forged"}).status_code == 401


def test_owner_membership_admin_revocation_and_account_deletion(client):
    pod, game, unfinished, member, admin, *_ = setup_pod(client)
    owner = next(row for row in pod["members"] if row["user_id"] == pod["owner_user_id"])
    owner_path = f"/api/v1/pods/{pod['pod_id']}/members/{owner['pod_member_id']}"
    assert client.delete(owner_path).status_code == 409
    assert client.put(owner_path, json={"temporary_name": "Lost owner"}).status_code == 409
    assert client.delete(f"/api/v1/users/{pod['owner_user_id']}").status_code == 409
    admin_path = f"/api/v1/pods/{pod['pod_id']}/admins/{member['user_id']}"
    assert client.put(admin_path, json={"is_admin": True}).status_code == 200
    assert client.put(admin_path, json={"is_admin": False}).status_code == 200
    assert client.post("/api/v1/games", headers=headers(client, "member"), json={"pod_id": pod["pod_id"]}).status_code == 403
    empty = client.post("/api/v1/pods", json={"members": [{"user_id": admin["user_id"]}]}).json()
    path = f"/api/v1/pods/{empty['pod_id']}"
    assert client.put(path + f"/admins/{admin['user_id']}", json={"is_admin": True}).status_code == 200
    admin_member = next(row for row in empty["members"] if row["user_id"] == admin["user_id"])
    assert client.delete(path + f"/members/{admin_member['pod_member_id']}").status_code == 204
    assert client.post(path + "/members", json={"user_id": admin["user_id"]}).status_code == 201
    assert client.post("/api/v1/games", headers=headers(client, "admin"), json={"pod_id": empty["pod_id"]}).status_code == 403


def test_existing_unclaimed_records_stay_private(client):
    with Session(client.app.state.engine) as db, db.begin():
        db.add(User(first_name="Legacy", last_name="User", email="legacy@example.com"))
        legacy_pod = Pod()
        db.add(legacy_pod)
        db.flush()
        pod_id = legacy_pod.pod_id
    account(client, "outsider")
    client.headers.pop("Authorization", None)
    for auth in [{}, headers(client, "outsider")]:
        assert client.get(f"/api/v1/pods/{pod_id}/stats/colors", headers=auth).status_code == 404
    assert client.post("/api/v1/users", headers=headers(client, "legacy"), json={
        "first_name": "Legacy", "last_name": "User", "email": "legacy@example.com",
    }).status_code == 409


def test_auth_missing_config_does_not_expose_private_data(client, monkeypatch):
    pod, game, *_ = setup_pod(client)
    monkeypatch.delenv("CLERK_JWT_KEY")
    assert client.get(f"/api/v1/games/{game['game_id']}").status_code == 503
    client.headers.pop("Authorization", None)
    assert client.get(f"/api/v1/games/{game['game_id']}").status_code == 404
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_pagination_filters_private_pods_before_limit(client):
    account(client, "owner")
    account(client, "other")
    client.headers.update(headers(client, "owner"))
    private = client.post("/api/v1/pods", json={}).json()
    client.post("/api/v1/games", json={"pod_id": private["pod_id"]})
    client.headers.update(headers(client, "other"))
    other = client.post("/api/v1/pods", json={}).json()
    game = client.post("/api/v1/games", json={"pod_id": other["pod_id"]}).json()
    assert client.get("/api/v1/pods?limit=1").json()["items"] == [other]
    assert client.get("/api/v1/games?limit=1").json()["items"] == [game]
    assert client.get(f"/api/v1/games?pod_id={private['pod_id']}").json()["items"] == []
    assert client.delete(f"/api/v1/games/{game['game_id']}", headers=headers(client, "owner")).status_code == 404
    assert client.delete(f"/api/v1/games/{game['game_id']}").status_code == 204


def test_member_cannot_modify_members_or_delete_games(client):
    pod, game, unfinished, member, admin, *_ = setup_pod(client)
    client.headers.update(headers(client, "member"))
    path = f"/api/v1/pods/{pod['pod_id']}"
    guest = next(row for row in pod["members"] if row["user_id"] is None)
    assert client.put(path, json={"members": []}).status_code == 403
    assert client.put(path + f"/members/{guest['pod_member_id']}", json={"temporary_name": "Changed"}).status_code == 403
    assert client.delete(path + f"/members/{guest['pod_member_id']}").status_code == 403
    assert client.delete(f"/api/v1/games/{unfinished['game_id']}").status_code == 403
    assert client.delete(f"/api/v1/games/{unfinished['game_id']}", headers=headers(client, "admin")).status_code == 204
