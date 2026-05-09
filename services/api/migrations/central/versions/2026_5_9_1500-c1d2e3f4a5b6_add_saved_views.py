"""add saved_views

Revision ID: c1d2e3f4a5b6
Revises: f1910af070d6
Create Date: 2026-05-09 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'f1910af070d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'saved_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('panel', sa.String(), nullable=True),
        sa.Column('filters', sa.JSON(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['public.users.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='public',
    )
    op.create_index(op.f('ix_public_saved_views_id'), 'saved_views', ['id'], unique=False, schema='public')


def downgrade() -> None:
    op.drop_index(op.f('ix_public_saved_views_id'), table_name='saved_views', schema='public')
    op.drop_table('saved_views', schema='public')
