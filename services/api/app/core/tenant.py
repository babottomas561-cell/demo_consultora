from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from alembic.config import Config
from alembic import command
import os
from app.core.database import get_db

from fastapi import Depends, HTTPException
from jose import jwt, JWTError
from app.core.config import settings
from app.schemas.user import TokenPayload
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def create_tenant_schema(db: AsyncSession, schema_name: str):
    """Creates a new PostgreSQL schema for a tenant if it doesn't exist."""
    await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    await db.commit()

async def set_tenant_schema(db: AsyncSession, schema_name: str):
    """Sets the search_path to the specific tenant schema."""
    await db.execute(text(f'SET search_path TO "{schema_name}"'))

async def get_tenant_db(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> AsyncSession:
    """Dependency that returns a DB session already pointed to the correct tenant schema."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        
        if not token_data.tenant_schema:
            raise HTTPException(status_code=403, detail="User is not associated with any tenant")
            
        await set_tenant_schema(db, token_data.tenant_schema)
        return db
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def run_tenant_migrations(schema_name: str):
    """
    Runs Alembic migrations for a specific tenant schema.
    This function is synchronous and should be run in a threadpool
    if called from an async context like a FastAPI endpoint.
    """
    # Path to the tenant alembic.ini
    api_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    alembic_cfg_path = os.path.join(api_dir, "migrations", "tenant", "alembic.ini")
    
    alembic_cfg = Config(alembic_cfg_path)
    
    # Alembic needs to know the script_location explicitly sometimes if run from different cwd
    script_location = os.path.join(api_dir, "migrations", "tenant")
    alembic_cfg.set_main_option("script_location", script_location)
    
    # Pass the tenant name dynamically via x argument
    alembic_cfg.cmd_opts = type('Opts', (), {'x': [f"tenant={schema_name}"]})()
    
    # Run the upgrade
    command.upgrade(alembic_cfg, "head")
