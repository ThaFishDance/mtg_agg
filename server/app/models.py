from datetime import datetime

from sqlalchemy import (
    BigInteger, Integer, Boolean, CheckConstraint, DateTime, ForeignKey,
    ForeignKeyConstraint, Identity, String, UniqueConstraint, func, text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "app_user"
    user_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    logged_in_last: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    clerk_user_id: Mapped[str | None] = mapped_column(String(255), unique=True)


class Pod(Base):
    __tablename__ = "pod"
    __table_args__ = (CheckConstraint("NOT is_public OR owner_user_id IS NOT NULL", name="chk_public_pod_owner"),)
    pod_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    owner_user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("app_user.user_id"))
    is_public: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    members: Mapped[list["PodMember"]] = relationship(order_by="PodMember.pod_member_id", passive_deletes="all")


class PodMember(Base):
    __tablename__ = "pod_member"
    __table_args__ = (
        CheckConstraint("user_id IS NOT NULL OR (temporary_name IS NOT NULL AND LENGTH(TRIM(temporary_name)) > 0)", name="chk_pod_member_identity"),
        UniqueConstraint("pod_id", "user_id", name="uq_pod_member_user"),
    )
    pod_member_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    pod_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("pod.pod_id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("app_user.user_id", ondelete="SET NULL"))
    temporary_name: Mapped[str | None] = mapped_column(String(100))
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class PodAdmin(Base):
    __tablename__ = "pod_user_admin"
    pod_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("pod.pod_id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("app_user.user_id", ondelete="CASCADE"), primary_key=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))


class Game(Base):
    __tablename__ = "game"
    game_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    date_played: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())
    pod_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("pod.pod_id", ondelete="CASCADE"))
    players: Mapped[list["GamePlayer"]] = relationship(order_by="GamePlayer.pod_game_player_id", passive_deletes="all")
    result: Mapped["GameResult | None"] = relationship(passive_deletes="all")


class GamePlayer(Base):
    __tablename__ = "pod_game_player"
    __table_args__ = (
        UniqueConstraint("game_id", "pod_member_id", name="uq_game_player"),
        UniqueConstraint("pod_game_player_id", "game_id", name="uq_game_player_game"),
    )
    pod_game_player_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    pod_member_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("pod_member.pod_member_id"))
    game_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("game.game_id", ondelete="CASCADE"))
    main_card: Mapped[str | None] = mapped_column(String(255))
    secondary_card: Mapped[str | None] = mapped_column(String(255))
    color_schema: Mapped[str | None] = mapped_column(String(50))
    date_created: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.current_timestamp())


class GameResult(Base):
    __tablename__ = "game_result"
    __table_args__ = (
        ForeignKeyConstraint(["player_winner", "game_id"], ["pod_game_player.pod_game_player_id", "pod_game_player.game_id"], name="fk_game_result_winner"),
    )
    game_result_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True)
    game_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("game.game_id", ondelete="CASCADE"), unique=True)
    player_winner: Mapped[int | None] = mapped_column(BigInteger().with_variant(Integer, "sqlite"))
