"""
Concept extraction module
Uses LLM to extract AI-related concepts and terms from news articles
"""

from typing import List, Dict
import json
from db import get_connection
from model_local import generate_local_async
from model_remote import generate_remote
import db


CONCEPT_EXTRACTION_PROMPT = """You are an AI expert tasked with extracting key AI-related concepts and terminology from a news article.

Please analyze the following article and extract important AI concepts, terms, and techniques mentioned.

For each concept, provide:
1. The term/concept name
2. A brief definition or explanation (1-2 sentences)

Return your response as a JSON array of objects with 'term' and 'definition' fields.

Example format:
[
  {"term": "Transformer", "definition": "A neural network architecture based on self-attention mechanisms, widely used in modern language models."},
  {"term": "Fine-tuning", "definition": "The process of adapting a pre-trained model to a specific task by training it on task-specific data."}
]

Article title: {title}

Article content:
{content}

Extract 3-10 relevant AI concepts from this article. Return only the JSON array, no additional text."""


async def extract_concepts_from_news(
    news_id: int,
    use_local: bool = True,
    local_model: str = "local_medium",
    remote_provider: str = "openai",
    remote_model: str = "gpt-3.5-turbo",
    api_key: str = "",
) -> List[Dict]:
    """
    Extract AI concepts from a news article using LLM

    Args:
        news_id: ID of the news article
        use_local: Whether to use local or remote model
        local_model: Local model name
        remote_provider: Remote provider name
        remote_model: Remote model name
        api_key: API key for remote provider

    Returns:
        List of extracted concepts
    """
    # Get news content from database
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, content_raw FROM news WHERE id = ?", (news_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise ValueError(f"News article {news_id} not found")

    title = row["title"]
    content = row["content_raw"]

    # Prepare prompt
    prompt = CONCEPT_EXTRACTION_PROMPT.format(title=title, content=content[:3000])

    # Generate using appropriate model
    try:
        if use_local:
            response = await generate_local_async(local_model, prompt, max_tokens=1000)
        else:
            response = await generate_remote(
                remote_provider,
                remote_model,
                prompt,
                api_key,
                max_tokens=1000,
                temperature=0.3,  # Lower temperature for more focused extraction
            )

        # Parse JSON response
        # Try to extract JSON from response (handle cases where model adds extra text)
        response = response.strip()

        # Find JSON array in response
        start_idx = response.find("[")
        end_idx = response.rfind("]") + 1

        if start_idx != -1 and end_idx > start_idx:
            json_str = response[start_idx:end_idx]
            concepts = json.loads(json_str)
        else:
            # Fallback if no valid JSON found
            concepts = []

        return concepts

    except json.JSONDecodeError as e:
        print(f"Failed to parse concept extraction response: {e}")
        print(f"Response was: {response}")
        return []
    except Exception as e:
        print(f"Error extracting concepts: {e}")
        return []


def save_concepts_to_db(news_id: int, concepts: List[Dict], user_id: int = None):
    """
    Save extracted concepts to database

    Args:
        news_id: ID of the source news article
        concepts: List of concept dictionaries
        user_id: Optional user ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    for concept in concepts:
        try:
            cursor.execute(
                """
                INSERT INTO concepts (news_id, term, definition, user_id)
                VALUES (?, ?, ?, ?)
                """,
                (news_id, concept.get("term", ""), concept.get("definition", ""), user_id)
            )
        except Exception as e:
            print(f"Error saving concept: {e}")
            continue

    conn.commit()
    conn.close()


def get_concepts(
    news_id: int = None,
    search: str = None,
    limit: int = 100,
    user_id: int = None,
) -> List[Dict]:
    """
    Get concepts from database with optional filters

    Args:
        news_id: Filter by news article ID
        search: Search term in concept name or definition
        limit: Maximum number of results
        user_id: Filter by user ID

    Returns:
        List of concept dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM concepts WHERE deleted = 0"
    params = []

    if news_id:
        query += " AND news_id = ?"
        params.append(news_id)

    if search:
        query += " AND (term LIKE ? OR definition LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if user_id is not None:
        query += " AND (user_id = ? OR user_id IS NULL)"
        params.append(user_id)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    concepts = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return concepts


async def auto_extract_concepts_for_news(
    news_id: int,
    settings: Dict = None,
) -> List[Dict]:
    """
    Automatically extract concepts using current settings

    Args:
        news_id: News article ID
        settings: Optional settings dictionary (will fetch from DB if not provided)

    Returns:
        List of extracted concepts
    """
    if settings is None:
        # Load settings from database
        model_provider = db.get_setting("model_provider") or "local"
        local_model = db.get_setting("local_model_name") or "local_medium"
        remote_provider = db.get_setting("remote_provider") or "openai"
        remote_model = db.get_setting("remote_model_name") or "gpt-3.5-turbo"
        api_key = ""

        if remote_provider == "openai":
            api_key = db.get_setting("openai_api_key") or ""
        elif remote_provider == "deepseek":
            api_key = db.get_setting("deepseek_api_key") or ""
    else:
        model_provider = settings.get("model_provider", "local")
        local_model = settings.get("local_model_name", "local_medium")
        remote_provider = settings.get("remote_provider", "openai")
        remote_model = settings.get("remote_model_name", "gpt-3.5-turbo")
        api_key = settings.get("api_key", "")

    use_local = model_provider == "local"

    concepts = await extract_concepts_from_news(
        news_id=news_id,
        use_local=use_local,
        local_model=local_model,
        remote_provider=remote_provider,
        remote_model=remote_model,
        api_key=api_key,
    )

    # Save to database
    user_id = db.get_setting("user_id")
    user_id = int(user_id) if user_id and user_id.isdigit() else None

    save_concepts_to_db(news_id, concepts, user_id)

    return concepts
