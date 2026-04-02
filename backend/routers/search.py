from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.incident import Incident
from models.user import User
from models.wiki import WikiArticle
from routers.auth import get_current_user
from routers.wiki import can_view
from schemas.incident import IncidentResponse
from schemas.wiki import WikiArticleListItem

router = APIRouter(prefix="/search", tags=["search"])


class SearchResponse(BaseModel):
    articles: list[WikiArticleListItem]
    incidents: list[IncidentResponse]


@router.get("/", response_model=SearchResponse)
async def search(
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Полнотекстовый поиск по статьям Wiki и инцидентам.

    Использует PostgreSQL plainto_tsquery — принимает обычный текст,
    не требует специального синтаксиса от пользователя.
    Например: q=насос сломался  →  'насос' & 'сломался'
    """
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Запрос слишком короткий")

    tsquery = func.plainto_tsquery("simple", q)
    tsvector_articles = func.to_tsvector("simple", WikiArticle.title + " " + WikiArticle.content)
    tsvector_incidents = func.to_tsvector("simple", Incident.title + " " + func.coalesce(Incident.description, ""))

    # Поиск статей — с сортировкой по релевантности
    articles_result = await db.execute(
        select(WikiArticle)
        .where(tsvector_articles.op("@@")(tsquery))
        .order_by(func.ts_rank(tsvector_articles, tsquery).desc())
        .limit(20)
    )
    all_articles = articles_result.scalars().all()

    # Фильтруем по правам доступа
    visible_articles = [a for a in all_articles if can_view(a, current_user)]

    # Поиск инцидентов
    incidents_result = await db.execute(
        select(Incident)
        .where(tsvector_incidents.op("@@")(tsquery))
        .order_by(func.ts_rank(tsvector_incidents, tsquery).desc())
        .limit(20)
    )
    incidents = incidents_result.scalars().all()

    return SearchResponse(articles=visible_articles, incidents=incidents)
