"""add fulltext search indexes

Revision ID: 2020cd0f93bd
Revises: 59b863d12329
Create Date: 2026-03-25 14:36:18.011471

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "2020cd0f93bd"
down_revision: Union[str, Sequence[str], None] = "59b863d12329"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # GIN-индексы для полнотекстового поиска.
    # 'simple' — без языко-зависимого стемминга: работает для русского, английского и других языков.
    # Токенизирует и приводит к нижнему регистру — достаточно для точного поиска по словам.
    # GIN (Generalized Inverted Index) — оптимален для поиска по множеству значений (токены текста).
    op.execute("""
        CREATE INDEX idx_wiki_articles_fts
        ON wiki_articles
        USING GIN (to_tsvector('simple', title || ' ' || coalesce(content, '')))
    """)
    op.execute("""
        CREATE INDEX idx_incidents_fts
        ON incidents
        USING GIN (to_tsvector('simple', title || ' ' || coalesce(description, '')))
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_wiki_articles_fts")
    op.execute("DROP INDEX IF EXISTS idx_incidents_fts")
