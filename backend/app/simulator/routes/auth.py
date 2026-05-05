from fastapi import APIRouter

from ..auth import LoginRequest, TokenResponse, login

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login_route(credentials: LoginRequest) -> TokenResponse:
    return login(credentials)
