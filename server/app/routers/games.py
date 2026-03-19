from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import (
    CreateGameRequest,
    CreateGameResponse,
    CompleteGameRequest,
    CompleteGameResponse,
)

router = APIRouter()


@router.post("/", status_code=201, response_model=CreateGameResponse)
async def create_game(
    body: CreateGameRequest,
    session: AsyncSession = Depends(get_session),
):
    if len(body.players) < 2:
        raise HTTPException(status_code=400, detail="At least 2 players required")

    async with session.begin():
        result = await session.execute(
            text(
                "INSERT INTO games (starting_life, player_count) "
                "VALUES (:life, :count) RETURNING id"
            ),
            {"life": body.startingLife, "count": len(body.players)},
        )
        game_id = result.scalar_one()

        inserted_players = []
        for player in body.players:
            pr = await session.execute(
                text(
                    "INSERT INTO game_players "
                    "(game_id, player_name, commander_name, commander_colors) "
                    "VALUES (:gid, :name, :cmd, :colors) RETURNING id"
                ),
                {
                    "gid": game_id,
                    "name": player.name,
                    "cmd": player.commanderName,
                    "colors": player.colorIdentity,
                },
            )
            inserted_players.append({"id": pr.scalar_one(), "name": player.name})

    return {"gameId": game_id, "players": inserted_players}


@router.get("/")
async def list_games(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        text(
            """
            SELECT g.*,
                   json_agg(json_build_object('player_name', gp.player_name) ORDER BY gp.id) AS players
            FROM games g
            LEFT JOIN game_players gp ON gp.game_id = g.id
            WHERE g.completed_at IS NOT NULL
            GROUP BY g.id
            ORDER BY g.started_at DESC
            """
        )
    )
    rows = result.mappings().all()
    return [_serialize(dict(row)) for row in rows]


@router.get("/{game_id}")
async def get_game(game_id: int, session: AsyncSession = Depends(get_session)):
    game_result = await session.execute(
        text("SELECT * FROM games WHERE id = :id"),
        {"id": game_id},
    )
    game_row = game_result.mappings().first()
    if game_row is None:
        raise HTTPException(status_code=404, detail="Game not found")

    players_result = await session.execute(
        text("SELECT * FROM game_players WHERE game_id = :id ORDER BY id"),
        {"id": game_id},
    )
    players = [_serialize(dict(r)) for r in players_result.mappings().all()]

    return {**_serialize(dict(game_row)), "players": players}


@router.post("/{game_id}/complete", response_model=CompleteGameResponse)
async def complete_game(
    game_id: int,
    body: CompleteGameRequest,
    session: AsyncSession = Depends(get_session),
):
    async with session.begin():
        result = await session.execute(
            text("SELECT started_at FROM games WHERE id = :id"),
            {"id": game_id},
        )
        row = result.mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Game not found")

        started_at: datetime = row["started_at"]
        completed_at = datetime.now(timezone.utc)
        duration_seconds = int((completed_at - started_at).total_seconds())

        await session.execute(
            text(
                "UPDATE games SET completed_at = :completed, duration_seconds = :dur, "
                "winner_name = :winner WHERE id = :id"
            ),
            {
                "completed": completed_at,
                "dur": duration_seconds,
                "winner": body.winnerName,
                "id": game_id,
            },
        )

        for player in body.players:
            await session.execute(
                text(
                    "UPDATE game_players "
                    "SET final_life = :life, final_poison = :poison, "
                    "    eliminated = :elim, commander_damage_dealt = :cmd_dmg "
                    "WHERE id = :pid AND game_id = :gid"
                ),
                {
                    "life": player.finalLife,
                    "poison": player.finalPoison,
                    "elim": player.eliminated,
                    "cmd_dmg": player.commanderDamageDealt,
                    "pid": player.id,
                    "gid": game_id,
                },
            )

    return {"success": True, "durationSeconds": duration_seconds}


def _serialize(row: dict) -> dict:
    """Convert non-JSON-serializable values (datetime) to strings."""
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out
