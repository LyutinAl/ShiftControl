from contextvars import ContextVar

# Хранит user_id текущего запроса.
# ContextVar — переменная уникальная для каждой async-задачи (каждого запроса).
# Middleware устанавливает значение, SQLAlchemy event listener читает его.
current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)
