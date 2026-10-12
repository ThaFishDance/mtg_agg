"""Apply checked-in SQL migrations explicitly; never run during server startup."""

import hashlib
import os
from pathlib import Path

from sqlalchemy import Engine, text

from app.db import build_engine


def apply_migrations(engine: Engine) -> list[str]:
    applied = []
    with engine.begin() as connection:
        connection.execute(text("SELECT pg_advisory_xact_lock(723451901)"))
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migration (
                filename TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        for path in sorted((Path(__file__).parents[1] / "migrations").glob("v*__*.sql")):
            source = path.read_bytes()
            checksum = hashlib.sha256(source).hexdigest()
            existing = connection.execute(text("SELECT checksum FROM schema_migration WHERE filename = :filename"), {"filename": path.name}).scalar_one_or_none()
            if existing is not None:
                if existing != checksum:
                    raise ValueError(f"Previously applied migration changed: {path.name}")
                continue
            connection.exec_driver_sql(source.decode("utf-8"))
            connection.execute(text("INSERT INTO schema_migration (filename, checksum) VALUES (:filename, :checksum)"), {"filename": path.name, "checksum": checksum})
            applied.append(path.name)
    return applied


def main() -> None:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("Set DATABASE_URL before running migrations")
    engine = build_engine(url)
    try:
        applied = apply_migrations(engine)
        print("Applied: " + ", ".join(applied) if applied else "Migrations already applied")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
