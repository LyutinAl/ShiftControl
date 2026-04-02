from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core import audit_listeners  # noqa: F401 — импорт регистрирует event listeners
from middleware.audit_middleware import AuditMiddleware
from routers import auth, shifts, incidents, comments, messages, audit, users, wiki, search

app = FastAPI(
    title="ShiftControl API",
    description="Система учёта сменных событий и инцидентов",
    version="0.1.0",
)

app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы — изображения Wiki
media_dir = Path(__file__).parent / "media"
media_dir.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

app.include_router(auth.router)
app.include_router(shifts.router)
app.include_router(incidents.router)
app.include_router(comments.router)
app.include_router(messages.router)
app.include_router(audit.router)
app.include_router(users.router)
app.include_router(wiki.router)
app.include_router(search.router)


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok"}
