from contextlib import asynccontextmanager

from fastapi import FastAPI

from .routers import games, cards
from .services.scryfall import ScryfallService


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.scryfall = ScryfallService()
    yield
    await app.state.scryfall.close()


app = FastAPI(title="MTG Commander Tracker", version="2.0.0", lifespan=lifespan, redirect_slashes=False)

app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(cards.router, prefix="/api/cards", tags=["cards"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
