"""
Main FastAPI application
Entry point for the Python backend
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any, Literal
import uvicorn
import httpx
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")
load_dotenv(".env.local")

# Import modules
import db
from model_local import get_available_models as get_local_models
from model_local import generate_local_async
from model_remote import get_providers, generate_remote, RemoteModelError
from news_fetcher import init_news_sources_db, fetch_all_news, save_news_to_db, refetch_news_item
from concept_extractor import (
    extract_concepts_from_news,
    save_concepts_to_db,
    get_concepts,
    auto_extract_concepts_for_news,
)
from ai_filter import filter_news_with_ai
from article_analyzer import analyze_article
from pdf_exporter import generate_news_pdf, generate_concepts_pdf, generate_phrases_pdf
from sync_client import SyncClient, SyncError
from tts_service import generate_speech_minimax, TTSError

# Initialize FastAPI app
app = FastAPI(title="AI Daily Backend", version="0.2.0")

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
    
    # Migration: Fix legacy default settings (openai -> minimax)
    current_provider = db.get_setting("remote_provider")
    current_model = db.get_setting("remote_model_name")
    
    if current_provider == "openai" and current_model == "gpt-3.5-turbo":
        print("Migrating legacy settings: OpenAI -> MiniMax")
        db.set_setting("remote_provider", "minimax")
        db.set_setting("remote_model_name", "MiniMax-M2")
        
    print("Backend started successfully")

# Helper to get AI config
def get_ai_config():
    """Get current AI configuration (provider, model, api_key, base_url)"""
    provider_type = db.get_setting("model_provider") or "remote" # "local" or "remote"
    
    if provider_type == "local":
        # Local LLM API (e.g., LM Studio)
        base_url = db.get_setting("local_model_base_url") or "http://127.0.0.1:1234/v1"
        model = db.get_setting("local_model_name") or "gpt-3.5-turbo"
        return {
            "provider": "openai", # Use openai-compatible client
            "model": model,
            "api_key": "lm-studio", # Dummy key often needed
            "base_url": base_url
        }
    else:
        # Remote API (MiniMax, OpenAI, etc.)
        provider = db.get_setting("remote_provider") or "minimax"
        model = db.get_setting("remote_model_name") or "MiniMax-M2"
        api_key = db.get_setting(f"{provider}_api_key")
        
        if not api_key:
            api_key = os.getenv(f"{provider.upper()}_API_KEY")
        if not api_key and provider == "minimax":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            
        return {
            "provider": provider,
            "model": model,
            "api_key": api_key or "",
            "base_url": None
        }

# ==================== Pydantic Models ====================

class ChatRequest(BaseModel):
    message: str
    provider: str = "local"  # "local" or "remote"
    local_model_name: Optional[str] = None
    remote_provider: Optional[str] = None
    remote_model_name: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


class AnalysisRequest(BaseModel):
    scope: Literal["summary", "structure", "vocabulary"] = "summary"
    user_mode: Optional[Literal["english_learner", "ai_learner"]] = "english_learner"


class SavePhraseRequest(BaseModel):
    news_id: int
    text: str
    note: Optional[str] = None
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    color: Optional[str] = None
    type: Optional[str] = "vocabulary"
    pronunciation: Optional[str] = None


class ExplainRequest(BaseModel):
    text: str
    user_mode: Optional[Literal["english_learner", "ai_learner"]] = "english_learner"

class QuizRequest(BaseModel):
    user_mode: Literal["english_learner", "ai_learner"]

class QuizOption(BaseModel):
    id: str
    text: str

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[QuizOption]
    correct_answer_id: str
    explanation: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


class ToggleStarRequest(BaseModel):
    news_id: int
    starred: bool


class MarkReadRequest(BaseModel):
    news_id: int
    read: bool


class HideRequest(BaseModel):
    news_id: int
    hidden: bool


class AuthRequest(BaseModel):
    email: str
    password: str


class SettingUpdate(BaseModel):
    key: str
    value: str


class SourceToggleRequest(BaseModel):
    enabled: bool

class SourceCreateRequest(BaseModel):
    name: str
    url: HttpUrl
    rss_url: Optional[HttpUrl] = None
    category: str = "general"

class SourceTestResponse(BaseModel):
    status: str
    message: str

class CheckSentenceRequest(BaseModel):
    term: str
    sentence: str

class ExplainConceptRequest(BaseModel):
    term: str
    context: Optional[str] = None

class DefineWordRequest(BaseModel):
    term: str

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "English_expressive_narrator"

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
    # Try to fetch from configured base URL first
    try:
        base_url = db.get_setting("local_model_base_url")
        if base_url:
            target_url = f"{base_url.rstrip('/')}/models"
            
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(target_url)
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data:
                        return {"models": [{"id": m["id"], "name": m["id"]} for m in data["data"]]}
    except Exception as e:
        print(f"Failed to fetch external local models: {e}")

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
        # Determine provider to use based on request or global settings
        if request.provider == "local":
            # Check if "local" means internal mock or external Local API
            # For now, we assume "local" in request means "use whatever is configured as local"
            # But if local_model_base_url is set, use generate_remote
            
            local_base_url = db.get_setting("local_model_base_url")
            if local_base_url:
                 model_name = request.local_model_name or db.get_setting("local_model_name") or "gpt-3.5-turbo"
                 reply = await generate_remote(
                     provider="openai",
                     model_name=model_name,
                     prompt=request.message,
                     api_key="lm-studio",
                     base_url=local_base_url
                 )
            else:
                 # Fallback to internal mock if no base_url configured
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
    category: Optional[str] = None,
    date: Optional[str] = None,
    show_hidden: bool = False,
    limit: int = Query(default=50, le=5000),
    offset: int = 0,
):
    """Get news articles with optional filters"""
    conn = db.get_connection()
    cursor = conn.cursor()

    # 1. Build base WHERE clause and params
    where_clauses = ["deleted = 0"]
    params_base = []

    if not show_hidden:
        where_clauses.append("hidden = 0")

    if starred is not None:
        where_clauses.append("starred = ?")
        params_base.append(1 if starred else 0)

    if source:
        where_clauses.append("source = ?")
        params_base.append(source)

    if category:
        where_clauses.append("category = ?")
        params_base.append(category)

    if date:
        where_clauses.append("date LIKE ?")
        params_base.append(f"{date}%")

    where_str = " AND ".join(where_clauses)

    # 2. Get Total Count (matching filters)
    cursor.execute(f"SELECT COUNT(*) as count FROM news WHERE {where_str}", params_base)
    total_count = cursor.fetchone()['count']

    # 3. Get Starred Count (contextual)
    starred_count = 0
    if starred is True:
        starred_count = total_count
    elif starred is False:
        starred_count = 0
    else:
        # starred is None (All), calculate how many are starred within this filter context
        # We need to construct a query that includes "starred = 1"
        
        # Re-build clauses for starred count
        sc_clauses = [c for c in where_clauses if not c.startswith("starred")]
        sc_clauses.append("starred = 1")
        
        sc_params = params_base.copy() 
        
        cursor.execute(f"SELECT COUNT(*) as count FROM news WHERE {' AND '.join(sc_clauses)}", sc_params)
        starred_count = cursor.fetchone()['count']

    # 4. Get Data (with limit/offset)
    query = f"SELECT * FROM news WHERE {where_str} ORDER BY date DESC LIMIT ? OFFSET ?"
    params = params_base + [limit, offset]
    
    cursor.execute(query, params)
    news = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"news": news, "count": total_count, "starred_count": starred_count}


# ==================== News Sources Endpoints (must be before /api/news/{news_id}) ====================

@app.get("/api/news/sources")
async def get_news_sources():
    """Get list of news sources"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM news_sources ORDER BY category, name")
    sources = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"sources": sources}


@app.post("/api/news/sources")
async def add_news_source(source: SourceCreateRequest):
    """Add a new news source"""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO news_sources (name, url, rss_url, category, enabled) VALUES (?, ?, ?, ?, 1)",
            (source.name, str(source.url), str(source.rss_url) if source.rss_url else None, source.category)
        )
        conn.commit()
        source_id = cursor.lastrowid
        conn.close()
        return {"status": "success", "id": source_id, "message": "Source added"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Error adding source: {str(e)}")

@app.delete("/api/news/sources/{source_id}")
async def delete_news_source(source_id: int):
    """Delete a news source"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM news_sources WHERE id = ?", (source_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    if affected == 0:
        raise HTTPException(status_code=404, detail="Source not found")
        
    return {"status": "success", "message": "Source deleted"}

@app.get("/api/news/sources/test")
async def test_source_url(url: str = Query(..., description="URL to test")):
    """Test if a source URL is reachable"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.head(url, follow_redirects=True)
            if response.status_code < 400:
                 return {"status": "success", "message": "Accessible"}
            
            # Try GET if HEAD fails
            response = await client.get(url, follow_redirects=True)
            if response.status_code < 400:
                return {"status": "success", "message": "Accessible"}
            
            return {"status": "error", "message": f"Status code: {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Unreachable: {str(e)}"}


@app.post("/api/news/sources/{source_id}/toggle")
async def toggle_news_source(source_id: int, request: SourceToggleRequest):
    """Enable or disable a news source"""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE news_sources SET enabled = ? WHERE id = ?",
        (1 if request.enabled else 0, source_id),
    )
    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="News source not found")

    return {"status": "success", "source_id": source_id, "enabled": request.enabled}


# ==================== News Detail & Actions Endpoints ====================

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

@app.post("/api/news/{news_id}/analyze")
async def analyze_news(news_id: int, request: AnalysisRequest):
    """
    Analyze news article (Summary, Structure, Vocabulary) using Configured Provider
    """
    try:
        config = get_ai_config()
        print(f"Starting analysis for news {news_id}, scope={request.scope}, model={config['model']}, base_url={config['base_url']}")
        
        analysis = await analyze_article(
            news_id,
            provider=config["provider"],
            model=config["model"],
            api_key=config["api_key"],
            scope=request.scope,
            user_mode=request.user_mode or "english_learner",
            base_url=config["base_url"]
        )
        
        return {"status": "success", "analysis": analysis}
    except ValueError as e:
        print(f"ValueError in analyze_news: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
         print(f"Unexpected error in analyze_news: {e}")
         raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@app.post("/api/news/{news_id}/explain")
async def explain_snippet(news_id: int, request: ExplainRequest):
    """Explain a selected sentence/paragraph."""
    print(f"Explain request received for news {news_id}, text length: {len(request.text)}")
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, summary FROM news WHERE id = ?", (news_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="News not found")

    config = get_ai_config()
    
    if request.user_mode == "english_learner":
        system_prompt = "You are an expert English teacher helping Chinese students learn English from news."
        prompt = f"""
Analyze the selected passage for an English learner.
Keep explanations clear, structured, and focused on language learning.

Output strictly in Markdown format with these specific headers (do not add others):

## 💡 含义解析
(Explain the core meaning in simple Chinese. Be concise.)

## 🧠 语法剖析
(Analyze the sentence structure, key grammar points, or difficult clauses. Use bullet points.)

## 📚 重点词汇
(List 2-3 key words/phrases with definitions in context)
- **Word**: Definition

Article Context: {row['title']}
Passage:
\"\"\"{request.text.strip()}\"\"\"
"""
    else:
        # AI/Tech Learner Mode
        system_prompt = "You are a senior tech analyst explaining industry insights to professionals."
        prompt = f"""
Analyze the selected passage for a tech industry professional.
Focus on concepts, strategic implications, and technical accuracy. 
Do NOT explain basic grammar or vocabulary unless it's a specific technical term.

Output strictly in Markdown format with these specific headers (do not add others):

## 💡 核心洞察
(Explain the technical or strategic meaning of this passage in professional Chinese.)

## 🔍 深度解析
(Explain the underlying technology, market logic, or product strategy. Use bullet points for clarity.)

## 🧠 关键术语
(List key technical terms/jargon if any)
- **Term**: Technical definition

Article Context: {row['title']}
Passage:
\"\"\"{request.text.strip()}\"\"\"
"""

    try:
        explanation = await generate_remote(
            provider=config["provider"],
            model_name=config["model"],
            prompt=prompt,
            api_key=config["api_key"],
            max_tokens=800,
            temperature=0.2,
            system_prompt=system_prompt,
            base_url=config["base_url"]
        )
        return {"status": "success", "explanation": explanation.strip()}
    except RemoteModelError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explain error: {str(e)}")

@app.post("/api/news/{news_id}/quiz", response_model=QuizResponse)
async def generate_quiz(news_id: int, request: QuizRequest):
    """Generate a quiz based on the news article and user mode."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, summary, content_raw FROM news WHERE id = ?", (news_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="News not found")

    config = get_ai_config()

    content = row['content_raw'] or row['summary']
    if len(content) > 8000:
        content = content[:8000] + "..."

    # Prompt Engineering
    if request.user_mode == "english_learner":
        system_prompt = "You are an IELTS examiner creating reading comprehension tests."
        user_prompt = f"""
        Based on the following article, create 3 multiple-choice questions to test English reading comprehension and vocabulary.
        Focus on IELTS style questions: detailed understanding, vocabulary in context, and inference.
        
        Article Title: {row['title']}
        Content:
        {content}
        
        Output strictly in JSON format:
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "Question text here?",
                    "options": [
                        {{"id": "A", "text": "Option A"}},
                        {{"id": "B", "text": "Option B"}},
                        {{"id": "C", "text": "Option C"}},
                        {{"id": "D", "text": "Option D"}}
                    ],
                    "correct_answer_id": "B",
                    "explanation": "Explanation why B is correct."
                }}
            ]
        }}
        """
    else: # ai_learner
        system_prompt = "You are a tech industry analyst creating critical thinking assessments."
        user_prompt = f"""
        Based on the following article, create 3 multiple-choice questions to test understanding of key industry trends, strategic viewpoints, and implications.
        Focus on: core arguments, future implications, and market analysis.
        
        Article Title: {row['title']}
        Content:
        {content}
        
        Output strictly in JSON format:
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "Question text here?",
                    "options": [
                        {{"id": "A", "text": "Option A"}},
                        {{"id": "B", "text": "Option B"}},
                        {{"id": "C", "text": "Option C"}},
                        {{"id": "D", "text": "Option D"}}
                    ],
                    "correct_answer_id": "B",
                    "explanation": "Explanation of the insight."
                }}
            ]
        }}
        """

    try:
        response_text = await generate_remote(
            provider=config["provider"],
            model_name=config["model"],
            prompt=user_prompt,
            api_key=config["api_key"],
            max_tokens=4000,
            temperature=0.2,
            system_prompt=system_prompt,
            base_url=config["base_url"]
        )
        
        # Clean Markdown code blocks if present
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        
        quiz_data = json.loads(cleaned_text)
        return QuizResponse(**quiz_data)

    except RemoteModelError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except json.JSONDecodeError:
        print(f"Failed JSON Parse. Raw response: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse quiz JSON from AI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")


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


@app.post("/api/news/{news_id}/read")
async def mark_read(news_id: int, request: MarkReadRequest):
    """Mark news article as read/unread"""
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE news SET is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (1 if request.read else 0, news_id)
    )

    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=404, detail="News not found")

    return {"status": "success", "read": request.read}


@app.post("/api/news/{news_id}/hide")
async def hide_news(news_id: int, request: HideRequest):
    """Hide/Unhide news article (Not Interested)"""
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE news SET hidden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (1 if request.hidden else 0, news_id)
    )

    conn.commit()
    affected = cursor.rowcount
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=404, detail="News not found")

    return {"status": "success", "hidden": request.hidden}


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


@app.post("/api/news/filter")
async def filter_news_ai(background_tasks: BackgroundTasks):
    """
    Trigger AI filtering of news (identify industry dynamics vs boring stuff)
    """
    async def run_filtering():
        await filter_news_with_ai(batch_size=20)

    background_tasks.add_task(run_filtering)
    return {"status": "processing", "message": "AI filtering started in background"}


@app.post("/api/news/{news_id}/refetch")
async def refetch_news(news_id: int):
    """
    Force refetch content for a specific news item
    """
    try:
        new_content = await refetch_news_item(news_id)
        if not new_content:
            raise HTTPException(status_code=404, detail="Failed to refetch content or news not found")
        return {"status": "success", "content": new_content}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refetch error: {str(e)}")


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
        INSERT INTO phrases (news_id, text, note, context_before, context_after, color, type, pronunciation, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            request.news_id,
            request.text,
            request.note,
            request.context_before,
            request.context_after,
            request.color or "#fff3b0",
            request.type or "vocabulary",
            request.pronunciation,
            user_id,
        )
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


@app.get("/api/phrases/all-texts")
async def get_all_phrases_texts():
    """Get all user phrase texts for client-side matching"""
    user_id = db.get_setting("user_id")
    user_id = int(user_id) if user_id and user_id.isdigit() else None

    conn = db.get_connection()
    cursor = conn.cursor()

    query = "SELECT text FROM phrases WHERE deleted = 0"
    params = []

    if user_id is not None:
        query += " AND (user_id = ? OR user_id IS NULL)"
        params.append(user_id)

    cursor.execute(query, params)
    texts = [row["text"] for row in cursor.fetchall()]
    conn.close()

    return {"texts": list(set(texts))} # Return unique texts


# ==================== Learning/Practice Endpoints ====================

@app.post("/api/learning/check-sentence")
async def check_sentence(request: CheckSentenceRequest):
    """
    Check if a user-provided sentence correctly uses a specific term.
    Returns feedback with a score.
    """
    config = get_ai_config()

    system_prompt = "You are an encouraging English teacher providing feedback on sentence construction."
    prompt = f"""
    The student is trying to use the word/phrase: "{request.term}"
    
    Student's sentence:
    "{request.sentence}"
    
    Please evaluate the sentence and provide:
    1. A score from A (Perfect) to F (Poor).
    2. A helpful feedback comment explaining why it's good or what needs improvement.
    
    Output strictly in JSON format:
    {{
        "score": "A", 
        "comment": "Great usage! ..."
    }}
    """

    try:
        response_text = await generate_remote(
            provider=config["provider"],
            model_name=config["model"],
            prompt=prompt,
            api_key=config["api_key"],
            max_tokens=800,
            temperature=0.3,
            system_prompt=system_prompt,
            base_url=config["base_url"]
        )
        
        # Robust JSON extraction using regex
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        
        if json_match:
            json_str = json_match.group(0)
            try:
                result = json.loads(json_str)
                return {"status": "success", "feedback": result.get("comment", response_text), "score": result.get("score", "B")}
            except json.JSONDecodeError:
                pass
        
        # Fallback if JSON parsing fails
        return {"status": "success", "feedback": response_text, "score": "B"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI check error: {str(e)}")


@app.post("/api/learning/explain-concept")
async def explain_concept(request: ExplainConceptRequest):
    """
    Deeply explain a tech concept or industry term.
    """
    config = get_ai_config()

    system_prompt = "You are an expert technology consultant explaining complex concepts clearly."
    prompt = f"""
    Explain the concept: "{request.term}"
    
    Context (optional): {request.context or "General technology context"}
    
    Please provide:
    1. A clear, concise definition.
    2. Why it matters (implications).
    3. A real-world example or analogy.
    """

    try:
        explanation = await generate_remote(
            provider=config["provider"],
            model_name=config["model"],
            prompt=prompt,
            api_key=config["api_key"],
            max_tokens=500,
            temperature=0.3,
            system_prompt=system_prompt,
            base_url=config["base_url"]
        )
        return {"status": "success", "explanation": explanation.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI explanation error: {str(e)}")

@app.post("/api/learning/define")
async def define_word(request: DefineWordRequest):
    """
    Provide a dictionary-like definition for a word or phrase.
    """
    config = get_ai_config()

    system_prompt = "You are a helpful English dictionary assistant."
    prompt = f"""
    Define the word/phrase: "{request.term}"
    
    Please provide:
    1. Definition (English)
    2. Simple definition (Chinese)
    3. Two example sentences.
    """

    try:
        definition = await generate_remote(
            provider=config["provider"],
            model_name=config["model"],
            prompt=prompt,
            api_key=config["api_key"],
            max_tokens=400,
            temperature=0.2,
            system_prompt=system_prompt,
            base_url=config["base_url"]
        )
        return {"status": "success", "definition": definition.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI definition error: {str(e)}")

@app.post("/api/tts")
async def generate_tts(request: TTSRequest):
    """Generate TTS audio using Minimax with subtitles"""
    # Reuse existing API key logic
    provider = "minimax"
    api_key = db.get_setting("minimax_api_key")
    if not api_key:
        # Fallback to ANTHROPIC_API_KEY if MINIMAX specific key not set (compatible with existing setup)
        api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
         raise HTTPException(status_code=400, detail="Minimax API key not configured")
         
    try:
        # Now returns dict with 'audio' (bytes) and 'subtitles' (json list)
        result = await generate_speech_minimax(
            request.text, 
            api_key, 
            voice_id=request.voice_id or "English_expressive_narrator"
        )
        
        # Encode audio to base64 for JSON response
        import base64
        audio_b64 = base64.b64encode(result["audio"]).decode("utf-8")
        
        return {
            "status": "success",
            "audio": audio_b64,
            "subtitles": result.get("subtitles", [])
        }
        
    except TTSError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


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


@app.delete("/api/phrases/{phrase_id}")
async def delete_phrase(phrase_id: int):
    """Delete a phrase from learning library"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE phrases SET deleted = 1 WHERE id = ?",
        (phrase_id,)
    )
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    if affected == 0:
        raise HTTPException(status_code=404, detail="Phrase not found")
        
    return {"status": "success", "message": "Phrase deleted"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8500, reload=True)

