"""
Одноразовый скрипт для создания первого администратора.
Запуск: python create_admin.py
"""
import asyncio
import selectors

from sqlalchemy import select

from core.database import AsyncSessionLocal
from core.security import hash_password
from models.user import User, UserRole


async def create_admin():
    async with AsyncSessionLocal() as db:
        # Проверяем, нет ли уже такого пользователя
        result = await db.execute(select(User).where(User.username == "admin"))
        existing = result.scalar_one_or_none()
        if existing:
            print("Пользователь 'admin' уже существует.")
            return

        admin = User(
            username="admin",
            full_name="Администратор",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print("Пользователь 'admin' создан. Пароль: admin123")
        print("Смените пароль после первого входа!")


# На Windows asyncio использует ProactorEventLoop по умолчанию,
# но psycopg async требует SelectorEventLoop
asyncio.run(
    create_admin(),
    loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
)
