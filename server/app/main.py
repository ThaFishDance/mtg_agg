import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Literal
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from app.api import router
from app.db import build_engine, build_local_engine
from app.models import Base


class HealthResponse(BaseModel):
    status: Literal["ok"]
    timestamp: datetime


def create_app(*, local: bool = False, local_db_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        url = os.getenv("DATABASE_URL")
        app.state.engine = (
            build_local_engine(str(local_db_path or Path(__file__).resolve().parents[1] / "local.db"))
            if local else build_engine(url) if url else None
        )
        try:
            if local:
                Base.metadata.create_all(app.state.engine)
            yield
        finally:
            if app.state.engine is not None:
                app.state.engine.dispose()

    app = FastAPI(title="MTG Aggregator", version="0.1.0", lifespan=lifespan)
    app.include_router(router)

    @app.get("/api/health", response_model=HealthResponse, tags=["health"])
    @app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok", timestamp=datetime.now(UTC))

    return app
