from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import games, cards
from .services.scryfall import ScryfallService


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.scryfall = ScryfallService()
    yield
    await app.state.scryfall.close()


app = FastAPI(title="MTG Commander Tracker", version="2.0.0", lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://thecloudbrew.com",
        "https://www.thecloudbrew.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(cards.router, prefix="/api/cards", tags=["cards"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
