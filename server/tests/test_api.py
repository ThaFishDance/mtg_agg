"""
Tests for API routing and endpoint behavior.

Run with: pytest tests/ -v
(from the server/ directory with venv active)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Cards
# ---------------------------------------------------------------------------

async def test_cards_autocomplete_returns_empty_list_when_query_missing(client, test_app):
    test_app.state.scryfall = MagicMock(autocomplete=AsyncMock(return_value=["Atraxa"]))

    response = await client.get("/api/cards/autocomplete")

    assert response.status_code == 200
    assert response.json() == []
    test_app.state.scryfall.autocomplete.assert_not_awaited()


async def test_cards_autocomplete_returns_empty_list_when_query_blank(client, test_app):
    test_app.state.scryfall = MagicMock(autocomplete=AsyncMock(return_value=["Atraxa"]))

    response = await client.get("/api/cards/autocomplete", params={"query": "   "})

    assert response.status_code == 200
    assert response.json() == []
    test_app.state.scryfall.autocomplete.assert_not_awaited()


async def test_cards_autocomplete_delegates_to_scryfall(client, test_app):
    test_app.state.scryfall = MagicMock(autocomplete=AsyncMock(return_value=["The Wise Mothman"]))

    response = await client.get("/api/cards/autocomplete", params={"query": "  the wise moth  "})

    assert response.status_code == 200
    assert response.json() == ["The Wise Mothman"]
    test_app.state.scryfall.autocomplete.assert_awaited_once_with("the wise moth")


# ---------------------------------------------------------------------------
# Routing: trailing-slash behavior
# ---------------------------------------------------------------------------

async def test_list_games_no_trailing_slash(client, mock_session):
    """GET /api/games (no slash) should return 200, not 404."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result)

    response = await client.get("/api/games")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"


async def test_list_games_trailing_slash(client, mock_session):
    """GET /api/games/ (trailing slash) returns 404 when redirect_slashes=False."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result)

    response = await client.get("/api/games/")
    assert response.status_code == 404, "Expected 404 for trailing slash with redirect_slashes=False"


async def test_color_stats_no_trailing_slash(client, mock_session):
    """GET /api/games/stats/colors should not 404."""
    rows_result = MagicMock()
    rows_result.all.return_value = []
    mock_session.execute = AsyncMock(return_value=rows_result)
    mock_session.scalar = AsyncMock(return_value=0)

    response = await client.get("/api/games/stats/colors")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/games — create game
# ---------------------------------------------------------------------------

async def test_create_game_no_trailing_slash(client, mock_session):
    """POST /api/games (no slash) should return 201."""
    from unittest.mock import patch

    game_mock = MagicMock(id=1, starting_life=40, player_count=2)
    player_mocks = [MagicMock(id=10, player_name="Alice"), MagicMock(id=11, player_name="Bob")]

    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()

    payload = {
        "players": [
            {"name": "Alice", "commanderName": "Atraxa", "colorIdentity": ["W", "U", "B", "G"]},
            {"name": "Bob", "commanderName": "Sliver Overlord", "colorIdentity": ["W", "U", "B", "R", "G"]},
        ],
        "startingLife": 40,
    }

    with patch("app.routers.games.Game", return_value=game_mock), \
         patch("app.routers.games.GamePlayer", side_effect=player_mocks):
        response = await client.post("/api/games", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["gameId"] == 1
    assert len(data["players"]) == 2


async def test_create_game_rejects_single_player(client, mock_session):
    """POST /api/games with only 1 player should return 400."""
    payload = {
        "players": [{"name": "Alice", "commanderName": "Atraxa", "colorIdentity": ["W"]}],
        "startingLife": 40,
    }
    response = await client.post("/api/games", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/games/{id}
# ---------------------------------------------------------------------------

async def test_get_game_not_found(client, mock_session):
    """GET /api/games/9999 for a missing game should return 404."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=result)

    response = await client.get("/api/games/9999")
    assert response.status_code == 404
