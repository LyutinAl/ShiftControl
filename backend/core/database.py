from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# Движок — соединение с БД. echo=True выводит SQL-запросы в консоль (удобно при разработке)
engine = create_async_engine(settings.DATABASE_URL, echo=True)

# Фабрика сессий. Сессия — единица работы с БД (аналог транзакции в Oracle)
# expire_on_commit=False — объекты остаются доступны после commit()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """
    Базовый класс для всех SQLAlchemy-моделей.
    Все модели наследуются от Base — SQLAlchemy знает о них при создании таблиц.
    Аналог @Entity в JPA.
    """

    pass


async def get_db() -> AsyncSession:
    """
    Dependency для FastAPI — предоставляет сессию БД в каждый эндпоинт.
    Аналог @Autowired EntityManager в Spring.

    Используется так:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...

    async with гарантирует закрытие сессии даже при ошибке.
    """
    async with AsyncSessionLocal() as session:
        yield session
