import pytest
from pydantic import ValidationError

from models.user import UserRole
from schemas.user import UserCreate, UserUpdate


def test_user_create_valid():
    user = UserCreate(username="testuser", full_name="Test User", password="password123")
    assert user.username == "testuser"
    assert user.role == UserRole.engineer


def test_user_create_password_too_short():
    with pytest.raises(ValidationError):
        UserCreate(username="u", full_name="Test User", password="123")


def test_user_update_all_fields_optional():
    update = UserUpdate()
    assert update.full_name is None
    assert update.password is None
    assert update.role is None
