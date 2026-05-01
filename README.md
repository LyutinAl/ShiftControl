# ShiftControl

![CI](https://github.com/LyutinAl/ShiftControl/actions/workflows/ci.yml/badge.svg)

Внутренняя веб-система для инженерной команды: ведение журналов смен, учёт инцидентов, внутренние сообщения, wiki и аудит-лог действий.

## Стек

| Слой | Технология |
| --- | --- |
| Backend | FastAPI + SQLAlchemy (async) + Alembic |
| База данных | PostgreSQL 16 |
| Frontend | React + TypeScript + Vite |
| Контейнеризация | Docker + Docker Compose |
| CI/CD | GitHub Actions → GHCR |

## Функциональность

- **Смены** — создание, закрытие, просмотр истории смен
- **Инциденты** — журнал инцидентов с комментариями и статусами
- **Сообщения** — внутренний чат между сотрудниками
- **Wiki** — база знаний с поддержкой Markdown и Mermaid-диаграмм
- **Пользователи** — управление учётными записями, роли (admin / user)
- **Аудит-лог** — автоматическая запись всех изменений данных

## Быстрый старт (Docker)

Требования: Docker Engine 24+ и Docker Compose v2.

```bash
git clone https://github.com/LyutinAl/ShiftControl.git
cd ShiftControl
cp .env.example .env
```

Отредактировать `.env` (минимум — задать пароли):

```env
POSTGRES_PASSWORD=your_password
SECRET_KEY=your_long_random_secret
```

```bash
docker compose up -d
docker compose exec backend python create_admin.py
```

Приложение доступно на [http://localhost](http://localhost).

## Быстрый старт (локальная разработка)

Требования: Python 3.14+, Node.js 20+, PostgreSQL 16.

### 1. Клонировать репозиторий

```bash
git clone https://github.com/LyutinAl/ShiftControl.git
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
python create_admin.py
uvicorn main:app --reload
```

### 4. Запустить frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Открыть в браузере

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
│   ├── tests/            # Unit-тесты (pytest)
│   ├── Dockerfile        # Multi-stage образ backend
│   └── main.py
├── frontend/
│   ├── src/              # React + TypeScript
│   ├── Dockerfile        # Multi-stage образ frontend (node → nginx)
│   └── nginx.conf        # Nginx: статика + API proxy
├── docker-compose.yml    # Оркестрация: frontend, backend, db, cache
└── .github/
    └── workflows/
        └── ci.yml        # Lint + Test + Security + Build & Push
```

## CI/CD

Пайплайн запускается автоматически:

| Триггер | Jobs |
| --- | --- |
| Pull Request → main | Lint, Test, Security Scan |
| Push → main | Lint, Test, Security Scan, Build & Push Image |

Образ публикуется в GHCR: `ghcr.io/lyutinal/shiftcontrol:latest`

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `DATABASE_URL` | Полный URL подключения к БД (только для локального запуска) |
| `SECRET_KEY` | Секрет для подписи сессий |
