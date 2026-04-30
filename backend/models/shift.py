import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from core.database import Base


class ShiftType(str, enum.Enum):
    day = "day"
    night = "night"


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    shift_type: Mapped[ShiftType] = mapped_column(SAEnum(ShiftType), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    equipment_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_works: Mapped[str | None] = mapped_column(Text, nullable=True)
    open_issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Связь с пользователем — загружается отдельным запросом при обращении к .author
    author: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Shift id={self.id} type={self.shift_type} closed={self.is_closed}>"
