from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_available():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert "/health" in data["paths"]


def test_me_requires_auth():
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_login_missing_fields_returns_422():
    response = client.post("/auth/login", json={})
    assert response.status_code == 422
