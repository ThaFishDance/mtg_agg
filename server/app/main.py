from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .routers import games, cards
from .config import settings
from .services.scryfall import ScryfallService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_production_settings()
    app.state.scryfall = ScryfallService()
    yield
    await app.state.scryfall.close()


app = FastAPI(title="MTG Commander Tracker", version="2.0.0", lifespan=lifespan, redirect_slashes=False)

if settings.allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "microphone=(), camera=(), geolocation=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(cards.router, prefix="/api/cards", tags=["cards"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
