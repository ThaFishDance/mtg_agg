import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from ..schemas import CardLookupResponse

router = APIRouter()


@router.get("/autocomplete")
async def autocomplete_card(
    request: Request,
    query: str = Query(..., description="Partial card name"),
):
    query = query.strip()
    if not query:
        return []
    try:
        return await request.app.state.scryfall.autocomplete(query)
    except Exception:
        return []


@router.get("/lookup", response_model=CardLookupResponse)
async def lookup_card(
    request: Request,
    query: str = Query(..., description="Fuzzy card name to look up"),
):
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    scryfall = request.app.state.scryfall
    try:
        return await scryfall.lookup(query)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Card not found") from exc
        raise HTTPException(status_code=503, detail="Card lookup unavailable") from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Card lookup unavailable") from exc
