# ShiftControl

Внутренняя веб-система для инженерной команды: ведение журналов смен, учёт инцидентов, внутренние сообщения, wiki и аудит-лог действий.

## Стек

| Слой | Технология |
| --- | --- |
| Backend | FastAPI + SQLAlchemy (async) + Alembic |
| База данных | PostgreSQL 16 |
| Frontend | React + TypeScript + Vite |

## Функциональность

- **Смены** — создание, закрытие, просмотр истории смен
- **Инциденты** — журнал инцидентов с комментариями и статусами
- **Сообщения** — внутренний чат между сотрудниками
- **Wiki** — база знаний с поддержкой Markdown и Mermaid-диаграмм
- **Пользователи** — управление учётными записями, роли (admin / user)
- **Аудит-лог** — автоматическая запись всех изменений данных

## Требования

- Python 3.11+
- Node.js 18+
- PostgreSQL 16

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone <repo-url>
cd ShiftControl
```

### 2. Создать файл окружения

```bash
cp .env.example .env
```

Отредактировать `.env`:

```env
POSTGRES_DB=shiftcontrol
POSTGRES_USER=shiftcontrol
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql+psycopg://shiftcontrol:your_password@localhost:5432/shiftcontrol
SECRET_KEY=your_long_random_secret
```

### 3. Запустить backend

```bash
cd backend

# Windows
python -m venv venv && venv\Scripts\activate
# Linux / macOS
python -m venv venv && source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### 4. Создать первого администратора

```bash
python create_admin.py
```

### 5. Запустить frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Открыть в браузере

| URL | Описание |
| --- | --- |
| `http://localhost:5173` | Приложение (frontend) |
| `http://localhost:8000/docs` | Swagger UI (API) |

## Структура проекта

```text
ShiftControl/
├── backend/
│   ├── alembic/          # Миграции БД
│   ├── core/             # Конфиг, БД, сессии, безопасность
│   ├── middleware/        # Аудит-middleware
│   ├── models/           # SQLAlchemy модели
│   ├── routers/          # FastAPI роутеры
│   ├── schemas/          # Pydantic схемы
│   └── main.py
└── frontend/             # React + Vite SPA
```

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `DATABASE_URL` | Полный URL подключения к БД |
| `SECRET_KEY` | Секрет для подписи сессий |
