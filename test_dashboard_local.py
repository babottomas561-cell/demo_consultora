import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath("services/api"))

from app.core.database import AsyncSessionLocal
from app.api.v1.dashboard import get_kpis
from app.models.central import User

async def main():
    async with AsyncSessionLocal() as db:
        user = User(is_admin=True, company_id=None)
        res = await get_kpis(company_id=16, current_user=user, db=db)
        print(res)

asyncio.run(main())
