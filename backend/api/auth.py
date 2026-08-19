"""
Registration, login, and "who am I" endpoints.
Mounted at /api/auth in main.py.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import create_access_token, get_current_user, hash_password, verify_password
from db.mongodb import get_db
from schemas.user_schemas import TokenResponse, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_doc_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        created_at=user["created_at"],
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Seed an empty sync profile so GET /api/sync has something to return
    # immediately, without a special "new user" branch in that router.
    await db.user_data.insert_one({
        "_id": str(result.inserted_id),
        "watchlist": ["AAPL"],
        "positions": [],
        "settings": {"risk_profile": "balanced", "theme": "dark"},
        "updated_at": datetime.now(timezone.utc),
    })

    token = create_access_token(subject=str(result.inserted_id))
    return TokenResponse(access_token=token, user=_user_doc_to_out(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        # Deliberately the same message for "no such user" and "wrong password"
        # so a login attempt can't be used to enumerate registered emails.
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(subject=str(user["_id"]))
    return TokenResponse(access_token=token, user=_user_doc_to_out(user))


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: dict = Depends(get_current_user)):
    return _user_doc_to_out(current_user)