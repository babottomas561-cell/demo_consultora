import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.models.central import CompanyConnector


def test_company_connector_model_matches_infomanager_credentials_contract():
    columns = CompanyConnector.__table__.columns

    assert CompanyConnector.__tablename__ == "company_connectors"
    assert CompanyConnector.__table__.schema == "public"
    assert {"id", "company_id", "connector_type", "client_id", "client_secret"}.issubset(columns.keys())
    assert {"access_token", "token_expires_at", "base_url", "last_sync_at"}.issubset(columns.keys())
    assert {"sync_status", "sync_error", "created_at"}.issubset(columns.keys())
    assert columns["connector_type"].default.arg == "INFOMANAGER"
    assert columns["base_url"].default.arg == "https://impedidos.infomanager.com.ar"
    assert columns["sync_status"].default.arg == "pending"
    assert not columns["client_id"].nullable
    assert not columns["client_secret"].nullable


def test_connectors_routes_are_registered():
    registered_paths = {route.path for route in app.routes}

    assert {
        "/api/v1/connectors",
        "/api/v1/connectors/{company_id}",
        "/api/v1/connectors/{company_id}/sync",
    }.issubset(registered_paths)
