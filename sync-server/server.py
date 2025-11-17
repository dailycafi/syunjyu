"""
Sync server for AI Daily
Handles user authentication and data synchronization
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import uvicorn

import db

# Initialize FastAPI app
app = FastAPI(title="AI Daily Sync Server", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-change-this-in-production"  # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


# Pydantic models
class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int


class SyncData(BaseModel):
    news: List[dict] = []
    concepts: List[dict] = []
    phrases: List[dict] = []


# Initialize database on startup
@app.on_event("startup")
async def startup():
    db.init_database()
    print("Sync server started")


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(...)) -> int:
    """Verify JWT token and return user_id"""
    try:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== Auth Endpoints ====================

@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    """Register a new user"""
    conn = db.get_connection()
    cursor = conn.cursor()

    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    password_hash = hash_password(user.password)
    cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (user.email, password_hash)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Create token
    access_token = create_access_token(user_id, user.email)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user_id
    )


@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    """Login user"""
    conn = db.get_connection()
    cursor = conn.cursor()

    # Get user
    cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (user.email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not verify_password(user.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create token
    access_token = create_access_token(row["id"], row["email"])

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=row["id"]
    )


# ==================== Sync Endpoints ====================

@app.post("/sync/upload")
async def upload_changes(
    data: SyncData,
    user_id: int = Depends(get_current_user)
):
    """Upload local changes to server"""
    conn = db.get_connection()
    cursor = conn.cursor()

    total_count = 0

    try:
        # Upload news changes (starred status)
        for item in data.news:
            cursor.execute(
                """
                INSERT OR REPLACE INTO news
                (id, title, url, summary, content_raw, source, date, starred, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.get("id"), item.get("title"), item.get("url"),
                    item.get("summary"), item.get("content_raw"), item.get("source"),
                    item.get("date"), item.get("starred", 0), user_id,
                    item.get("updated_at"), item.get("deleted", 0)
                )
            )
            total_count += 1

        # Upload concepts
        for item in data.concepts:
            cursor.execute(
                """
                INSERT OR REPLACE INTO concepts
                (id, news_id, term, definition, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.get("id"), item.get("news_id"), item.get("term"),
                    item.get("definition"), user_id, item.get("updated_at"),
                    item.get("deleted", 0)
                )
            )
            total_count += 1

        # Upload phrases
        for item in data.phrases:
            cursor.execute(
                """
                INSERT OR REPLACE INTO phrases
                (id, news_id, text, note, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.get("id"), item.get("news_id"), item.get("text"),
                    item.get("note"), user_id, item.get("updated_at"),
                    item.get("deleted", 0)
                )
            )
            total_count += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        conn.close()

    return {"status": "success", "count": total_count}


@app.get("/sync/download")
async def download_changes(
    since: str = "1970-01-01T00:00:00",
    user_id: int = Depends(get_current_user)
):
    """Download changes from server"""
    conn = db.get_connection()
    cursor = conn.cursor()

    # Get news changes
    cursor.execute(
        "SELECT * FROM news WHERE user_id = ? AND updated_at > ?",
        (user_id, since)
    )
    news = [dict(row) for row in cursor.fetchall()]

    # Get concept changes
    cursor.execute(
        "SELECT * FROM concepts WHERE user_id = ? AND updated_at > ?",
        (user_id, since)
    )
    concepts = [dict(row) for row in cursor.fetchall()]

    # Get phrase changes
    cursor.execute(
        "SELECT * FROM phrases WHERE user_id = ? AND updated_at > ?",
        (user_id, since)
    )
    phrases = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "news": news,
        "concepts": concepts,
        "phrases": phrases,
    }


# ==================== Health Check ====================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-daily-sync-server"}


# ==================== Main ====================

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
    )
