from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Импортируем наши настройки и Base со всеми моделями
from core.config import settings
from core.database import Base

# Здесь будут импортированы все модели, чтобы Alembic знал о таблицах.
# Когда добавляем новую модель — добавляем импорт сюда.
import models  # noqa: F401  ← пока пусто, заполним по мере написания моделей

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Передаём метаданные наших моделей — Alembic сравнивает их с реальной схемой БД
target_metadata = Base.metadata

# Передаём URL из .env в Alembic
# Важно: Alembic работает синхронно, поэтому используем обычный psycopg (не async)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Offline режим: генерирует SQL-скрипт без подключения к БД."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online режим: подключается к БД и применяет миграции."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
