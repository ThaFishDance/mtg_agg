import sqlite3

import pytest

from app.migrate_local import migrate_local


def test_local_upgrade_preserves_records_and_is_repeatable(tmp_path):
    path = tmp_path / "local.db"
    with sqlite3.connect(path) as db:
        db.executescript("""
            CREATE TABLE app_user (user_id INTEGER PRIMARY KEY, email TEXT UNIQUE);
            CREATE TABLE pod (pod_id INTEGER PRIMARY KEY);
            INSERT INTO app_user VALUES (1, 'existing@example.com');
            INSERT INTO pod VALUES (1);
        """)
    backup = migrate_local(path)
    migrate_local(path)
    with sqlite3.connect(backup) as db:
        assert "clerk_user_id" not in {row[1] for row in db.execute("PRAGMA table_info(app_user)")}
        assert db.execute("SELECT email FROM app_user").fetchone()[0] == "existing@example.com"
    with sqlite3.connect(path) as db:
        db.execute("PRAGMA foreign_keys=ON")
        assert db.execute("SELECT email, clerk_user_id FROM app_user").fetchone() == ("existing@example.com", None)
        assert db.execute("SELECT owner_user_id, is_public FROM pod").fetchone() == (None, 0)
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE pod SET is_public=1")
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE pod SET owner_user_id=999")
        db.execute("UPDATE app_user SET clerk_user_id='subject' WHERE user_id=1")
        db.execute("INSERT INTO app_user (user_id, email) VALUES (2, 'other@example.com')")
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE app_user SET clerk_user_id='subject' WHERE user_id=2")


def test_local_upgrade_does_not_create_missing_database(tmp_path):
    path = tmp_path / "missing.db"
    with pytest.raises(FileNotFoundError):
        migrate_local(path)
    assert not path.exists()
