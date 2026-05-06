from typing import Literal

from pydantic import BaseModel, Field, model_validator


SourceType = Literal["infomanager", "excel", "sql", "otro_erp"]


class InfomanagerSourceConfig(BaseModel):
    base_url: str
    client_id: str
    client_secret: str


class CompanyCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str | None = Field(default=None, max_length=80)
    cuit: str | None = None
    business_type: str | None = None
    rubro: str | None = None
    source_type: SourceType
    source: InfomanagerSourceConfig | None = None
    status: Literal["active", "inactive"] = "active"

    @model_validator(mode="after")
    def validate_source_config(self):
        if self.source_type == "infomanager" and self.source is None:
            raise ValueError("source is required when source_type is infomanager")
        return self


class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str
    cuit: str | None
    rubro: str | None
    status: str
    database_name: str | None = None
    source_type: str | None = None
    source_status: str | None = None
    sync_status: str | None = None
    last_successful_sync_at: str | None = None


class CompanyDetailResponse(CompanyResponse):
    data_source: dict | None = None
    tenant_database: dict | None = None
