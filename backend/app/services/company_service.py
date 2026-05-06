from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.schemas.admin_company import CompanyCreateRequest, InfomanagerSourceConfig
from app.services.company_provisioning_service import generate_database_name, provision_company, slugify_company_name


async def get_or_create_company(
    db: AsyncSession,
    nombre: str,
    im_base_url: str,
    im_client_id: str,
    im_client_secret: str,
) -> Company:
    payload = CompanyCreateRequest(
        name=nombre,
        source_type="infomanager",
        source=InfomanagerSourceConfig(
            base_url=im_base_url,
            client_id=im_client_id,
            client_secret=im_client_secret,
        ),
    )
    result = await provision_company(db, payload)
    return result["company"]
