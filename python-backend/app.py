"""
Main FastAPI application
Entry point for the Python backend
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

# Import modules
import db
from model_local import get_available_models as get_local_models
from model_local import generate_local_async
from model_remote import get_providers, generate_remote, RemoteModelError
from news_fetcher import init_news_sources_db, fetch_all_news, save_news_to_db
from concept_extractor import (
    extract_concepts_from_news,
    save_concepts_to_db,
    get_concepts,
    auto_extract_concepts_for_news,
)
from pdf_exporter import generate_news_pdf, generate_concepts_pdf, generate_phrases_pdf
from sync_client import SyncClient, SyncError

# Initialize FastAPI app
app = FastAPI(title="AI Daily Backend", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup():
    """Initialize database and default data"""
    db.init_database()
    db.insert_default_settings()
    init_news_sources_db()
    print("Backend started successfully")


# ==================== Pydantic Models ====================

class ChatRequest(BaseModel):
    message: str
    provider: str = "local"  # "local" or "remote"
    local_model_name: Optional[str] = None
    remote_provider: Optional[str] = None
    remote_model_name: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


class SavePhraseRequest(BaseModel):
    news_id: int
    text: str
    note: Optional[str] = None


class ToggleStarRequest(BaseModel):
    news_id: int
    starred: bool


class AuthRequest(BaseModel):
    email: str
    password: str


class SettingUpdate(BaseModel):
    key: str
    value: str


# ==================== Settings Endpoints ====================

@app.get("/api/settings")
async def get_all_settings():
    """Get all settings"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return settings


@app.get("/api/settings/{key}")
async def get_setting(key: str):
    """Get a specific setting"""
    value = db.get_setting(key)
    if value is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {"key": key, "value": value}


@app.post("/api/settings")
async def update_setting(setting: SettingUpdate):
    """Update a setting"""
    db.set_setting(setting.key, setting.value)
    return {"status": "success", "key": setting.key, "value": setting.value}


# ==================== Model Endpoints ====================

@app.get("/api/models/local")
async def list_local_models():
    """Get list of available local models"""
    return {"models": get_local_models()}


@app.get("/api/models/remote")
async def list_remote_providers():
    """Get list of remote providers and their models"""
    return {"providers": get_providers()}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with LLM (local or remote)
    """
    try:
        if request.provider == "local":
            model_name = request.local_model_name or db.get_setting("local_model_name") or "local_medium"
            reply = await generate_local_async(model_name, request.message)

        elif request.provider == "remote":
            provider = request.remote_provider or db.get_setting("remote_provider") or "openai"
            model_name = request.remote_model_name or db.get_setting("remote_model_name") or "gpt-3.5-turbo"

            # Get API key
            api_key = db.get_setting(f"{provider}_api_key") or ""

            reply = await generate_remote(
                provider=provider,
                model_name=model_name,
                prompt=request.message,
                api_key=api_key,
            )

        else:
            raise HTTPException(status_code=400, detail="Invalid provider")

        return ChatResponse(reply=reply)

    except RemoteModelError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


# ==================== News Endpoints ====================

@app.get("/api/news")
async def get_news(
    starred: Optional[bool] = None,
    source: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
):
    """Get news articles with optional filters"""
    conn = db.get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM news WHERE deleted = 0"
    params = []

    if starred is not None:
        query += " AND starred = ?"
        params.append(1 if starred else 0)

    if source:
        query += " AND source = ?"
        params.append(source)

    if date:
        query += " AND date LIKE ?"
        params.append(f"{date}%")

    query += " ORDER BY date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    news = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"news": news, "count": len(news)}


@app.get("/api/news/{news_id}")
async def get_news_detail(news_id: int):
    """Get single news article"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM news WHERE id = ? AND deleted = 0", (news_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="News not found")

    return dict(row)


@app.post("/api/news/{news_id}/star")
async def toggle_star(news_id: int, request: ToggleStarRequest):
    """Toggle star status of news article"""
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE news SET starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (1 if request.starred else 0, news_id)
    )

    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=404, detail="News not found")

    return {"status": "success", "starred": request.starred}


@app.post("/api/news/fetch")
async def fetch_news(background_tasks: BackgroundTasks):
    """
    Fetch news from all enabled sources
    Runs in background
    """
    async def fetch_and_save():
        all_news = await fetch_all_news(enabled_only=True)
        for source_news in all_news.values():
            save_news_to_db(source_news)

    background_tasks.add_task(fetch_and_save)

    return {"status": "fetching", "message": "News fetch started in background"}


@app.get("/api/news/sources")
async def get_news_sources():
    """Get list of news sources"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM news_sources ORDER BY category, name")
    sources = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"sources": sources}


# ==================== Concepts Endpoints ====================

@app.post("/api/concepts/extract")
async def extract_concepts(news_id: int = Query(...)):
    """Extract concepts from a news article using LLM"""
    try:
        concepts = await auto_extract_concepts_for_news(news_id)
        return {"status": "success", "concepts": concepts, "count": len(concepts)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")


@app.get("/api/concepts")
async def list_concepts(
    news_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
):
    """Get concepts with optional filters"""
    user_id = db.get_setting("user_id")
    user_id = int(user_id) if user_id and user_id.isdigit() else None

    concepts = get_concepts(
        news_id=news_id,
        search=search,
        limit=limit,
        user_id=user_id,
    )

    return {"concepts": concepts, "count": len(concepts)}


# ==================== Phrases (Learning Library) Endpoints ====================

@app.post("/api/phrases")
async def save_phrase(request: SavePhraseRequest):
    """Save a phrase to learning library"""
    user_id = db.get_setting("user_id")
    user_id = int(user_id) if user_id and user_id.isdigit() else None

    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO phrases (news_id, text, note, user_id)
        VALUES (?, ?, ?, ?)
        """,
        (request.news_id, request.text, request.note, user_id)
    )

    phrase_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"status": "success", "phrase_id": phrase_id}


@app.get("/api/phrases")
async def get_phrases(
    news_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
):
    """Get saved phrases"""
    user_id = db.get_setting("user_id")
    user_id = int(user_id) if user_id and user_id.isdigit() else None

    conn = db.get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM phrases WHERE deleted = 0"
    params = []

    if news_id:
        query += " AND news_id = ?"
        params.append(news_id)

    if search:
        query += " AND (text LIKE ? OR note LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if user_id is not None:
        query += " AND (user_id = ? OR user_id IS NULL)"
        params.append(user_id)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    phrases = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"phrases": phrases, "count": len(phrases)}


# ==================== PDF Export Endpoints ====================

@app.post("/api/export/pdf")
async def export_pdf(
    type: str = Query(...),  # "news", "concepts", or "phrases"
    news_starred_only: bool = False,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """Export data as PDF"""
    try:
        if type == "news":
            # Fetch news based on filters
            conn = db.get_connection()
            cursor = conn.cursor()

            query = "SELECT * FROM news WHERE deleted = 0"
            params = []

            if news_starred_only:
                query += " AND starred = 1"

            if date_from:
                query += " AND date >= ?"
                params.append(date_from)

            if date_to:
                query += " AND date <= ?"
                params.append(date_to)

            query += " ORDER BY date DESC LIMIT 200"

            cursor.execute(query, params)
            news_items = [dict(row) for row in cursor.fetchall()]
            conn.close()

            pdf_bytes = generate_news_pdf(news_items)

        elif type == "concepts":
            concepts = get_concepts(limit=500)
            pdf_bytes = generate_concepts_pdf(concepts)

        elif type == "phrases":
            # Fetch phrases
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM phrases WHERE deleted = 0 ORDER BY created_at DESC LIMIT 500")
            phrases = [dict(row) for row in cursor.fetchall()]
            conn.close()

            pdf_bytes = generate_phrases_pdf(phrases)

        else:
            raise HTTPException(status_code=400, detail="Invalid export type")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={type}_export.pdf"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


# ==================== Sync Endpoints ====================

sync_client = SyncClient()


@app.post("/api/auth/register")
async def register(request: AuthRequest):
    """Register new user"""
    try:
        result = await sync_client.register(request.email, request.password)
        return result
    except SyncError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
async def login(request: AuthRequest):
    """Login user"""
    try:
        result = await sync_client.login(request.email, request.password)
        return result
    except SyncError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/api/auth/logout")
async def logout():
    """Logout user"""
    sync_client.logout()
    return {"status": "success"}


@app.post("/api/sync")
async def sync():
    """Perform bidirectional sync"""
    try:
        result = await sync_client.sync()
        return result
    except SyncError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sync/status")
async def sync_status():
    """Get sync status"""
    return sync_client.get_sync_status()


# ==================== Health Check ====================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-daily-backend"}


# ==================== Main ====================

if __name__ == "__main__":
    # Run with uvicorn
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Enable auto-reload during development
    )
