import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from core.database import Base


class IncidentStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    waiting = "waiting"
    resolved = "resolved"
    closed = "closed"
    rejected = "rejected"


class IncidentPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[IncidentPriority] = mapped_column(
        SAEnum(IncidentPriority), nullable=False, default=IncidentPriority.medium
    )
    status: Mapped[IncidentStatus] = mapped_column(SAEnum(IncidentStatus), nullable=False, default=IncidentStatus.new)
    equipment_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # foreign_keys нужен явно — SQLAlchemy не знает какой FK использовать когда их два на одну таблицу
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id], lazy="selectin")  # noqa: F821
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id], lazy="selectin")  # noqa: F821
    shift: Mapped["Shift | None"] = relationship("Shift", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Incident id={self.id} status={self.status} priority={self.priority}>"
