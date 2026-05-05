from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.integrations.infomanager.sync_service import get_bi_status

router = APIRouter(prefix="/bi", tags=["bi"])


@router.get("/status")
async def bi_status(db: AsyncSession = Depends(get_db)):
    return await get_bi_status(db)
