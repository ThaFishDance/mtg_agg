from datetime import datetime
from typing import Annotated, Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

Id = Annotated[int, Field(gt=0)]
Name = Annotated[str, Field(min_length=1, max_length=100)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)


class UserCreate(Input):
    first_name: Name
    last_name: Name
    email: Annotated[str, Field(min_length=3, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")]


class UserUpdate(Input):
    first_name: Name | None = None
    last_name: Name | None = None
    email: Annotated[str, Field(min_length=3, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")] | None = None

    @model_validator(mode="after")
    def nonnull_changes(self) -> Self:
        if not self.model_fields_set or any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("Supply at least one non-null field")
        return self


class User(UserCreate):
    user_id: int
    created_date: datetime
    logged_in_last: datetime | None
    verified: bool


class MemberInput(Input):
    user_id: Id | None = None
    temporary_name: Name | None = None

    @model_validator(mode="after")
    def identity(self) -> Self:
        if self.user_id is None and self.temporary_name is None:
            raise ValueError("Supply user_id or temporary_name")
        return self


class Member(MemberInput):
    pod_member_id: int
    pod_id: int
    created_date: datetime


class PodInput(Input):
    members: Annotated[list[MemberInput], Field(max_length=100)] = Field(default_factory=list)


class Pod(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pod_id: int
    created_date: datetime
    members: list[Member]


class PlayerInput(Input):
    pod_member_id: Id
    main_card: Annotated[str, Field(max_length=255)] | None = None
    secondary_card: Annotated[str, Field(max_length=255)] | None = None
    color_schema: Annotated[str, Field(max_length=50)] | None = None


class Player(PlayerInput):
    pod_game_player_id: int
    game_id: int
    date_created: datetime


class GameCreate(Input):
    pod_id: Id
    date_played: AwareDatetime | None = None
    players: Annotated[list[PlayerInput], Field(max_length=100)] = Field(default_factory=list)


class GameUpdate(Input):
    date_played: AwareDatetime | None = None
    players: Annotated[list[PlayerInput], Field(max_length=100)] | None = None

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Supply date_played or players")
        if "players" in self.model_fields_set and self.players is None:
            raise ValueError("players cannot be null")
        return self


class GameResultInput(Input):
    player_winner: Id | None


class GameResult(GameResultInput):
    game_result_id: int
    game_id: int


class Game(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    game_id: int
    pod_id: int
    date_created: datetime
    date_played: datetime | None
    players: list[Player]
    result: GameResult | None


class UserPage(BaseModel):
    items: list[User]
    limit: int
    offset: int


class PodPage(BaseModel):
    items: list[Pod]
    limit: int
    offset: int


class GamePage(BaseModel):
    items: list[Game]
    limit: int
    offset: int
