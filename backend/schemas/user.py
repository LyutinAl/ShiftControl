from pydantic import BaseModel, field_validator

from models.user import UserRole


class LoginRequest(BaseModel):
    """Тело запроса для POST /auth/login."""
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: UserRole = UserRole.engineer

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль должен быть не менее 6 символов")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    password: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) < 6:
            raise ValueError("Пароль должен быть не менее 6 символов")
        return v


class UserResponse(BaseModel):
    """Что возвращаем клиенту — никогда не включаем password_hash."""
    id: int
    username: str
    full_name: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}
