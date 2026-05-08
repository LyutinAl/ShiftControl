# ShiftControl

![CI](https://github.com/LyutinAl/ShiftControl/actions/workflows/ci.yml/badge.svg)

Внутренняя веб-система для инженерной команды: ведение журналов смен, учёт инцидентов, внутренние сообщения, wiki и аудит-лог действий.

## Стек

| Слой | Технология |
| --- | --- |
| Backend | FastAPI + SQLAlchemy (async) + Alembic |
| База данных | PostgreSQL 16 |
| Кэш | Redis 7 |
| Frontend | React + TypeScript + Vite |
| Контейнеризация | Docker + Docker Compose |
| IaC | Terraform (kreuzwerker/docker) |
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

Приложение доступно на <http://localhost>.

> После создания: логин `admin`, пароль `admin123`. Смените пароль после первого входа.

## Быстрый старт (Terraform)

Альтернативный способ развёртывания через IaC. Требования: Terraform >= 1.0, Docker Desktop.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Заполнить postgres_password и secret_key в terraform.tfvars

terraform init
terraform apply
```

```bash
docker exec shiftcontrol_backend python create_admin.py
```

Приложение доступно на <http://localhost:8080>.

> Если `registry.terraform.io` недоступен (Россия), настройте зеркало Yandex Cloud —
> инструкция в разделе [Примечание по Terraform](#примечание-по-terraform).

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
├── terraform/            # IaC: то же окружение через Terraform
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   └── terraform.tfvars.example
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

Образы публикуются в GHCR:

| Образ | Описание |
| --- | --- |
| `ghcr.io/lyutinal/shiftcontrol:latest` | Backend (FastAPI) |
| `ghcr.io/lyutinal/shiftcontrol-frontend:latest` | Frontend (nginx + React SPA) |

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `DATABASE_URL` | Полный URL подключения к БД (только для локального запуска) |
| `SECRET_KEY` | Секрет для подписи сессий |

## Примечание по Terraform

Официальный реестр HashiCorp (`registry.terraform.io`) может быть недоступен из России. В этом случае настройте зеркало Yandex Cloud — создайте файл `%APPDATA%\terraform.d\terraform.rc` (Windows) или `~/.terraformrc` (Linux/macOS):

```hcl
provider_installation {
  network_mirror {
    url     = "https://terraform-mirror.yandexcloud.net/"
    include = ["registry.terraform.io/*/*"]
  }
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
```
