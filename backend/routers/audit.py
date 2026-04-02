from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from core.database import get_db
from models.audit_log import AuditLog, ActionType
from models.user import User, UserRole
from routers.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action_type: ActionType
    entity_type: str
    entity_id: int | None
    old_value: dict | None
    new_value: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AuditLogResponse])
async def list_audit_log(
    skip: int = 0,
    limit: int = 50,
    entity_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История действий. Только для администратора."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Только для администратора")

    query = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    result = await db.execute(query)
    return result.scalars().all()
