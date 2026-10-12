CREATE TABLE IF NOT EXISTS games (
  id              SERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_seconds INTEGER,
  starting_life   INTEGER NOT NULL DEFAULT 40,
  winner_name     TEXT,
  player_count    INTEGER NOT NULL
);
