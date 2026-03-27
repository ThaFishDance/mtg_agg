from pydantic import BaseModel, Field, field_validator


# POST /api/games

class PlayerInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    commanderName: str | None = Field(default=None, max_length=120)
    colorIdentity: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("name", "commanderName")
    @classmethod
    def strip_names(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped

    @field_validator("colorIdentity")
    @classmethod
    def validate_colors(cls, colors: list[str]) -> list[str]:
        allowed = {"W", "U", "B", "R", "G"}
        normalized = []
        for color in colors:
            upper = color.upper()
            if upper not in allowed:
                raise ValueError("invalid color identity")
            if upper not in normalized:
                normalized.append(upper)
        return normalized


class CreateGameRequest(BaseModel):
    players: list[PlayerInput] = Field(..., min_length=2, max_length=8)
    startingLife: int = Field(default=40, ge=1, le=999)


class PlayerResult(BaseModel):
    id: int
    name: str


class CreateGameResponse(BaseModel):
    gameId: int
    players: list[PlayerResult]


# POST /api/games/{id}/complete

class PlayerComplete(BaseModel):
    id: int
    finalLife: int | None = Field(default=None, ge=-999, le=999)
    finalPoison: int = Field(default=0, ge=0, le=99)
    eliminated: bool = False
    commanderDamageDealt: int = Field(default=0, ge=0, le=999)


class CompleteGameRequest(BaseModel):
    winnerName: str | None = Field(default=None, max_length=80)
    players: list[PlayerComplete] = Field(..., min_length=2, max_length=8)

    @field_validator("winnerName")
    @classmethod
    def strip_winner_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class CompleteGameResponse(BaseModel):
    success: bool
    durationSeconds: int


# GET /api/cards/lookup

class CardLookupResponse(BaseModel):
    id: str
    name: str
    typeLine: str
    imageUrl: str
    colorIdentity: list[str] = Field(default_factory=list)
