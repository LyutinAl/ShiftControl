from datetime import datetime

from pydantic import BaseModel

from schemas.user import UserResponse


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    id: int
    body: str
    created_at: datetime
    author: UserResponse

    model_config = {"from_attributes": True}
