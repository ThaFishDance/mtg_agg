from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_session
from ..models import Game, GamePlayer
from ..schemas import (
    CreateGameRequest,
    CreateGameResponse,
    CompleteGameRequest,
    CompleteGameResponse,
)

router = APIRouter()


@router.post("", status_code=201, response_model=CreateGameResponse)
async def create_game(
    body: CreateGameRequest,
    session: AsyncSession = Depends(get_session),
):
    if len(body.players) < 2:
        raise HTTPException(status_code=400, detail="At least 2 players required")

    async with session.begin():
        game = Game(starting_life=body.startingLife, player_count=len(body.players))
        session.add(game)
        await session.flush()

        player_objects = []
        for player in body.players:
            gp = GamePlayer(
                game_id=game.id,
                player_name=player.name,
                commander_name=player.commanderName,
                commander_colors=player.colorIdentity,
            )
            session.add(gp)
            player_objects.append(gp)

        await session.flush()

    return {"gameId": game.id, "players": [{"id": p.id, "name": p.player_name} for p in player_objects]}


@router.get("")
async def list_games(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Game)
        .where(Game.completed_at.is_not(None))
        .order_by(Game.started_at.desc())
        .options(selectinload(Game.players))
    )
    games = result.scalars().all()
    return [
        {
            **_serialize_game(g),
            "players": [{"player_name": p.player_name} for p in g.players],
        }
        for g in games
    ]


@router.get("/stats/colors")
async def color_stats(session: AsyncSession = Depends(get_session)):
    sub = (
        select(
            func.unnest(GamePlayer.commander_colors).label("color"),
            (GamePlayer.player_name == Game.winner_name).label("is_winner"),
        )
        .join(Game, Game.id == GamePlayer.game_id)
        .where(
            Game.completed_at.is_not(None),
            Game.winner_name.is_not(None),
            GamePlayer.commander_colors.is_not(None),
            func.array_length(GamePlayer.commander_colors, 1) > 0,
        )
        .subquery()
    )

    result = await session.execute(
        select(
            sub.c.color,
            func.count().filter(sub.c.is_winner).label("wins"),
            func.count().label("appearances"),
        )
        .group_by(sub.c.color)
        .order_by(func.count().filter(sub.c.is_winner).desc(), func.count().desc())
    )
    rows = result.all()

    total_games = await session.scalar(
        select(func.count()).where(Game.completed_at.is_not(None)).select_from(Game)
    )

    colors = [
        {
            "color": row.color,
            "wins": row.wins,
            "appearances": row.appearances,
            "winRate": round(row.wins / row.appearances * 100, 1) if row.appearances else 0,
        }
        for row in rows
    ]
    return {"totalGames": total_games, "colors": colors}


@router.get("/{game_id}")
async def get_game(game_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Game).where(Game.id == game_id).options(selectinload(Game.players))
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    return {
        **_serialize_game(game),
        "players": [_serialize_player(p) for p in game.players],
    }


@router.post("/{game_id}/complete", response_model=CompleteGameResponse)
async def complete_game(
    game_id: int,
    body: CompleteGameRequest,
    session: AsyncSession = Depends(get_session),
):
    async with session.begin():
        game = await session.get(Game, game_id)
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        completed_at = datetime.now(timezone.utc)
        duration_seconds = int((completed_at - game.started_at).total_seconds())

        game.completed_at = completed_at
        game.duration_seconds = duration_seconds
        game.winner_name = body.winnerName

        for p in body.players:
            player = await session.get(GamePlayer, p.id)
            if player and player.game_id == game_id:
                player.final_life = p.finalLife
                player.final_poison = p.finalPoison
                player.eliminated = p.eliminated
                player.commander_damage_dealt = p.commanderDamageDealt

    return {"success": True, "durationSeconds": duration_seconds}


def _serialize_game(game: Game) -> dict:
    return {
        "id": game.id,
        "started_at": game.started_at.isoformat() if game.started_at else None,
        "completed_at": game.completed_at.isoformat() if game.completed_at else None,
        "duration_seconds": game.duration_seconds,
        "starting_life": game.starting_life,
        "winner_name": game.winner_name,
        "player_count": game.player_count,
    }


def _serialize_player(player: GamePlayer) -> dict:
    return {
        "id": player.id,
        "game_id": player.game_id,
        "player_name": player.player_name,
        "commander_name": player.commander_name,
        "commander_colors": player.commander_colors,
        "final_life": player.final_life,
        "final_poison": player.final_poison,
        "eliminated": player.eliminated,
        "commander_damage_dealt": player.commander_damage_dealt,
    }
