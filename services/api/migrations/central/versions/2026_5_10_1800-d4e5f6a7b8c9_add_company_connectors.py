"""add company_connectors

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-05-10 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company_connectors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("connector_type", sa.String(), nullable=False),
        sa.Column("client_id", sa.String(), nullable=False),
        sa.Column("client_secret", sa.String(), nullable=False),
        sa.Column("access_token", sa.String(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("base_url", sa.String(), nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_status", sa.String(), nullable=False),
        sa.Column("sync_error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["public.companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "connector_type", name="uq_company_connector_type"),
        schema="public",
    )
    op.create_index(op.f("ix_public_company_connectors_id"), "company_connectors", ["id"], unique=False, schema="public")
    op.create_index(
        op.f("ix_public_company_connectors_company_id"),
        "company_connectors",
        ["company_id"],
        unique=False,
        schema="public",
    )
    op.execute("""
        ALTER TABLE public.company_connectors
        ALTER COLUMN connector_type SET DEFAULT 'INFOMANAGER',
        ALTER COLUMN base_url SET DEFAULT 'https://impedidos.infomanager.com.ar',
        ALTER COLUMN sync_status SET DEFAULT 'pending'
    """)


def downgrade() -> None:
    op.drop_index(op.f("ix_public_company_connectors_company_id"), table_name="company_connectors", schema="public")
    op.drop_index(op.f("ix_public_company_connectors_id"), table_name="company_connectors", schema="public")
    op.drop_table("company_connectors", schema="public")
