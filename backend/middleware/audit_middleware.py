from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.audit_context import current_user_id
from core.database import AsyncSessionLocal
from core.session import get_user_id_from_session

COOKIE_NAME = "session_id"


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware читает session_id из cookie, находит user_id в БД
    и устанавливает его в ContextVar.

    Это позволяет SQLAlchemy event listeners знать кто выполняет операцию,
    не передавая user_id явно через каждый вызов функции.
    """

    async def dispatch(self, request: Request, call_next):
        session_id = request.cookies.get(COOKIE_NAME)
        user_id = None

        if session_id:
            async with AsyncSessionLocal() as db:
                user_id = await get_user_id_from_session(session_id, db)

        # set() возвращает токен — нужен для сброса значения после запроса
        token = current_user_id.set(user_id)
        try:
            response = await call_next(request)
        finally:
            # Сбрасываем ContextVar чтобы не "протекло" значение между запросами
            current_user_id.reset(token)

        return response
