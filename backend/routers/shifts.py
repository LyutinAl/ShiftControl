from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.shift import Shift
from models.user import User, UserRole
from routers.auth import get_current_user
from schemas.shift import ShiftCreate, ShiftUpdate, ShiftResponse

router = APIRouter(prefix="/shifts", tags=["shifts"])


def _require_not_closed(shift: Shift) -> None:
    """Вспомогательная проверка — нельзя редактировать закрытую смену."""
    if shift.is_closed:
        raise HTTPException(status_code=409, detail="Смена уже закрыта")


def _require_author_or_admin(shift: Shift, user: User) -> None:
    """Только автор или администратор может изменять смену."""
    if user.role != UserRole.admin and shift.author_id != user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")


# --- Эндпоинты ---

@router.get("/", response_model=list[ShiftResponse])
async def list_shifts(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список смен, новые первыми. Поддерживает пагинацию через skip/limit."""
    result = await db.execute(
        select(Shift).order_by(Shift.started_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=ShiftResponse, status_code=201)
async def create_shift(
    data: ShiftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Открыть новую смену. Автор — текущий пользователь."""
    shift = Shift(**data.model_dump(), author_id=current_user.id)
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить одну смену по ID."""
    shift = await db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")
    return shift


@router.patch("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    data: ShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить поля открытой смены."""
    shift = await db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")

    _require_not_closed(shift)
    _require_author_or_admin(shift, current_user)

    # Обновляем только переданные поля (exclude_unset=True пропускает незаданные)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(shift, field, value)

    await db.commit()
    await db.refresh(shift)
    return shift


@router.post("/{shift_id}/close", response_model=ShiftResponse)
async def close_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Закрыть смену — фиксирует время закрытия."""
    shift = await db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")

    _require_not_closed(shift)
    _require_author_or_admin(shift, current_user)

    shift.is_closed = True
    shift.closed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(shift)
    return shift
