from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMPTZ, ARRAY
from sqlalchemy.sql import func

from .database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True)
    started_at = Column(TIMESTAMPTZ, server_default=func.now(), nullable=False)
    completed_at = Column(TIMESTAMPTZ)
    duration_seconds = Column(Integer)
    starting_life = Column(Integer, nullable=False, default=40)
    winner_name = Column(Text)
    player_count = Column(Integer, nullable=False)


class GamePlayer(Base):
    __tablename__ = "game_players"

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    player_name = Column(Text, nullable=False)
    commander_name = Column(Text)
    commander_colors = Column(ARRAY(Text))
    final_life = Column(Integer)
    final_poison = Column(Integer, default=0)
    eliminated = Column(Boolean, default=False)
    commander_damage_dealt = Column(Integer, default=0)


class GameEvent(Base):
    __tablename__ = "game_events"

    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("game_players.id", ondelete="SET NULL"))
    event_type = Column(Text, nullable=False)
    amount = Column(Integer)
    created_at = Column(TIMESTAMPTZ, server_default=func.now(), nullable=False)
