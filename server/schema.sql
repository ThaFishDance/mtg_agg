CREATE TABLE IF NOT EXISTS games (
  id              SERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_seconds INTEGER,
  starting_life   INTEGER NOT NULL DEFAULT 40,
  winner_name     TEXT,
  player_count    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_players (
  id                    SERIAL PRIMARY KEY,
  game_id               INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name           TEXT NOT NULL,
  commander_name        TEXT,
  commander_colors      TEXT[],
  final_life            INTEGER,
  final_poison          INTEGER DEFAULT 0,
  eliminated            BOOLEAN DEFAULT FALSE,
  commander_damage_dealt INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_events (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id   INTEGER REFERENCES game_players(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  amount      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
