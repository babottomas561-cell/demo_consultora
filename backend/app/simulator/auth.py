from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from .config import DEMO_CLIENT_ID, DEMO_CLIENT_SECRET, TOKEN_EXPIRES_SECONDS, TOKEN_PREFIX


security = HTTPBearer(auto_error=False)
issued_tokens: dict[str, datetime] = {}


class LoginRequest(BaseModel):
    client_id: str
    client_secret: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = TOKEN_EXPIRES_SECONDS


def create_token() -> TokenResponse:
    token = f"{TOKEN_PREFIX}{token_urlsafe(24)}"
    issued_tokens[token] = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_EXPIRES_SECONDS)
    return TokenResponse(access_token=token)


def login(credentials: LoginRequest) -> TokenResponse:
    if credentials.client_id != DEMO_CLIENT_ID or credentials.client_secret != DEMO_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid client credentials")
    return create_token()


def require_bearer_token(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    expires_at = issued_tokens.get(credentials.credentials)
    if not expires_at or datetime.now(timezone.utc) >= expires_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired bearer token")

    return credentials.credentials
