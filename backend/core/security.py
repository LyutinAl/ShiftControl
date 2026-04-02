from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

# Argon2 — победитель Password Hashing Competition 2015.
# Устойчивее bcrypt к атакам на GPU и ASIC за счёт настраиваемого потребления памяти.
password_hash = PasswordHash([Argon2Hasher()])


def hash_password(password: str) -> str:
    """Хэшируем пароль перед сохранением в БД."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяем пароль при логине."""
    return password_hash.verify(plain_password, hashed_password)
