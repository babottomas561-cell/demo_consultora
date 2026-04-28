from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


# Pool de conexiones a PostgreSQL. No abre conexiones todavía (lazy).
engine = create_engine(settings.database_url)

# Fábrica de sesiones. Cada request obtiene una sesión propia desde acá.
# autocommit=False → el commit es explícito, permite rollback ante errores.
# autoflush=False  → SQLAlchemy no envía SQL hasta que se lo indiques.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán todos los modelos ORM (User, Report, etc.).
Base = declarative_base()
