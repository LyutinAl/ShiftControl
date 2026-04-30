from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.comment import Comment, EntityType
from models.incident import Incident
from models.shift import Shift
from models.user import User, UserRole
from routers.auth import get_current_user
from schemas.comment import CommentCreate, CommentResponse

router = APIRouter(tags=["comments"])


async def _get_comments(entity_type: EntityType, entity_id: int, db: AsyncSession) -> list[Comment]:
    """Общая логика получения комментариев для любой сущности."""
    result = await db.execute(
        select(Comment)
        .where(Comment.entity_type == entity_type, Comment.entity_id == entity_id)
        .order_by(Comment.created_at.asc())
    )
    return result.scalars().all()


async def _add_comment(
    entity_type: EntityType,
    entity_id: int,
    data: CommentCreate,
    db: AsyncSession,
    current_user: User,
) -> Comment:
    """Общая логика добавления комментария к любой сущности."""
    comment = Comment(
        author_id=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id,
        body=data.body,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


# --- Комментарии к сменам ---


@router.get("/shifts/{shift_id}/comments", response_model=list[CommentResponse])
async def list_shift_comments(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = await db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")
    return await _get_comments(EntityType.shift, shift_id, db)


@router.post("/shifts/{shift_id}/comments", response_model=CommentResponse, status_code=201)
async def add_shift_comment(
    shift_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = await db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Смена не найдена")
    return await _add_comment(EntityType.shift, shift_id, data, db, current_user)


# --- Комментарии к инцидентам ---


@router.get("/incidents/{incident_id}/comments", response_model=list[CommentResponse])
async def list_incident_comments(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")
    return await _get_comments(EntityType.incident, incident_id, db)


@router.post("/incidents/{incident_id}/comments", response_model=CommentResponse, status_code=201)
async def add_incident_comment(
    incident_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Инцидент не найден")
    return await _add_comment(EntityType.incident, incident_id, data, db, current_user)


# --- Удаление ---


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить комментарий. Только автор или администратор."""
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if current_user.role != UserRole.admin and comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    await db.delete(comment)
    await db.commit()
