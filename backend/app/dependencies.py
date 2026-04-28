from typing import Generator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db  # El endpoint recibe esta sesión via Depends(get_db)
    finally:
        db.close()  # Se ejecuta siempre: éxito, excepción, o error HTTP
