"""JWT helpers — stubs until auth is activated."""
import jwt

SECRET_KEY = "change-me-in-production"
ALGORITHM = "HS256"


def create_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
