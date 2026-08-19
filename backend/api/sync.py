"""
Cross-device sync: watchlist, portfolio positions, and settings.

Every route requires a valid Bearer token (see core/security.py) and only
ever reads/writes the caller's own document — current_user["_id"] comes from
the verified JWT, never from anything the client sends, so there's no way
for one account to reach another account's data through these endpoints.

Mounted at /api/sync in main.py.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from core.security import get_current_user
from db.mongodb import get_db
from schemas.user_schemas import (
    PositionsPayload,
    SettingsPayload,
    UserDataOut,
    WatchlistPayload,
)

router = APIRouter(prefix="/api/sync", tags=["Cross-Device Sync"])

_DEFAULT_DOC = {
    "watchlist": ["AAPL"],
    "positions": [],
    "settings": {"risk_profile": "balanced", "theme": "dark"},
}


async def _get_or_seed_user_data(db, user_id: str) -> dict:
    doc = await db.user_data.find_one({"_id": user_id})
    if doc is None:
        doc = {"_id": user_id, **_DEFAULT_DOC, "updated_at": datetime.now(timezone.utc)}
        await db.user_data.insert_one(doc)
    return doc


@router.get("", response_model=UserDataOut)
async def get_all_synced_data(current_user: dict = Depends(get_current_user)):
    """Called right after login to hydrate watchlist + positions + settings
    on whatever device the user just signed into."""
    db = get_db()
    doc = await _get_or_seed_user_data(db, str(current_user["_id"]))
    return UserDataOut(**doc)


@router.put("/watchlist", response_model=UserDataOut)
async def update_watchlist(payload: WatchlistPayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    await _get_or_seed_user_data(db, user_id)
    await db.user_data.update_one(
        {"_id": user_id},
        {"$set": {"watchlist": payload.watchlist, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.user_data.find_one({"_id": user_id})
    return UserDataOut(**doc)


@router.put("/positions", response_model=UserDataOut)
async def update_positions(payload: PositionsPayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    await _get_or_seed_user_data(db, user_id)
    await db.user_data.update_one(
        {"_id": user_id},
        {"$set": {
            "positions": [p.dict() for p in payload.positions],
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    doc = await db.user_data.find_one({"_id": user_id})
    return UserDataOut(**doc)


@router.put("/settings", response_model=UserDataOut)
async def update_settings(payload: SettingsPayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    await _get_or_seed_user_data(db, user_id)
    await db.user_data.update_one(
        {"_id": user_id},
        {"$set": {"settings": payload.dict(), "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.user_data.find_one({"_id": user_id})
    return UserDataOut(**doc)