from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.message import Message
from models.user import User, UserRole
from routers.auth import get_current_user
from schemas.message import MessageCreate, MessageResponse

router = APIRouter(prefix="/messages", tags=["messages"])


def _require_manager_or_admin(user: User) -> None:
    if user.role not in (UserRole.manager, UserRole.admin):
        raise HTTPException(status_code=403, detail="Только руководитель или администратор")


@router.get("/", response_model=list[MessageResponse])
async def list_messages(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Список сообщений. Руководитель видит все, инженер — только свои.
    Параметр unread_only=true — только непрочитанные.
    """
    query = select(Message).order_by(Message.created_at.desc()).offset(skip).limit(limit)

    if current_user.role not in (UserRole.manager, UserRole.admin):
        query = query.where(Message.author_id == current_user.id)

    if unread_only:
        query = query.where(Message.is_read == False)  # noqa: E712

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=MessageResponse, status_code=201)
async def create_message(
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить сообщение руководителю."""
    message = Message(**data.model_dump(), author_id=current_user.id)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/{message_id}/read", response_model=MessageResponse)
async def mark_as_read(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отметить сообщение как прочитанное. Только руководитель или администратор."""
    _require_manager_or_admin(current_user)

    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")

    message.is_read = True
    await db.commit()
    await db.refresh(message)
    return message
