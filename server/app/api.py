from typing import Annotated, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/api/v1")
DB = Annotated[Session, Depends(get_db, scope="function")]
ResourceId = Annotated[int, Path(gt=0)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]
Record = TypeVar("Record", bound=models.Base)


def find(db: Session, model: type[Record], value: int) -> Record:
    row = db.get(model, value)
    if row is None:
        raise HTTPException(404, "Record not found")
    return row


def add_members(db: Session, pod_id: int, members: list[schemas.MemberInput]) -> None:
    db.add_all(models.PodMember(pod_id=pod_id, **member.model_dump()) for member in members)
    db.flush()


def add_players(db: Session, game: models.Game, players: list[schemas.PlayerInput]) -> None:
    for player in players:
        member = db.scalar(select(models.PodMember).where(models.PodMember.pod_member_id == player.pod_member_id).with_for_update(read=True))
        if member is None or member.pod_id != game.pod_id:
            raise HTTPException(422, "Every player must be a member of the game's pod")
        db.add(models.GamePlayer(game_id=game.game_id, **player.model_dump()))
    db.flush()


@router.post("/users", response_model=schemas.User, status_code=201, tags=["users"])
def create_user(body: schemas.UserCreate, db: DB) -> models.User:
    row = models.User(**body.model_dump())
    db.add(row)
    db.flush()
    return row


@router.get("/users", response_model=schemas.UserPage, tags=["users"])
def list_users(db: DB, limit: Limit = 50, offset: Offset = 0) -> dict:
    rows = db.scalars(select(models.User).order_by(models.User.user_id).limit(limit).offset(offset)).all()
    return {"items": rows, "limit": limit, "offset": offset}


@router.get("/users/{user_id}", response_model=schemas.User, tags=["users"])
def get_user(user_id: ResourceId, db: DB) -> models.User:
    return find(db, models.User, user_id)


@router.patch("/users/{user_id}", response_model=schemas.User, tags=["users"])
def patch_user(user_id: ResourceId, body: schemas.UserUpdate, db: DB) -> models.User:
    row = find(db, models.User, user_id)
    for name, value in body.model_dump(exclude_unset=True).items():
        setattr(row, name, value)
    db.flush()
    return row


@router.delete("/users/{user_id}", status_code=204, tags=["users"])
def delete_user(user_id: ResourceId, db: DB) -> Response:
    row = find(db, models.User, user_id)
    # Retain identity before the supplied migration sets the user reference to NULL.
    members = db.scalars(select(models.PodMember).where(models.PodMember.user_id == user_id).with_for_update()).all()
    for member in members:
        if member.temporary_name is None:
            member.temporary_name = f"{row.first_name} {row.last_name}"[:100]
    db.flush()
    db.delete(row)
    db.flush()
    return Response(status_code=204)


@router.post("/pods", response_model=schemas.Pod, status_code=201, tags=["pods"])
def create_pod(body: schemas.PodInput, db: DB) -> models.Pod:
    row = models.Pod()
    db.add(row)
    db.flush()
    add_members(db, row.pod_id, body.members)
    return row


@router.get("/pods", response_model=schemas.PodPage, tags=["pods"])
def list_pods(db: DB, limit: Limit = 50, offset: Offset = 0) -> dict:
    rows = db.scalars(select(models.Pod).options(selectinload(models.Pod.members)).order_by(models.Pod.pod_id).limit(limit).offset(offset)).all()
    return {"items": rows, "limit": limit, "offset": offset}


@router.get("/pods/{pod_id}", response_model=schemas.Pod, tags=["pods"])
def get_pod(pod_id: ResourceId, db: DB) -> models.Pod:
    return find(db, models.Pod, pod_id)


@router.put("/pods/{pod_id}", response_model=schemas.Pod, tags=["pods"])
def replace_pod(pod_id: ResourceId, body: schemas.PodInput, db: DB) -> models.Pod:
    row = db.scalar(select(models.Pod).where(models.Pod.pod_id == pod_id).with_for_update())
    if row is None:
        raise HTTPException(404, "Record not found")
    for member in row.members:
        db.delete(member)
    db.flush()
    add_members(db, pod_id, body.members)
    db.expire(row, ["members"])
    return row


@router.delete("/pods/{pod_id}", status_code=204, tags=["pods"])
def delete_pod(pod_id: ResourceId, db: DB) -> Response:
    row = find(db, models.Pod, pod_id)
    # Remove games first so their player references do not block pod-member deletion.
    for game in db.scalars(select(models.Game).where(models.Game.pod_id == pod_id)):
        db.delete(game)
    db.flush()
    db.delete(row)
    db.flush()
    return Response(status_code=204)


@router.post("/pods/{pod_id}/members", response_model=schemas.Member, status_code=201, tags=["pods"])
def create_member(pod_id: ResourceId, body: schemas.MemberInput, db: DB) -> models.PodMember:
    find(db, models.Pod, pod_id)
    row = models.PodMember(pod_id=pod_id, **body.model_dump())
    db.add(row)
    db.flush()
    return row


def find_member(db: Session, pod_id: int, member_id: int) -> models.PodMember:
    row = find(db, models.PodMember, member_id)
    if row.pod_id != pod_id:
        raise HTTPException(404, "Record not found")
    return row


@router.put("/pods/{pod_id}/members/{member_id}", response_model=schemas.Member, tags=["pods"])
def replace_member(pod_id: ResourceId, member_id: ResourceId, body: schemas.MemberInput, db: DB) -> models.PodMember:
    row = find_member(db, pod_id, member_id)
    for name, value in body.model_dump().items():
        setattr(row, name, value)
    db.flush()
    return row


@router.delete("/pods/{pod_id}/members/{member_id}", status_code=204, tags=["pods"])
def delete_member(pod_id: ResourceId, member_id: ResourceId, db: DB) -> Response:
    db.delete(find_member(db, pod_id, member_id))
    db.flush()
    return Response(status_code=204)


@router.post("/games", response_model=schemas.Game, status_code=201, tags=["games"])
def create_game(body: schemas.GameCreate, db: DB) -> models.Game:
    find(db, models.Pod, body.pod_id)
    row = models.Game(**body.model_dump(exclude={"players"}))
    db.add(row)
    db.flush()
    add_players(db, row, body.players)
    return row


@router.get("/games", response_model=schemas.GamePage, tags=["games"])
def list_games(db: DB, limit: Limit = 50, offset: Offset = 0, pod_id: Annotated[int | None, Query(gt=0)] = None) -> dict:
    query = select(models.Game).options(selectinload(models.Game.players)).order_by(models.Game.game_id).limit(limit).offset(offset)
    if pod_id is not None:
        query = query.where(models.Game.pod_id == pod_id)
    return {"items": db.scalars(query).all(), "limit": limit, "offset": offset}


@router.get("/games/{game_id}", response_model=schemas.Game, tags=["games"])
def get_game(game_id: ResourceId, db: DB) -> models.Game:
    return find(db, models.Game, game_id)


@router.patch("/games/{game_id}", response_model=schemas.Game, tags=["games"])
def patch_game(game_id: ResourceId, body: schemas.GameUpdate, db: DB) -> models.Game:
    row = db.scalar(select(models.Game).where(models.Game.game_id == game_id).with_for_update())
    if row is None:
        raise HTTPException(404, "Record not found")
    if "date_played" in body.model_fields_set:
        row.date_played = body.date_played
    if "players" in body.model_fields_set:
        for player in row.players:
            db.delete(player)
        db.flush()
        add_players(db, row, body.players)
        db.expire(row, ["players"])
    db.flush()
    return row


@router.delete("/games/{game_id}", status_code=204, tags=["games"])
def delete_game(game_id: ResourceId, db: DB) -> Response:
    db.delete(find(db, models.Game, game_id))
    db.flush()
    return Response(status_code=204)
