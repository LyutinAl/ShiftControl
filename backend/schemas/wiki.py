from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from models.wiki import WikiVisibility
from schemas.user import UserResponse


class WikiSectionCreate(BaseModel):
    title: str
    parent_id: int | None = None


class WikiSectionResponse(BaseModel):
    id: int
    title: str
    parent_id: int | None

    model_config = {"from_attributes": True}


class WikiArticleCreate(BaseModel):
    title: str
    content: str = ""
    section_id: int | None = None
    tags: list[str] = []
    visibility: WikiVisibility = WikiVisibility.public
    # allowed_user_ids используется только при visibility=restricted
    allowed_user_ids: list[Annotated[int, Field(gt=0)]] = []


class WikiArticleUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    section_id: int | None = None
    tags: list[str] | None = None
    visibility: WikiVisibility | None = None
    allowed_user_ids: list[Annotated[int, Field(gt=0)]] | None = None


class PermissionUserResponse(BaseModel):
    user_id: int
    user: UserResponse

    model_config = {"from_attributes": True}


class WikiArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    section_id: int | None
    tags: list[str]
    visibility: WikiVisibility
    created_at: datetime
    updated_at: datetime
    author: UserResponse
    section: WikiSectionResponse | None
    permissions: list[PermissionUserResponse]

    model_config = {"from_attributes": True}


class WikiArticleListItem(BaseModel):
    """Краткая карточка для списка статей — без тяжёлого content."""

    id: int
    title: str
    section_id: int | None
    tags: list[str]
    visibility: WikiVisibility
    updated_at: datetime
    author: UserResponse

    model_config = {"from_attributes": True}


class WikiVersionResponse(BaseModel):
    id: int
    article_id: int
    created_at: datetime
    author: UserResponse

    model_config = {"from_attributes": True}
