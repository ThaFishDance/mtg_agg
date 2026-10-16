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


def test_openapi_documents_results_contract() -> None:
    schema = create_app().openapi()
    route = schema["paths"]["/api/v1/games/{game_id}/result"]
    assert set(route) == {"get", "post"}
    assert {"200", "201"} <= route["post"]["responses"].keys()
    body = schema["components"]["schemas"]["GameResultInput"]
    assert body["required"] == ["player_winner"]
    assert {part["type"] for part in body["properties"]["player_winner"]["anyOf"]} == {"integer", "null"}


def test_openapi_documents_game_history() -> None:
    schema = create_app().openapi()
    parameters = schema["paths"]["/api/v1/games"]["get"]["parameters"]
    completed = next(parameter for parameter in parameters if parameter["name"] == "completed")
    assert completed["in"] == "query"
    assert completed["required"] is False
    assert {part["type"] for part in completed["schema"]["anyOf"]} == {"boolean", "null"}
    game = schema["components"]["schemas"]["Game"]
    assert "result" in game["required"]
    assert game["properties"]["result"]["anyOf"] == [
        {"$ref": "#/components/schemas/GameResult"}, {"type": "null"},
    ]


def test_openapi_documents_player_statistics() -> None:
    schema = create_app().openapi()
    operation = schema["paths"]["/api/v1/pods/{pod_id}/stats/players"]["get"]
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/PlayerStatsPage",
    }
    stats = schema["components"]["schemas"]["PlayerStats"]
    assert set(stats["required"]) == {"pod_member_id", "games_played", "wins", "draws", "win_rate"}
    assert stats["properties"]["win_rate"]["maximum"] == 100


def test_openapi_documents_commander_statistics() -> None:
    schema = create_app().openapi()
    operation = schema["paths"]["/api/v1/pods/{pod_id}/stats/commanders"]["get"]
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/CommanderStatsPage",
    }
    stats = schema["components"]["schemas"]["CommanderStats"]
    assert set(stats["required"]) == {"main_card", "secondary_card", "appearances", "wins", "draws", "win_rate"}
    assert stats["properties"]["win_rate"]["maximum"] == 100


def test_openapi_documents_color_statistics() -> None:
    schema = create_app().openapi()
    operation = schema["paths"]["/api/v1/pods/{pod_id}/stats/colors"]["get"]
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ColorStats",
    }
    assert schema["components"]["schemas"]["ColorStats"]["required"] == ["colors", "combinations"]
    assert set(schema["components"]["schemas"]["ColorStatsItem"]["required"]) == {
        "color_schema", "appearances", "wins", "draws", "win_rate",
    }
