import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import jwt
import psycopg
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy.engine import make_url

from app.main import create_app


@pytest.fixture(scope="session")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def configure_auth(monkeypatch, key):
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    monkeypatch.setenv("CLERK_JWT_KEY", public)
    monkeypatch.setenv("CLERK_ISSUER", "https://clerk.test")
    monkeypatch.setenv("CLERK_AUTHORIZED_PARTIES", "http://localhost:3000")
    monkeypatch.delenv("CLERK_AUDIENCE", raising=False)


def session_token(key, subject="test_default", **changes):
    now = datetime.now(UTC)
    claims = {"sub": subject, "sid": "sess_test", "iss": "https://clerk.test",
              "azp": "http://localhost:3000", "iat": now, "nbf": now, "exp": now + timedelta(minutes=10)}
    claims.update(changes)
    return jwt.encode(claims, key, algorithm="RS256")


@pytest.fixture
def client(monkeypatch, signing_key):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests")
    schema = "test_" + uuid4().hex
    # Each test uses the supplied migration in a separate disposable schema.
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        try:
            admin.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(schema)))
            for migration in sorted((Path(__file__).parents[1] / "migrations").glob("v*__*.sql")):
                admin.execute(migration.read_text())
            database_url = make_url(url).update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
            monkeypatch.setenv("DATABASE_URL", database_url)
            configure_auth(monkeypatch, signing_key)
            with TestClient(create_app()) as instance:
                instance.headers["Authorization"] = "Bearer " + session_token(signing_key, "test_default")
                instance.signing_key = signing_key
                yield instance
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))

