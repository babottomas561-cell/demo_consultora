import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.schemas.admin_company import CompanyCreateRequest, InfomanagerSourceConfig
from app.services.company_provisioning_service import generate_database_name, slugify_company_name
from app.services.secrets import mask_secret


def test_slugify_company_name_removes_accents_symbols_and_spaces():
    assert slugify_company_name("Distribuidora San Miguel S.A.") == "distribuidora_san_miguel"
    assert slugify_company_name("Ñandú & Café SRL") == "nandu_cafe"


def test_generate_database_name_uses_company_id_and_clean_slug():
    assert generate_database_name(12, "Distribuidora San Miguel S.A.") == "company_12_distribuidora_san_miguel"


def test_create_company_payload_requires_infomanager_credentials():
    with pytest.raises(ValidationError):
        CompanyCreateRequest(
            name="Distribuidora San Miguel",
            source_type="infomanager",
            source=None,
        )


def test_secret_mask_does_not_expose_value():
    assert mask_secret("demo_secret") == "********"
    assert mask_secret(None) is None
