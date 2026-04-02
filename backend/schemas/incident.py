from datetime import datetime

from typing import Annotated

from pydantic import BaseModel, Field

from models.incident import IncidentStatus, IncidentPriority
from schemas.user import UserResponse


class ShiftBriefResponse(BaseModel):
    """Краткая информация о смене для вложения в инцидент."""
    id: int
    shift_type: str
    started_at: datetime

    model_config = {"from_attributes": True}

# Переиспользуемый тип: ID сущности — положительное целое или null.
# Annotated позволяет прикрепить правила валидации к самому типу,
# а не повторять их в каждом классе.
OptionalPositiveId = Annotated[int | None, Field(default=None, gt=0)]


class IncidentCreate(BaseModel):
    title: str
    shift_id: int = Field(gt=0)  # обязательное поле — инцидент всегда привязан к смене
    description: str | None = None
    category: str | None = None
    priority: IncidentPriority = IncidentPriority.medium
    equipment_ref: str | None = None
    assignee_id: OptionalPositiveId = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    priority: IncidentPriority | None = None
    equipment_ref: str | None = None
    assignee_id: OptionalPositiveId = None
    shift_id: OptionalPositiveId = None
    resolution: str | None = None


class IncidentStatusUpdate(BaseModel):
    """Отдельная схема для смены статуса — явно выделяем это как особое действие."""
    status: IncidentStatus


class AssigneeUpdate(BaseModel):
    """Назначение или снятие исполнителя."""
    assignee_id: OptionalPositiveId = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str | None
    category: str | None
    priority: IncidentPriority
    status: IncidentStatus
    equipment_ref: str | None
    resolution: str | None
    created_at: datetime
    closed_at: datetime | None
    author: UserResponse
    assignee: UserResponse | None
    shift_id: int | None
    shift: ShiftBriefResponse | None

    model_config = {"from_attributes": True}
