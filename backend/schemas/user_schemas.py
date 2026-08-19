"""
Pydantic request/response models for authentication and cross-device sync.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PositionItem(BaseModel):
    ticker: str
    qty: float
    buy_price: float
    side: str = "long"


class SettingsPayload(BaseModel):
    risk_profile: str = "balanced"
    theme: str = "dark"


class WatchlistPayload(BaseModel):
    watchlist: List[str]


class PositionsPayload(BaseModel):
    positions: List[PositionItem]


class UserDataOut(BaseModel):
    watchlist: List[str] = []
    positions: List[PositionItem] = []
    settings: SettingsPayload = SettingsPayload()
    updated_at: Optional[datetime] = None