from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import verify_password, hash_password
from core.session import create_session, get_user_id_from_session, delete_session
from models.user import User
from pydantic import BaseModel, field_validator
from schemas.user import LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "session_id"


# --- Dependency: получить текущего пользователя из cookie ---


async def get_current_user(
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency — используется в защищённых эндпоинтах.
    Читает session_id из cookie, ищет в БД, загружает User.

    Использование:
        @router.get("/me")
        async def me(user: User = Depends(get_current_user)):
            ...
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Не авторизован")

    user_id = await get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Сессия истекла или не найдена")

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден или заблокирован")

    return user


# --- Эндпоинты ---


@router.post("/login")
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Авторизация: проверяем логин/пароль, создаём сессию, ставим cookie."""
    # Ищем пользователя по username
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    # Одно сообщение для обоих случаев — не раскрываем что именно неверно
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Учётная запись заблокирована")

    session_id = await create_session(user.id, db)

    # httpOnly=True — cookie недоступна из JavaScript (защита от XSS)
    # samesite="lax" — защита от CSRF
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,
    )
    return {"detail": "Успешная авторизация"}


@router.post("/logout")
async def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    """Выход: удаляем сессию из БД, очищаем cookie."""
    if session_id:
        await delete_session(session_id, db)
    response.delete_cookie(key=COOKIE_NAME)
    return {"detail": "Выход выполнен"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Возвращает данные текущего авторизованного пользователя."""
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль должен быть не менее 6 символов")
        return v


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Смена пароля текущего пользователя. Требует подтверждение текущего пароля."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Пароль успешно изменён"}
