import secrets
from datetime import datetime, timedelta

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.session import Session


async def create_session(user_id: int, db: AsyncSession) -> str:
    """
    Создаём сессию: генерируем случайный session_id, сохраняем в БД.
    TTL = 8 часов (SESSION_TTL_SECONDS из настроек).
    """
    session_id = secrets.token_hex(32)  # 64 символа, криптографически случайный
    expires_at = datetime.utcnow() + timedelta(seconds=settings.SESSION_TTL_SECONDS)
    db.add(Session(id=session_id, user_id=user_id, expires_at=expires_at))
    await db.commit()
    return session_id


async def get_user_id_from_session(session_id: str, db: AsyncSession) -> int | None:
    """
    Получаем user_id по session_id из БД.
    Возвращает None если сессия не найдена или истекла.
    """
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.expires_at > datetime.utcnow(),
        )
    )
    session = result.scalar_one_or_none()
    return session.user_id if session else None


async def delete_session(session_id: str, db: AsyncSession) -> None:
    """Удаляем сессию при logout."""
    await db.execute(delete(Session).where(Session.id == session_id))
    await db.commit()
