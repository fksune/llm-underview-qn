from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    raw_text: str


class FeedbackResponse(BaseModel):
    id: UUID
    raw_text: str
    sentiment: str
    key_items: list[str]
    requires_action: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class InsightsResponse(BaseModel):
    feedbacks: list[FeedbackResponse]