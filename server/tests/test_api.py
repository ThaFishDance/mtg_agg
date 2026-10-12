from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_current_utc_timestamp() -> None:
    before = datetime.now(UTC)
    with TestClient(create_app()) as client:
        response = client.get("/api/health")
    after = datetime.now(UTC)

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"status", "timestamp"}
    assert payload["status"] == "ok"
    timestamp = datetime.fromisoformat(payload["timestamp"])
    assert timestamp.utcoffset() == UTC.utcoffset(timestamp)
    assert before <= timestamp <= after


def test_openapi_documents_health_response() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")
        assert client.get("/docs").status_code == 200

    assert response.status_code == 200
    schema = response.json()
    operation = schema["paths"]["/api/health"]["get"]
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/HealthResponse"
    }
    health = schema["components"]["schemas"]["HealthResponse"]
    assert set(health["required"]) == {"status", "timestamp"}
    assert health["properties"]["status"]["const"] == "ok"
    assert health["properties"]["timestamp"]["format"] == "date-time"
