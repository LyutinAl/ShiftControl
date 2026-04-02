from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Путь к .env вычисляется относительно этого файла (core/config.py → ../.. → корень проекта)
# Работает независимо от того, из какой директории запускается команда
ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    """
    Настройки приложения — читаются из .env файла.
    Pydantic проверяет типы и наличие обязательных переменных при старте.
    Если переменная отсутствует — приложение упадёт с понятной ошибкой.
    """
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",  # игнорировать переменные из .env которых нет в классе
    )

    # База данных
    DATABASE_URL: str

    # Безопасность
    SECRET_KEY: str
    SESSION_TTL_SECONDS: int = 60 * 60 * 8  # 8 часов — длина смены


# Единственный экземпляр настроек для всего приложения (Singleton)
settings = Settings()
