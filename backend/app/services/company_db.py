from app.services.tenant_database_manager import get_tenant_sessionmaker as get_company_sessionmaker


async def get_company_db(db_url: str):
    session_factory = get_company_sessionmaker(db_url)
    async with session_factory() as session:
        yield session
