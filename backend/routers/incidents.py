from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.incident import Incident, IncidentStatus
from models.shift import Shift
from models.user import User, UserRole
from routers.auth import get_current_user
from schemas.incident import (
    AssigneeUpdate,
    IncidentCreate,
    IncidentUpdate,
    IncidentStatusUpdate,
    IncidentResponse,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])

# Допустимые переходы статусов: из какого → в какие можно перейти
ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.new:         {IncidentStatus.in_progress, IncidentStatus.rejected},
    IncidentStatus.in_progress: {IncidentStatus.waiting, IncidentStatus.resolved, IncidentStatus.rejected},
    IncidentStatus.waiting:     {IncidentStatus.in_progress, IncidentStatus.rejected},
    IncidentStatus.resolved:    {IncidentStatus.closed, IncidentStatus.in_progress},
    IncidentStatus.closed:      set(),  # терминальный статус
    IncidentStatus.rejected:    set(),  # терминальный статус
}

TERMINAL_STATUSES = {IncidentStatus.closed, IncidentStatus.rejected}


def _check_transition(current: IncidentStatus, target: IncidentStatus) -> None:
    """Проверяем, допустим ли переход между статусами."""
    if target not in ALLOWED_TRANSITIONS[current]:
        allowed = ", ".join(s.value for s in ALLOWED_TRANSITIONS[current]) or "нет"
        raise HTTPException(
            status_code=409,
            detail=f"Переход из '{current.value}' в '{target.value}' недопустим. "
                   f"Разрешены: {allowed}",
        )


def _require_not_terminal(incident: Incident) -> None:
    if incident.status in TERMINAL_STATUSES:
        raise HTTPException(status_code=409, detail="Инцидент закрыт или отклонён")


def _require_edit_permission(incident: Incident, user: User) -> None:
    """Редактировать может автор, назначенный исполнитель или администратор."""
    if (
        user.role != UserRole.admin
        and incident.author_id != user.id
        and incident.assignee_id != user.id
    ):
        raise HTTPException(status_code=403, detail="Недостаточно прав")


# --- Эндпоинты ---

@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    skip: int = 0,
    limit: int = 20,
    status: IncidentStatus | None = None,
    priority: str | None = None,
    shift_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список инцидентов с фильтрацией по статусу, приоритету и смене."""
    query = select(Incident).order_by(Incident.created_at.desc()).offset(skip).limit(limit)
    if status:
        query = query.where(Incident.status == status)
    if priority:
        query = query.where(Incident.priority == priority)
    if shift_id is not None:
        query = query.where(Incident.shift_id == shift_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IncidentResponse, status_code=201)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = await db.get(Shift, data.shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")
    if shift.is_closed:
        raise HTTPException(status_code=409, detail="Нельзя добавить инцидент к закрытой смене")

    incident = Incident(**data.model_dump(), author_id=current_user.id)
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновление полей инцидента. Статус меняется отдельным эндпоинтом."""
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")

    _require_not_terminal(incident)
    _require_edit_permission(incident, current_user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)

    await db.commit()
    await db.refresh(incident)
    return incident


@router.patch("/{incident_id}/assignee", response_model=IncidentResponse)
async def set_assignee(
    incident_id: int,
    data: AssigneeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Назначить или снять исполнителя. Доступно руководителю и администратору."""
    if current_user.role not in (UserRole.manager, UserRole.admin):
        raise HTTPException(status_code=403, detail="Только руководитель или администратор")

    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")

    _require_not_terminal(incident)

    incident.assignee_id = data.assignee_id

    await db.commit()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/status", response_model=IncidentResponse)
async def change_status(
    incident_id: int,
    data: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Смена статуса инцидента — отдельный эндпоинт, потому что это бизнес-действие,
    а не просто обновление поля. Здесь проверяется допустимость перехода.
    """
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")

    _check_transition(incident.status, data.status)

    incident.status = data.status

    # Фиксируем время закрытия при переходе в терминальный статус
    if data.status in TERMINAL_STATUSES:
        incident.closed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(incident)
    return incident
