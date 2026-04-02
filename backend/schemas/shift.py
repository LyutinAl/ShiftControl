from datetime import datetime

from pydantic import BaseModel

from models.shift import ShiftType
from schemas.user import UserResponse


class ShiftCreate(BaseModel):
    """Тело запроса при создании смены."""
    shift_type: ShiftType
    equipment_status: str | None = None
    completed_works: str | None = None
    open_issues: str | None = None
    notes: str | None = None


class ShiftUpdate(BaseModel):
    """Частичное обновление смены — все поля опциональны."""
    equipment_status: str | None = None
    completed_works: str | None = None
    open_issues: str | None = None
    notes: str | None = None


class ShiftResponse(BaseModel):
    """Что возвращаем клиенту."""
    id: int
    shift_type: ShiftType
    started_at: datetime
    closed_at: datetime | None
    equipment_status: str | None
    completed_works: str | None
    open_issues: str | None
    notes: str | None
    is_closed: bool
    author: UserResponse

    model_config = {"from_attributes": True}
