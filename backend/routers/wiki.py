import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User, UserRole
from models.wiki import WikiArticle, WikiArticlePermission, WikiArticleVersion, WikiSection, WikiVisibility
from routers.auth import get_current_user
from schemas.wiki import (
    WikiArticleCreate, WikiArticleUpdate, WikiArticleResponse, WikiArticleListItem,
    WikiSectionCreate, WikiSectionResponse, WikiVersionResponse,
)

router = APIRouter(prefix="/wiki", tags=["wiki"])

MEDIA_DIR = Path(__file__).parent.parent / "media" / "wiki"
MAX_DIMENSION = 1920
MAX_SIZE_BYTES = 500 * 1024  # 500 KB


# ── Вспомогательные функции прав доступа ──────────────────────────────────────

def _allowed_user_ids(article: WikiArticle) -> set[int]:
    return {p.user_id for p in article.permissions}


def can_view(article: WikiArticle, user: User) -> bool:
    if user.role == UserRole.admin:
        return True
    if article.visibility == WikiVisibility.public:
        return True
    if article.visibility == WikiVisibility.private:
        return article.author_id == user.id
    # restricted
    return user.id in _allowed_user_ids(article)


def can_edit(article: WikiArticle, user: User) -> bool:
    if user.role == UserRole.admin:
        return True
    if article.author_id == user.id:
        return True
    if article.visibility == WikiVisibility.public:
        return True
    if article.visibility == WikiVisibility.restricted:
        return user.id in _allowed_user_ids(article)
    return False  # private — только автор (уже проверен выше)


def _require_view(article: WikiArticle, user: User) -> None:
    if not can_view(article, user):
        raise HTTPException(status_code=403, detail="Нет доступа к статье")


def _require_edit(article: WikiArticle, user: User) -> None:
    if not can_edit(article, user):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")


# ── Разделы ───────────────────────────────────────────────────────────────────

@router.get("/sections", response_model=list[WikiSectionResponse])
async def list_sections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WikiSection).order_by(WikiSection.id))
    return result.scalars().all()


@router.post("/sections", response_model=WikiSectionResponse, status_code=201)
async def create_section(
    data: WikiSectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    section = WikiSection(**data.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


# ── Статьи: список и создание ─────────────────────────────────────────────────

@router.get("/articles", response_model=list[WikiArticleListItem])
async def list_articles(
    section_id: int | None = None,
    tag: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает только доступные пользователю статьи.
    Фильтрация по разделу и тегу.
    """
    query = select(WikiArticle).order_by(WikiArticle.updated_at.desc()).offset(skip).limit(limit)
    if section_id:
        query = query.where(WikiArticle.section_id == section_id)
    if tag:
        query = query.where(WikiArticle.tags.contains([tag]))

    result = await db.execute(query)
    articles = result.scalars().all()

    # Фильтруем по правам на уровне Python — логика прав слишком сложна для SQL
    return [a for a in articles if can_view(a, current_user)]


@router.post("/articles", response_model=WikiArticleResponse, status_code=201)
async def create_article(
    data: WikiArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = WikiArticle(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        section_id=data.section_id,
        tags=data.tags,
        visibility=data.visibility,
    )
    db.add(article)
    await db.flush()  # получаем article.id до добавления permissions

    if data.visibility == WikiVisibility.restricted:
        # Автор всегда включается в список доступа
        user_ids = set(data.allowed_user_ids) | {current_user.id}
        for user_id in user_ids:
            db.add(WikiArticlePermission(article_id=article.id, user_id=user_id))

    await db.commit()
    await db.refresh(article)
    return article


# ── Статьи: чтение, обновление, удаление ──────────────────────────────────────

@router.get("/articles/{article_id}", response_model=WikiArticleResponse)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(WikiArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    _require_view(article, current_user)
    return article


@router.patch("/articles/{article_id}", response_model=WikiArticleResponse)
async def update_article(
    article_id: int,
    data: WikiArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(WikiArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    _require_edit(article, current_user)

    # Если меняется контент — сохраняем текущую версию перед изменением
    if data.content is not None and data.content != article.content:
        db.add(WikiArticleVersion(
            article_id=article.id,
            author_id=current_user.id,
            content=article.content,
        ))

    for field in ("title", "content", "section_id", "tags", "visibility"):
        value = getattr(data, field)
        if value is not None:
            setattr(article, field, value)

    # Обновляем список разрешений если передан
    if data.allowed_user_ids is not None:
        # Удаляем старые
        for perm in list(article.permissions):
            await db.delete(perm)
        await db.flush()
        # Добавляем новые (только при restricted), автор всегда включён
        if article.visibility == WikiVisibility.restricted:
            user_ids = set(data.allowed_user_ids) | {article.author_id}
            for user_id in user_ids:
                db.add(WikiArticlePermission(article_id=article.id, user_id=user_id))

    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/articles/{article_id}", status_code=204)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(WikiArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    if current_user.role != UserRole.admin and article.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только автор или администратор")
    await db.delete(article)
    await db.commit()


# ── Версии ────────────────────────────────────────────────────────────────────

@router.get("/articles/{article_id}/versions", response_model=list[WikiVersionResponse])
async def list_versions(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = await db.get(WikiArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    _require_view(article, current_user)

    result = await db.execute(
        select(WikiArticleVersion)
        .where(WikiArticleVersion.article_id == article_id)
        .order_by(WikiArticleVersion.created_at.desc())
    )
    return result.scalars().all()


@router.get("/versions/{version_id}/content")
async def get_version_content(
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Возвращает Markdown содержимое конкретной версии."""
    version = await db.get(WikiArticleVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Версия не найдена")
    article = await db.get(WikiArticle, version.article_id)
    _require_view(article, current_user)
    return {"content": version.content}


@router.post("/articles/{article_id}/restore/{version_id}", response_model=WikiArticleResponse)
async def restore_version(
    article_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Откат к версии. Текущее состояние сохраняется как новая версия перед откатом."""
    article = await db.get(WikiArticle, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    _require_edit(article, current_user)

    version = await db.get(WikiArticleVersion, version_id)
    if not version or version.article_id != article_id:
        raise HTTPException(status_code=404, detail="Версия не найдена")

    # Сохраняем текущее состояние перед откатом
    db.add(WikiArticleVersion(
        article_id=article.id,
        author_id=current_user.id,
        content=article.content,
    ))

    article.content = version.content
    await db.commit()
    await db.refresh(article)
    return article


# ── Загрузка изображений ──────────────────────────────────────────────────────

@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Загрузка изображения для вставки в Wiki статью.
    Сжимает если ширина/высота > 1920px или размер > 500KB.
    Возвращает URL для вставки в Markdown: ![alt](/media/wiki/filename.jpg)
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Разрешены только изображения")

    content = await file.read()
    img = Image.open(io.BytesIO(content))

    # Конвертируем RGBA/P → RGB для JPEG (JPEG не поддерживает прозрачность)
    has_transparency = img.mode in ("RGBA", "LA", "P")
    if has_transparency:
        img = img.convert("RGBA")
        ext = "png"
        fmt = "PNG"
    else:
        img = img.convert("RGB")
        ext = "jpg"
        fmt = "JPEG"

    # Уменьшаем если превышает максимальный размер
    if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    # Сохраняем с подбором качества если файл слишком большой
    output = io.BytesIO()
    if fmt == "JPEG":
        quality = 85
        img.save(output, format=fmt, quality=quality, optimize=True)
        # Снижаем качество пока файл не влезет в лимит
        while output.tell() > MAX_SIZE_BYTES and quality > 40:
            output = io.BytesIO()
            quality -= 10
            img.save(output, format=fmt, quality=quality, optimize=True)
    else:
        img.save(output, format=fmt, optimize=True)

    filename = f"{uuid.uuid4().hex}.{ext}"
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / filename).write_bytes(output.getvalue())

    return JSONResponse({"url": f"/media/wiki/{filename}"})
