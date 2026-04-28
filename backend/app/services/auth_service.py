from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

ALGORITHM = "HS256"  # HMAC-SHA256: estándar para JWT simétricos (misma clave para firmar y verificar)

# CryptContext abstrae el algoritmo de hashing. Si en el futuro cambiás de
# bcrypt a argon2, solo cambiás esta línea — el resto del código no se toca.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # bcrypt genera un salt aleatorio internamente y lo embebe en el hash.
    # El resultado es distinto cada vez aunque la password sea la misma.
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Extrae el salt del hash guardado, recomputa y compara.
    # Nunca comparás strings directamente — eso sería vulnerable a timing attacks.
    return pwd_context.verify(plain_password, hashed_password)


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
