from core.security import hash_password, verify_password


def test_hash_password_returns_argon2_hash():
    result = hash_password("testpassword")
    assert result.startswith("$argon2")


def test_verify_password_correct():
    password = "correctpassword"
    assert verify_password(password, hash_password(password)) is True


def test_verify_password_incorrect():
    hashed = hash_password("correctpassword")
    assert verify_password("wrongpassword", hashed) is False
