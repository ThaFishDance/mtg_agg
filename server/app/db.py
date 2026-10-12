from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException, Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session


def build_engine(database_url: str) -> Engine:
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        raise ValueError("DATABASE_URL must use PostgreSQL")
    return create_engine(url.set(drivername="postgresql+psycopg"), pool_pre_ping=True, connect_args={"connect_timeout": 5})


@contextmanager
def transaction(engine: Engine) -> Iterator[Session]:
    try:
        with Session(engine, expire_on_commit=False) as session, session.begin():
            yield session
    except IntegrityError:
        raise HTTPException(409, "Operation conflicts with an existing or referenced record") from None
    except OperationalError:
        raise HTTPException(503, "Database unavailable") from None


def get_db(request: Request) -> Iterator[Session]:
    engine = request.app.state.engine
    if engine is None:
        raise HTTPException(503, "DATABASE_URL is not configured")
    with transaction(engine) as session:
        yield session
