"""add shift_id to incidents

Revision ID: 39204a9c7fbf
Revises: 2020cd0f93bd
Create Date: 2026-03-25 18:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "39204a9c7fbf"
down_revision: Union[str, None] = "2020cd0f93bd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("incidents", sa.Column("shift_id", sa.Integer(), sa.ForeignKey("shifts.id"), nullable=True))
    op.create_index("ix_incidents_shift_id", "incidents", ["shift_id"])


def downgrade() -> None:
    op.drop_index("ix_incidents_shift_id", table_name="incidents")
    op.drop_column("incidents", "shift_id")
