"""Explicit, additive SQLite auth-schema upgrade; never touches PostgreSQL."""

import argparse
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


def migrate_local(path: Path) -> Path:
    path = path.resolve(strict=True)
    backup = path.with_name(path.name + "-backup-" + datetime.now(UTC).strftime("%Y%m%d%H%M%S%f"))
    with sqlite3.connect(path.as_uri() + "?mode=rw", uri=True) as connection:
        with sqlite3.connect(backup) as destination:
            connection.backup(destination)
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("BEGIN IMMEDIATE")
        try:
            user_columns = {row[1] for row in connection.execute("PRAGMA table_info(app_user)")}
            pod_columns = {row[1] for row in connection.execute("PRAGMA table_info(pod)")}
            if not user_columns or not pod_columns:
                raise ValueError("Expected an existing local app_user and pod schema")
            if "clerk_user_id" not in user_columns:
                connection.execute("ALTER TABLE app_user ADD COLUMN clerk_user_id VARCHAR(255)")
            connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_clerk ON app_user(clerk_user_id)")
            if "owner_user_id" not in pod_columns:
                connection.execute("ALTER TABLE pod ADD COLUMN owner_user_id BIGINT REFERENCES app_user(user_id)")
            if "is_public" not in pod_columns:
                connection.execute(
                    "ALTER TABLE pod ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE "
                    "CHECK (NOT is_public OR owner_user_id IS NOT NULL)"
                )
            if connection.execute("PRAGMA foreign_key_check").fetchone():
                raise ValueError("Local database has foreign-key violations; upgrade rolled back")
            connection.commit()
        except Exception:
            connection.rollback()
            raise
    return backup


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=Path, default=Path(__file__).resolve().parents[1] / "local.db")
    args = parser.parse_args()
    backup = migrate_local(args.path)
    print(f"Local SQLite schema upgraded. Backup: {backup}")


if __name__ == "__main__":
    main()
