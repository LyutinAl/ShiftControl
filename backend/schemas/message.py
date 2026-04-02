from datetime import datetime

from pydantic import BaseModel

from schemas.user import UserResponse


class MessageCreate(BaseModel):
    body: str
    needs_attention: bool = False


class MessageResponse(BaseModel):
    id: int
    body: str
    needs_attention: bool
    is_read: bool
    created_at: datetime
    author: UserResponse

    model_config = {"from_attributes": True}
