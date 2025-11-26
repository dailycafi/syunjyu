"""
AI News Filtering Module
"""
import asyncio
import json
from typing import List, Dict
from db import get_connection, get_setting
from model_remote import generate_remote, RemoteModelError

async def filter_news_with_ai(batch_size: int = 20):
    """
    Filter news using LLM to score relevance and hide low-quality content.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Select unprocessed news
    cursor.execute(
        "SELECT id, title, summary, source FROM news WHERE ai_score IS NULL AND hidden = 0 ORDER BY date DESC LIMIT ?", 
        (batch_size,)
    )
    news_items = [dict(row) for row in cursor.fetchall()]
    
    if not news_items:
        conn.close()
        return {"status": "no_items", "count": 0}
        
    # Prepare batch for LLM
    items_text = json.dumps([{
        "id": item["id"], 
        "title": item["title"], 
        "source": item["source"],
        "summary": (item["summary"] or "")[:200]
    } for item in news_items], indent=2)
    
    prompt = f"""
You are an expert editor for an AI industry news feed. Your audience consists of AI professionals, researchers, and investors who care about "Industry Dynamics", "Key Research Breakthroughs", and "Significant Market Moves".

Task: Evaluate the following news items.
Criteria:
- High Score (8-10): Major breakthroughs, significant product launches, strategic partnerships, regulatory changes, or insightful market analysis.
- Medium Score (5-7): Interesting updates, minor releases, tutorial-style content, or general opinion pieces.
- Low Score (0-4): Trivial news, pure marketing/PR fluff, clickbait, repetitive content, or non-news.

Return a JSON object where keys are news IDs and values are objects with "score" (0-10) and "reason" (brief explanation).

News Items:
{items_text}

Output JSON format:
{{
  "123": {{"score": 8, "reason": "Major model release"}},
  "124": {{"score": 2, "reason": "Marketing fluff"}}
}}
"""

    provider = get_setting("analysis_provider") or "minimax"
    model = get_setting("analysis_model") or "MiniMax-M2"
    api_key = get_setting(f"{provider}_api_key") or get_setting("minimax_api_key")

    if not api_key:
        conn.close()
        return {"status": "error", "message": "API key not configured"}

    try:
        response = await generate_remote(
            provider=provider,
            model_name=model,
            prompt=prompt,
            api_key=api_key,
            temperature=0.1
        )
        
        # Parse response
        try:
            # Handle potential markdown code blocks
            clean_response = response.replace("```json", "").replace("```", "").strip()
            scores = json.loads(clean_response)
        except json.JSONDecodeError:
            conn.close()
            return {"status": "error", "message": "Failed to parse LLM response"}
            
        # Update DB
        updates = []
        for news_id_str, data in scores.items():
            try:
                news_id = int(news_id_str)
                score = data.get("score", 5)
                reason = data.get("reason", "")
                
                # Auto-hide if score is low (e.g., < 4)
                # But user asked to "filter out", so maybe hide them.
                # Let's be conservative: hide < 3.
                should_hide = 1 if score < 3 else 0
                
                cursor.execute(
                    "UPDATE news SET ai_score = ?, ai_reason = ?, hidden = ? WHERE id = ?",
                    (score, reason, should_hide, news_id)
                )
                updates.append(news_id)
            except ValueError:
                continue
                
        conn.commit()
        conn.close()
        
        return {"status": "success", "processed": len(updates), "details": scores}
        
    except Exception as e:
        conn.close()
        return {"status": "error", "message": str(e)}

