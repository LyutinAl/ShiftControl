import enum
from datetime import datetime, timezone

from sqlalchemy import String, Text, ForeignKey, DateTime, UniqueConstraint, Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from core.database import Base


class WikiVisibility(str, enum.Enum):
    public = "public"  # все могут читать и редактировать
    restricted = "restricted"  # только пользователи из списка разрешений
    private = "private"  # только автор (и всегда админ)


class WikiSection(Base):
    """Раздел Wiki. Поддерживает вложенность через self-referential FK."""

    __tablename__ = "wiki_sections"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("wiki_sections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    parent: Mapped["WikiSection | None"] = relationship("WikiSection", remote_side="WikiSection.id", lazy="selectin")

    def __repr__(self) -> str:
        return f"<WikiSection id={self.id} title={self.title!r}>"


class WikiArticle(Base):
    __tablename__ = "wiki_articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    section_id: Mapped[int | None] = mapped_column(ForeignKey("wiki_sections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    visibility: Mapped[WikiVisibility] = mapped_column(
        SAEnum(WikiVisibility), nullable=False, default=WikiVisibility.public
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    author: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
    section: Mapped["WikiSection | None"] = relationship("WikiSection", lazy="selectin")
    permissions: Mapped[list["WikiArticlePermission"]] = relationship(
        "WikiArticlePermission", back_populates="article", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WikiArticle id={self.id} title={self.title!r}>"


class WikiArticleVersion(Base):
    """Snapshot содержимого статьи при каждом сохранении."""

    __tablename__ = "wiki_article_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("wiki_articles.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    author: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821


class WikiArticlePermission(Base):
    """Список пользователей с доступом к статье (используется при visibility=restricted)."""

    __tablename__ = "wiki_article_permissions"

    __table_args__ = (UniqueConstraint("article_id", "user_id", name="uq_wiki_permission"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("wiki_articles.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    article: Mapped["WikiArticle"] = relationship("WikiArticle", back_populates="permissions")
    user: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
