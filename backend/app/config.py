import os

from pydantic_settings import BaseSettings

# Railway inyecta PORT en el arranque. El simulador corre dentro del mismo proceso
# en /simulator, por lo que la URL interna usa el mismo puerto.
_port = os.environ.get("PORT", "8000")


class Settings(BaseSettings):
    # Pydantic lee DATABASE_URL del entorno automáticamente.
    # Sin default → la app no arranca si la variable no está definida.
    database_url: str

    @property
    def async_database_url(self) -> str:
        # Railway genera URLs con prefijo postgresql://, asyncpg necesita postgresql+asyncpg://
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    secret_key: str
    access_token_expire_minutes: int = 30

    # Credenciales Infomanager — se configuran en Railway como variables de entorno
    im_base_url: str = f"http://localhost:{_port}/simulator"
    im_client_id: str = "demo_client"
    im_client_secret: str = "demo_secret"
    im_sync_interval_seconds: int = 150  # sync cada 2.5 minutos
    im_sync_days_initial: int = 90       # cuántos días atrás al primer sync
    enable_simulator: bool = True

    class Config:
        # Le dice a Pydantic que también busque variables en un archivo .env
        # si existe. En Railway no hay .env, se usan las env vars del servicio.
        env_file = ".env"


# Instancia única compartida por toda la app.
settings = Settings()
