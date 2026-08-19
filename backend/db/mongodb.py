"""
MongoDB connection manager (Motor async client).

This gives the rest of the backend one shared, lazily-created database
handle instead of every router opening its own connection. connect_to_mongo()
runs once on FastAPI startup; close_mongo_connection() runs on shutdown.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "stock_intelligence")

client: AsyncIOMotorClient | None = None
db = None


async def connect_to_mongo():
    """Open the Motor client and make sure required indexes exist.
    Called from main.py's @app.on_event("startup") handler."""
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]

    # Enforced at the database level (not just app code) so two accounts
    # can never share an email, even under concurrent registration requests.
    await db.users.create_index("email", unique=True)

    print(f"✅ Connected to MongoDB ({MONGO_DB_NAME})")


async def close_mongo_connection():
    """Called from main.py's @app.on_event("shutdown") handler."""
    if client:
        client.close()
        print("MongoDB connection closed.")


def get_db():
    """Accessor used by routers — raises clearly if startup hasn't run yet,
    instead of a confusing 'NoneType has no attribute' error deep in a query."""
    if db is None:
        raise RuntimeError(
            "MongoDB is not connected. Make sure connect_to_mongo() runs on "
            "FastAPI startup (see the @app.on_event('startup') block in main.py)."
        )
    return db