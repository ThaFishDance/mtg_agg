"""Auth dependencies — wired but inactive until users table + login routes are added."""
from fastapi import Request
from .jwt import decode_token


async def get_current_user(request: Request) -> dict | None:
    """
    Returns the decoded JWT payload for authenticated requests, or None for
    anonymous requests. No existing endpoint uses this yet.

    To protect an endpoint:
        user = Depends(get_current_user)
        if user is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    return decode_token(token)
