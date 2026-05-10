from pydantic import BaseModel, ConfigDict
from typing import Optional, Any

from app.schemas.connectors import CompanyInfomanagerConnectorCreate

class CompanyCreate(BaseModel):
    name: str
    erp_type: str
    erp_config: Optional[dict[str, Any]] = None
    infomanager_connector: Optional[CompanyInfomanagerConnectorCreate] = None

class CompanyResponse(BaseModel):
    id: int
    name: str
    tenant_schema: str
    is_provisioned: bool
    erp_type: str

    model_config = ConfigDict(from_attributes=True)
