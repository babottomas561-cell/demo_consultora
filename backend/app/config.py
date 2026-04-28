from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Pydantic lee DATABASE_URL del entorno automáticamente.
    # Sin default → la app no arranca si la variable no está definida.
    database_url: str
    secret_key: str           # Clave para firmar los JWT — obligatoria, sin default
    access_token_expire_minutes: int = 30  # Vida del token; 30 min es el estándar seguro

    class Config:
        # Le dice a Pydantic que también busque variables en un archivo .env
        # si existe. En Railway no hay .env, se usan las env vars del servicio.
        env_file = ".env"


# Instancia única compartida por toda la app.
settings = Settings()
