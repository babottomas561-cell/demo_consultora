from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


class SavedViewCreate(BaseModel):
    name: str
    description: Optional[str] = None
    panel: Optional[str] = None
    filters: dict[str, Any]
    is_default: bool = False


class SavedViewUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    panel: Optional[str] = None
    filters: Optional[dict[str, Any]] = None
    is_default: Optional[bool] = None


class SavedViewResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    panel: Optional[str]
    filters: dict[str, Any]
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
