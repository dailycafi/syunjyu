"""
Article Analysis Module
Analyzes news articles and returns scoped AI insights.
"""

from typing import Dict, Literal
import json
import re
import httpx

import db
from model_remote import generate_remote

AnalysisScope = Literal["summary", "structure", "vocabulary"]

async def get_reliable_phonetic(word: str) -> str:
    """
    Fetch reliable IPA from DictionaryAPI.dev.
    Returns None if not found.
    """
    try:
        # Clean the word (remove punctuation, etc.)
        clean_word = re.sub(r'[^\w\s-]', '', word).strip()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{clean_word}", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    entry = data[0]
                    # Try to find the first valid phonetic
                    if "phonetic" in entry and entry["phonetic"]:
                        return entry["phonetic"]
                    if "phonetics" in entry:
                        for p in entry["phonetics"]:
                            if "text" in p and p["text"]:
                                return p["text"]
    except Exception as e:
        print(f"Error fetching phonetic for {word}: {e}")
    return None

# =============================================================================
# English Learner Prompts
# =============================================================================

SUMMARY_PROMPT_ENGLISH = """You are an expert news mentor for English learners.

Article Title: {title}
Article Content:
{content}

Provide JSON:
{{
  "summary": "3-4 sentence concise summary in English that covers the main event, critical facts, and implications."
}}

Requirements:
- Use clear, modern English (max 120 words).
- Mention key entities, figures, and outcomes.
- Ignore any navigational text, ads, or metadata that might have slipped into the content.
- Return ONLY valid JSON with double quotes and no markdown fences.
"""

STRUCTURE_PROMPT_ENGLISH = """You are an expert content strategist creating a clear, hierarchical mind map of the article.
Your goal is to visualize the logical flow in a simple, easy-to-understand TREE structure.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "structure": {{
    "root": {{
      "id": "root",
      "label": "The Central Theme",
      "type": "conclusion",
      "summary": "A single sentence summarizing the core message of the entire article.",
      "children": [
        {{
          "id": "SEC1",
          "label": "Main Point 1",
          "type": "argument",
          "summary": "The first key takeaway or major section.",
          "children": [
            {{
              "id": "DET1",
              "label": "Supporting Detail",
              "type": "evidence",
              "summary": "Specific fact, example, or data point supporting Main Point 1.",
              "children": []
            }}
          ]
        }}
      ]
    }},
    "takeaways": [
      "Insight 1: Why this matters",
      "Insight 2: Future outlook"
    ]
  }}
}}

Requirements:
1. **Simplicity is Key**: Do not create a complex web. Create a clear HIERARCHY (Root -> Main Points -> Details).
2. **Structure**:
   - **Root**: The main topic of the article.
   - **Level 1 (Children of Root)**: Identify 3-5 Distinct Main Points (Arguments, Themes, or Steps).
   - **Level 2 (Children of Level 1)**: Add 2-3 Supporting Details (Evidence, Examples, or Logic) for each Main Point.
   - **Max Depth**: Keep it to 3 levels (Root -> Main -> Detail) to ensure clarity.
3. **Node Content**:
   - **label**: Very concise (2-6 words). Like a chapter title.
   - **summary**: Clear, natural English (10-25 words). Explains *what* and *why*.
   - **type**: Use "conclusion" for Root. Use "argument" for Main Points. Use "evidence", "logic", or "insight" for Details.
4. **Takeaways**: Provide 2-3 high-level synthesized insights in the "takeaways" list.
5. **Strict JSON**: Return ONLY valid JSON. No markdown, no comments.
"""

VOCABULARY_PROMPT_ENGLISH = """You are an expert linguistic consultant.
Your goal is to extract advanced vocabulary from the article and provide a comprehensive study guide.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "vocabulary": [
    {{
        "term": "Word or phrase",
        "pronunciation": "IPA phonetic transcription",
        "definition": "Professional dictionary-style definition in English",
        "example": "A comprehensive example sentence demonstrating usage (can be from article or generated)"
    }},
    ...
  ]
}}

Requirements:
- Provide 8-12 terms that are essential to understanding the article or are high-value academic/professional words.
- "pronunciation" must use standard IPA (e.g., /ˌdʒen.ə.rə.tɪv/).
- "definition" should be precise, professional, and comprehensive (referencing Oxford/Cambridge style).
- "example" must be a full, complex sentence (at least 15 words) that clearly contextaulizes the term.
- Return ONLY valid JSON.
"""

# =============================================================================
# AI Tech Learner Prompts
# =============================================================================

SUMMARY_PROMPT_TECH = """You are a senior technology analyst providing executive briefings.

Article Title: {title}
Article Content:
{content}

Provide JSON:
{{
  "summary": "Executive summary focusing on technical innovation, market impact, and strategic implications."
}}

Requirements:
- Focus on the 'So What?': Why does this technology or event matter to the industry?
- Highlight specific technologies, companies, and market shifts.
- Use professional, concise language suitable for a tech briefing (max 150 words).
- Return ONLY valid JSON with double quotes and no markdown fences.
"""

STRUCTURE_PROMPT_TECH = """You are a systems architect creating a structured breakdown of a technical article.
Visualize the information as a clear logical tree, separating the core concept from its components and implications.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "structure": {{
    "root": {{
      "id": "root",
      "label": "Core Tech/Concept",
      "type": "conclusion",
      "summary": "The main technology or strategic thesis of the article.",
      "children": [
        {{
          "id": "COMP1",
          "label": "Key Component / Driver",
          "type": "argument",
          "summary": "A major part of the system or market force.",
          "children": [
             {{
              "id": "DET1",
              "label": "Spec / Data / Impact",
              "type": "evidence",
              "summary": "Specific detail, benchmark, or consequence.",
              "children": []
            }}
          ]
        }}
      ]
    }},
    "takeaways": [
      "Critical technical insight 1",
      "Market implication 2"
    ]
  }}
}}

Requirements:
1. **Clear Logical Flow**: Organize as Problem -> Solution -> Details, or Technology -> Features -> Impact.
2. **Structure**:
   - **Root**: The central subject.
   - **Level 1**: 3-5 Major Components, Steps, or Strategic Pillars.
   - **Level 2**: Supporting details, specs, or data for each component.
   - **Avoid Clutter**: Limit depth to 3 levels.
3. **Node Content**:
   - **label**: Precise and technical (2-6 words).
   - **summary**: High information density (15-30 words).
   - **type**: Use "conclusion" for Root. "argument" for major components. "evidence", "logic", or "insight" for details.
4. **Takeaways**: 2-3 sentences synthesizing the "So What?" for a technical audience.
5. **Strict JSON**: Return ONLY valid JSON.
"""

VOCABULARY_PROMPT_TECH = """You are a technical glossary expert.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "vocabulary": [
    {{
        "term": "Technical Term / Acronym",
        "pronunciation": "IPA (if applicable) or empty string",
        "definition": "Precise technical definition (IEEE/ISO style)",
        "example": "A detailed technical sentence showing correct usage in context"
    }},
    ...
  ]
}}

Requirements:
- Extract 8-12 key technical terms, acronyms, or industry jargon.
- "definition" should be technically accurate, specific, and professional.
- "example" should be substantial (15+ words) and technically sound.
- Return ONLY valid JSON.
"""

PROMPT_REGISTRY = {
    "english_learner": {
        "summary": SUMMARY_PROMPT_ENGLISH,
        "structure": STRUCTURE_PROMPT_ENGLISH,
        "vocabulary": VOCABULARY_PROMPT_ENGLISH,
    },
    "ai_learner": {
        "summary": SUMMARY_PROMPT_TECH,
        "structure": STRUCTURE_PROMPT_TECH,
        "vocabulary": VOCABULARY_PROMPT_TECH,
    }
}


async def analyze_article(
    news_id: int,
    provider: str = "minimax",
    model: str = "MiniMax-M2",
    api_key: str = "",
    scope: AnalysisScope = "summary",
    user_mode: str = "english_learner",
    base_url: str = None,
) -> Dict:
    """
    Analyze an article for a specific scope (summary, structure, vocabulary).
    """

    # Default to english_learner if mode is invalid or unknown
    if user_mode not in PROMPT_REGISTRY:
        user_mode = "english_learner"
        
    if scope not in PROMPT_REGISTRY[user_mode]:
        raise ValueError("Invalid analysis scope")

    conn = db.get_connection()
    cursor = conn.cursor()
    
    # CHECK PERSISTENCE FIRST
    cursor.execute(
        "SELECT content FROM article_analysis WHERE news_id = ? AND scope = ? AND mode = ?", 
        (news_id, scope, user_mode)
    )
    cached_row = cursor.fetchone()
    if cached_row:
        try:
            # Return cached data if valid JSON
            cached_data = json.loads(cached_row["content"])
            cached_data["scope"] = scope
            conn.close()
            return cached_data
        except json.JSONDecodeError:
            # If cache is corrupted, ignore and re-generate
            pass

    cursor.execute("SELECT title, content_raw, summary FROM news WHERE id = ?", (news_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise ValueError("News article not found")

    title = row["title"]
    content = row["content_raw"] or row["summary"] or ""
    truncated_content = content[:20000]  # Increased limit for better context

    prompt_template = PROMPT_REGISTRY[user_mode][scope]
    prompt = prompt_template.format(title=title, content=truncated_content)
    
    system_prompt = "You are a precise teaching assistant for advanced English learners."
    if user_mode == "ai_learner":
        system_prompt = "You are a technology industry analyst."

    try:
        response_text = await generate_remote(
            provider=provider,
            model_name=model,
            prompt=prompt,
            api_key=api_key,
            max_tokens=4000,
            system_prompt=system_prompt,
            base_url=base_url,
        )

        # Robust JSON extraction
        # Try to find the largest JSON object
        try:
            # First attempt: Standard search
            json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if json_match:
                candidate = json_match.group(0)
                analysis_data = json.loads(candidate)
            else:
                # Fallback: Try to strip markdown
                cleaned = response_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                analysis_data = json.loads(cleaned)
        except json.JSONDecodeError:
             # Second attempt: aggressive cleanup
             try:
                 # Find first { and last }
                 start = response_text.find('{')
                 end = response_text.rfind('}') + 1
                 if start != -1 and end != -1:
                     analysis_data = json.loads(response_text[start:end])
                 else:
                     raise Exception("No JSON found")
             except:
                 return {
                    "scope": scope,
                    "error": "Error parsing AI response.",
                    "raw_response": response_text,
                 }
        
        # Post-process vocabulary to fix phonetics
        if scope == "vocabulary" and "vocabulary" in analysis_data:
            for item in analysis_data["vocabulary"]:
                term = item.get("term")
                if term:
                    reliable_ipa = await get_reliable_phonetic(term)
                    if reliable_ipa:
                        item["pronunciation"] = reliable_ipa

        # PERSISTENCE: Save to article_analysis table
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            
            # Save the full JSON result
            json_str = json.dumps(analysis_data)
            cursor.execute(
                """
                INSERT INTO article_analysis (news_id, scope, mode, content, model_used)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(news_id, scope, mode) DO UPDATE SET
                    content = excluded.content,
                    model_used = excluded.model_used,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (news_id, scope, user_mode, json_str, model)
            )
            
            # Also update summary in main table for legacy support/fast access
            if scope == "summary" and "summary" in analysis_data:
                 new_summary = analysis_data["summary"]
                 if new_summary and isinstance(new_summary, str):
                     cursor.execute("UPDATE news SET summary = ? WHERE id = ?", (new_summary, news_id))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to persist analysis: {e}")
        
        analysis_data["scope"] = scope
        return analysis_data

    except Exception as exc:
        # Only catch non-JSON errors here or re-raise
        if "error" in str(exc): # If we returned an error dict above, we might not be here
             pass
        print(f"Analysis failed: {exc}")
        return {
            "scope": scope,
            "error": f"Analysis failed: {str(exc)}"
        }
