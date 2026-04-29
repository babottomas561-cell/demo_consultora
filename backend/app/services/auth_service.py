from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config import settings

ALGORITHM = "HS256"  # HMAC-SHA256: estándar para JWT simétricos (misma clave para firmar y verificar)


def hash_password(password: str) -> str:
    # truncate_error=False evita el ValueError de versiones nuevas de bcrypt
    # cuando la password supera 72 bytes — en su lugar trunca silenciosamente.
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt, truncate_error=False).decode("utf-8")  # type: ignore[call-arg]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "sub": str(user_id),  # "sub" (subject) es el campo estándar JWT para el ID del usuario
        "role": role,
        "exp": expire,        # JWT verifica esta fecha automáticamente al decodificar
    }

    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    # Lanza JWTError si la firma es inválida o el token expiró.
    # El router/dependency captura esa excepción y devuelve 401.
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
