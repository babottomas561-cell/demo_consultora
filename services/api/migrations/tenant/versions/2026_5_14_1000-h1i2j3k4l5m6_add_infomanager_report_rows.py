"""add infomanager report rows

Revision ID: h1i2j3k4l5m6
Revises: g1h2i3j4k5l6
Create Date: 2026-05-14 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "h1i2j3k4l5m6"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "infomanager_report_rows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_key", sa.String(), nullable=False),
        sa.Column("report_name", sa.String(), nullable=False),
        sa.Column("row_key", sa.String(), nullable=False),
        sa.Column("fecha_desde", sa.Date(), nullable=True),
        sa.Column("fecha_hasta", sa.Date(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_key", "row_key", name="idx_infomanager_report_row_unica"),
    )
    op.create_index(op.f("ix_infomanager_report_rows_id"), "infomanager_report_rows", ["id"], unique=False)
    op.create_index("ix_infomanager_report_rows_report_key", "infomanager_report_rows", ["report_key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_infomanager_report_rows_report_key", table_name="infomanager_report_rows")
    op.drop_index(op.f("ix_infomanager_report_rows_id"), table_name="infomanager_report_rows")
    op.drop_table("infomanager_report_rows")
