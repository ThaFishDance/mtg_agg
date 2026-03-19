from pydantic import BaseModel


# POST /api/games

class PlayerInput(BaseModel):
    name: str
    commanderName: str | None = None
    colorIdentity: list[str] = []


class CreateGameRequest(BaseModel):
    players: list[PlayerInput]
    startingLife: int = 40


class PlayerResult(BaseModel):
    id: int
    name: str


class CreateGameResponse(BaseModel):
    gameId: int
    players: list[PlayerResult]


# POST /api/games/{id}/complete

class PlayerComplete(BaseModel):
    id: int
    finalLife: int | None = None
    finalPoison: int = 0
    eliminated: bool = False
    commanderDamageDealt: int = 0


class CompleteGameRequest(BaseModel):
    winnerName: str | None = None
    players: list[PlayerComplete]


class CompleteGameResponse(BaseModel):
    success: bool
    durationSeconds: int


# GET /api/cards/lookup

class CardLookupResponse(BaseModel):
    id: str
    name: str
    typeLine: str
    imageUrl: str
