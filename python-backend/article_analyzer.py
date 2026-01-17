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
from config import config
from user_level import get_vocabulary_prompt_context, update_word_difficulty

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

STRUCTURE_PROMPT_ENGLISH = """You are an expert analyst creating a "Deep Dive" briefing of the article, similar to a NotebookLM audio overview but in structured text.
Your goal is to synthesize the information into a clear, hierarchical knowledge graph that tells the complete story.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "structure": {{
    "root": {{
      "id": "root",
      "label": "The Big Picture",
      "type": "conclusion",
      "summary": "A comprehensive synthesis of the article's core narrative and significance (1 sentence).",
      "children": [
        {{
          "id": "THEME1",
          "label": "Key Insight / Core Argument",
          "type": "argument",
          "summary": "The most important takeaway or central tension in the story.",
          "children": [
            {{
              "id": "EVID1",
              "label": "Evidence / Detail",
              "type": "evidence",
              "summary": "Specific data, quote, or event that supports this insight.",
              "children": []
            }}
          ]
        }},
        {{
          "id": "THEME2",
          "label": "Context & Background",
          "type": "logic",
          "summary": "Why is this happening now? Historical context or market drivers.",
          "children": []
        }},
        {{
          "id": "THEME3",
          "label": "Implications / Future",
          "type": "insight",
          "summary": "What this means for the future, the industry, or society.",
          "children": []
        }}
      ]
    }},
    "takeaways": [
      "Provocative Question: A question to prompt deeper thinking",
      "Strategic Takeaway: A high-level conclusion",
      "Key Connection: How this relates to broader trends"
    ]
  }}
}}

Requirements:
1. **NotebookLM Style**: Go beyond simple summarization. Connect the dots. Identify the "why". Find the tension or the "hook".
2. **Hierarchy**:
   - **Root**: The "Deep Dive" Theme.
   - **Level 1**: The Pillars of the story (The "What", The "Why", The "So What").
   - **Level 2**: Supporting details (Numbers, Quotes, Specific Examples).
3. **Node Content**:
   - **label**: Catchy but clear (e.g., "The Hidden Cost", "The Turning Point").
   - **summary**: Conversational but insightful English.
4. **Takeaways**: Include at least one "Question for Reflection" and one "Strategic Insight".
5. **Strict JSON**: Return ONLY valid JSON. No markdown, no comments.
"""

VOCABULARY_PROMPT_ENGLISH = """You are an expert linguistic consultant helping English learners expand their vocabulary.
Your goal is to extract challenging vocabulary from the article based on the user's proficiency level.

Article Title: {title}
Article Content:
{content}

{user_level_context}

Return JSON:
{{
  "vocabulary": [
    {{
        "term": "Word or phrase",
        "definition": "Clear, concise definition in English",
        "example": "Example sentence from the article showing usage",
        "difficulty": "CEFR level (B1/B2/C1/C2)"
    }},
    ...
  ]
}}

**SELECTION RULES:**

1. **Difficulty levels:**
   - B1: Common but not basic (achieve, significant)
   - B2: Upper-intermediate (comprehensive, innovative)
   - C1: Advanced (ubiquitous, paradigm, albeit)
   - C2: Near-native (obfuscate, perspicacious)

2. **Include:**
   - Academic/literary words
   - Business vocabulary
   - Idiomatic expressions
   - Words with nuanced meanings

3. **Exclude:**
   - Words below user's level
   - Common everyday words
   - Proper nouns, brand names

4. **Quantity:** 6-10 high-quality terms only.

Return ONLY valid JSON.
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

STRUCTURE_PROMPT_TECH = """You are a systems architect and tech strategist creating a structured Deep Dive of a technical article.
Visualize the information as a clear logical tree, separating the core concept from its components and implications.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "structure": {{
    "root": {{
      "id": "root",
      "label": "Technical Thesis",
      "type": "conclusion",
      "summary": "The main technology or strategic thesis of the article (The 'Big Idea').",
      "children": [
        {{
          "id": "COMP1",
          "label": "Core Component / Driver",
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
        }},
        {{
          "id": "IMPL1",
          "label": "Strategic Implication",
          "type": "logic",
          "summary": "Why this matters to the broader ecosystem.",
          "children": []
        }}
      ]
    }},
    "takeaways": [
      "Critical technical insight: ...",
      "Market opportunity/risk: ...",
      "Unresolved technical challenge: ..."
    ]
  }}
}}

Requirements:
1. **Clear Logical Flow**: Organize as Problem -> Solution -> Details, or Technology -> Features -> Impact.
2. **Structure**:
   - **Root**: The central subject / thesis.
   - **Level 1**: 3-5 Major Components, Steps, or Strategic Pillars.
   - **Level 2**: Supporting details, specs, or data for each component.
   - **Avoid Clutter**: Limit depth to 3 levels.
3. **Node Content**:
   - **label**: Precise and technical (2-6 words).
   - **summary**: High information density (15-30 words).
   - **type**: Use "conclusion" for Root. "argument" for major components. "evidence", "logic", or "insight" for details.
4. **Takeaways**: 2-3 sentences synthesizing the "So What?" for a technical audience. Include risks or opportunities.
5. **Strict JSON**: Return ONLY valid JSON.
"""

VOCABULARY_PROMPT_TECH = """You are a senior AI/ML researcher extracting advanced technical concepts.

Article Title: {title}
Article Content:
{content}

Return JSON:
{{
  "vocabulary": [
    {{
        "term": "Technical Term / Concept",
        "definition": "Precise technical definition (IEEE/ACM style)",
        "example": "Technical sentence showing usage in context",
        "category": "architecture | algorithm | methodology | concept | metric | protocol"
    }},
    ...
  ]
}}

**SELECTION RULES:**

1. **ONLY advanced concepts** for senior engineers/researchers.

2. **REJECT basic terms:**
   - Generic: API, SDK, database, server, framework, library
   - Basic ML: model, training, accuracy, neural network, deep learning
   - DevOps: Docker, Kubernetes, CI/CD, cloud
   - Buzzwords: scalable, enterprise, platform, ecosystem

3. **PREFER:**
   - Novel patterns: mixture of experts, sparse attention
   - Cutting-edge: DPO, constitutional AI, chain-of-thought
   - Advanced: emergent capabilities, mechanistic interpretability
   - Metrics: perplexity, BLEU, calibration error
   - Methods: ablation study, scaling laws, RLHF

4. **Quantity:** 5-8 truly advanced terms. Fewer is better than padding with basics.

Return ONLY valid JSON.
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
    provider: str = None,
    model: str = None,
    api_key: str = "",
    scope: AnalysisScope = "summary",
    user_mode: str = "english_learner",
    base_url: str = None,
    force: bool = False,
) -> Dict:
    # Use config defaults if not provided
    if provider is None:
        provider = config.DEFAULT_REMOTE_PROVIDER
    if model is None:
        model = config.DEFAULT_MODEL_NAME
    """
    Analyze an article for a specific scope (summary, structure, vocabulary).
    If force=True, skip cache and re-analyze.
    """

    # Default to english_learner if mode is invalid or unknown
    if user_mode not in PROMPT_REGISTRY:
        user_mode = "english_learner"
        
    if scope not in PROMPT_REGISTRY[user_mode]:
        raise ValueError("Invalid analysis scope")

    conn = db.get_connection()
    cursor = conn.cursor()
    
    # CHECK PERSISTENCE FIRST (skip if force=True)
    if not force:
        cursor.execute(
            "SELECT content FROM article_analysis WHERE news_id = ? AND scope = ? AND mode = ?", 
            (news_id, scope, user_mode)
        )
        cached_row = cursor.fetchone()
    else:
        cached_row = None
        print(f"Force re-analyze for news {news_id}, scope={scope}")
        
    if cached_row:
        try:
            # Return cached data if valid JSON
            cached_data = json.loads(cached_row["content"])
            cached_data["scope"] = scope
            
            # Validate vocabulary against content to filter hallucinations
            if scope == "vocabulary" and "vocabulary" in cached_data:
                cursor.execute("SELECT content_raw, summary FROM news WHERE id = ?", (news_id,))
                news_row = cursor.fetchone()
                if news_row:
                    content_check = (news_row["content_raw"] or news_row["summary"] or "").lower()
                    valid_vocab = []
                    for item in cached_data["vocabulary"]:
                        term = item.get("term")
                        # Filter out terms not found in content (case-insensitive substring match)
                        if term and term.lower() in content_check:
                            valid_vocab.append(item)
                    cached_data["vocabulary"] = valid_vocab

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
    
    # For vocabulary scope in English learner mode, inject user level context
    if scope == "vocabulary" and user_mode == "english_learner":
        user_id = db.get_setting("user_id")
        user_id = int(user_id) if user_id and str(user_id).isdigit() else None
        user_level_context = get_vocabulary_prompt_context(user_id)
        prompt = prompt_template.format(
            title=title, 
            content=truncated_content,
            user_level_context=user_level_context
        )
    else:
        # For other prompts, use empty context or default
        prompt = prompt_template.format(
            title=title, 
            content=truncated_content,
            user_level_context=""  # Will be ignored if not in template
        )
    
    system_prompt = "You are a precise teaching assistant for English learners, adapting to their proficiency level."
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
        
        # Debug: Log raw response
        print(f"[DEBUG] Raw AI response (first 500 chars): {response_text[:500] if response_text else 'EMPTY'}")

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
        except json.JSONDecodeError as e:
             print(f"[DEBUG] JSON parse error: {e}")
             # Second attempt: aggressive cleanup
             try:
                 # Find first { and last }
                 start = response_text.find('{')
                 end = response_text.rfind('}') + 1
                 if start != -1 and end != 0:
                     json_candidate = response_text[start:end]
                     print(f"[DEBUG] Trying to parse: {json_candidate[:300]}...")
                     analysis_data = json.loads(json_candidate)
                 else:
                     raise Exception("No JSON found in response")
             except Exception as parse_err:
                 print(f"[DEBUG] Final parse attempt failed: {parse_err}")
                 print(f"[DEBUG] Full response: {response_text}")
                 return {
                    "scope": scope,
                    "error": "Error parsing AI response.",
                    "raw_response": response_text[:2000] if response_text else "Empty response",
                 }
        
        # Post-process vocabulary: only validate existence, phonetics fetched on-demand
        if scope == "vocabulary" and "vocabulary" in analysis_data:
            valid_vocab = []
            content_lower = content.lower()

            for item in analysis_data["vocabulary"]:
                term = item.get("term")
                if not term:
                    continue
                
                # Validate term exists in content (prevent hallucinations)
                if term.lower() not in content_lower:
                    continue
                
                # Keep LLM-generated pronunciation as fallback, will be fetched on-demand if needed
                valid_vocab.append(item)
            
            analysis_data["vocabulary"] = valid_vocab

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
