from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ConnectorCreate(BaseModel):
    company_id: int
    connector_type: str = "INFOMANAGER"
    client_id: str
    client_secret: str
    base_url: str = "https://impedidos.infomanager.com.ar"


class CompanyInfomanagerConnectorCreate(BaseModel):
    client_id: str
    client_secret: str
    base_url: str = "https://impedidos.infomanager.com.ar"


class ConnectorResponse(BaseModel):
    id: int
    company_id: int
    connector_type: str
    client_id: str
    base_url: str
    last_sync_at: Optional[datetime] = None
    sync_status: str
    sync_error: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
