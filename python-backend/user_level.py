"""
User Vocabulary Level Assessment Module

This module analyzes user's saved vocabulary to estimate their English proficiency level
and dynamically adjusts vocabulary recommendations.

The system uses:
1. CEFR levels (A1, A2, B1, B2, C1, C2) as the proficiency framework
2. User's saved vocabulary history to estimate their current level
3. "i+1" theory - recommend words slightly above user's current level
"""

import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import db


def get_user_saved_vocabulary(user_id: Optional[int] = None, limit: int = 100) -> List[Dict]:
    """
    Get user's recently saved vocabulary items.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT text, note, difficulty_level, created_at 
        FROM phrases 
        WHERE deleted = 0 AND type = 'vocabulary'
    """
    params = []
    
    if user_id is not None:
        query += " AND (user_id = ? OR user_id IS NULL)"
        params.append(user_id)
    
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return results


def get_user_profile(user_id: Optional[int] = None) -> Optional[Dict]:
    """
    Get user's vocabulary profile.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    
    if user_id is not None:
        cursor.execute(
            "SELECT * FROM user_vocab_profile WHERE user_id = ?",
            (user_id,)
        )
    else:
        cursor.execute(
            "SELECT * FROM user_vocab_profile WHERE user_id IS NULL LIMIT 1"
        )
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        profile = dict(row)
        if profile.get("level_distribution"):
            try:
                profile["level_distribution"] = json.loads(profile["level_distribution"])
            except:
                profile["level_distribution"] = {}
        return profile
    return None


def update_user_profile(
    user_id: Optional[int],
    estimated_level: str,
    total_words: int,
    level_distribution: Dict[str, int]
):
    """
    Update or create user's vocabulary profile.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    
    distribution_json = json.dumps(level_distribution)
    now = datetime.now().isoformat()
    
    # Check if profile exists
    if user_id is not None:
        cursor.execute(
            "SELECT id FROM user_vocab_profile WHERE user_id = ?",
            (user_id,)
        )
    else:
        cursor.execute(
            "SELECT id FROM user_vocab_profile WHERE user_id IS NULL"
        )
    
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute(
            """
            UPDATE user_vocab_profile 
            SET estimated_level = ?, total_words_saved = ?, level_distribution = ?,
                last_assessed_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (estimated_level, total_words, distribution_json, now, now, existing["id"])
        )
    else:
        cursor.execute(
            """
            INSERT INTO user_vocab_profile 
            (user_id, estimated_level, total_words_saved, level_distribution, last_assessed_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, estimated_level, total_words, distribution_json, now)
        )
    
    conn.commit()
    conn.close()


def estimate_level_from_distribution(distribution: Dict[str, int]) -> str:
    """
    Estimate user's level based on the distribution of saved vocabulary.
    
    Uses weighted scoring:
    - If user saves mostly C1/C2 words → they're likely C1 level (recommend C2)
    - If user saves mostly B2 words → they're likely B1-B2 level (recommend B2-C1)
    - etc.
    
    We use "i+1" theory: recommend words slightly above current level.
    """
    if not distribution:
        return "C1"  # Default to advanced for new users
    
    total = sum(distribution.values())
    if total == 0:
        return "C1"  # Default to advanced for new users
    
    # Calculate weighted score
    level_scores = {
        "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6
    }
    
    weighted_sum = 0
    for level, count in distribution.items():
        if level in level_scores:
            weighted_sum += level_scores[level] * count
    
    avg_score = weighted_sum / total
    
    # Map score back to level (user's estimated current level)
    # Then we'll recommend i+1
    if avg_score >= 5.5:
        return "C2"  # User is at C2, recommend C2
    elif avg_score >= 4.5:
        return "C1"  # User is at C1, recommend C1-C2
    elif avg_score >= 3.5:
        return "B2"  # User is at B2, recommend B2-C1
    elif avg_score >= 2.5:
        return "B1"  # User is at B1, recommend B1-B2
    elif avg_score >= 1.5:
        return "A2"  # User is at A2, recommend A2-B1
    else:
        return "A1"  # User is at A1, recommend A1-A2


def get_recommended_difficulty_range(user_level: str) -> Tuple[str, str]:
    """
    Get the recommended difficulty range for vocabulary based on user level.
    Uses "i+1" theory - recommend slightly above current level.
    
    Returns: (min_level, max_level)
    """
    level_progression = {
        "A1": ("A2", "B1"),   # Beginner → recommend A2-B1
        "A2": ("B1", "B2"),   # Elementary → recommend B1-B2
        "B1": ("B2", "C1"),   # Intermediate → recommend B2-C1
        "B2": ("B2", "C1"),   # Upper-intermediate → recommend B2-C1
        "C1": ("C1", "C2"),   # Advanced → recommend C1-C2
        "C2": ("C1", "C2"),   # Proficient → recommend C1-C2
    }
    # Default to C1-C2 for unknown users (assume advanced)
    return level_progression.get(user_level, ("C1", "C2"))


def assess_user_level(user_id: Optional[int] = None) -> Dict:
    """
    Assess user's vocabulary level based on their saved words.
    
    Returns assessment result with:
    - estimated_level: User's estimated CEFR level
    - recommended_range: Recommended difficulty range for new vocabulary
    - level_distribution: Breakdown of saved vocabulary by level
    - total_words: Total vocabulary saved
    """
    saved_vocab = get_user_saved_vocabulary(user_id, limit=200)
    
    # Count words by difficulty level
    distribution = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0, "unknown": 0}
    
    for item in saved_vocab:
        level = item.get("difficulty_level")
        if level and level in distribution:
            distribution[level] += 1
        else:
            distribution["unknown"] += 1
    
    # Remove unknown from scoring
    scoring_distribution = {k: v for k, v in distribution.items() if k != "unknown"}
    
    # Estimate level
    estimated_level = estimate_level_from_distribution(scoring_distribution)
    recommended_range = get_recommended_difficulty_range(estimated_level)
    
    # Update profile
    update_user_profile(
        user_id=user_id,
        estimated_level=estimated_level,
        total_words=len(saved_vocab),
        level_distribution=distribution
    )
    
    return {
        "estimated_level": estimated_level,
        "recommended_min": recommended_range[0],
        "recommended_max": recommended_range[1],
        "level_distribution": distribution,
        "total_words_analyzed": len(saved_vocab),
        "assessment_note": get_assessment_note(estimated_level, distribution)
    }


def get_assessment_note(level: str, distribution: Dict[str, int]) -> str:
    """
    Generate a human-readable assessment note.
    """
    total = sum(v for k, v in distribution.items() if k != "unknown")
    
    if total < 10:
        return "We're showing you advanced (C1-C2) vocabulary by default. Save more words to personalize recommendations."
    
    notes = {
        "A1": "You're at beginner level. We'll show you foundational vocabulary to build your base.",
        "A2": "You're at elementary level. We'll introduce more everyday vocabulary with some challenge.",
        "B1": "You're at intermediate level. We'll focus on vocabulary for independent communication.",
        "B2": "You're at upper-intermediate level. We'll show you sophisticated vocabulary for fluent expression.",
        "C1": "You're at advanced level. We'll focus on nuanced, academic, and professional vocabulary.",
        "C2": "You're at proficient level. We'll show you rare, literary, and highly sophisticated vocabulary.",
    }
    
    return notes.get(level, "We'll recommend vocabulary based on your learning history.")


def get_vocabulary_prompt_context(user_id: Optional[int] = None) -> str:
    """
    Generate context for the vocabulary extraction prompt based on user's level.
    This will be injected into the LLM prompt to personalize recommendations.
    """
    profile = get_user_profile(user_id)
    
    if not profile or profile.get("total_words_saved", 0) < 10:
        # New user or insufficient data - DEFAULT TO ADVANCED LEVEL
        # We assume users are advanced learners until proven otherwise
        return """
User Level: Advanced (default for new users)
Recommendation: 
- ONLY select C1 and C2 level vocabulary
- Assume the user is an advanced English learner (graduate level, GRE/GMAT preparation)
- Do NOT include any words below B2 level
- Prioritize rare, sophisticated, literary, and academic vocabulary
- Include challenging technical/business terms with nuanced meanings
- Quality over quantity: better to return 5 excellent C1-C2 words than 10 mediocre B2 words
"""
    
    level = profile.get("estimated_level", "B2")
    min_level, max_level = get_recommended_difficulty_range(level)
    
    return f"""
User Level Assessment:
- Estimated CEFR Level: {level}
- Total Vocabulary Saved: {profile.get('total_words_saved', 0)}
- Recommended Difficulty: {min_level} to {max_level}

Personalization Instructions:
- Target vocabulary at {min_level}-{max_level} level
- The user has demonstrated {level}-level comprehension based on their saved vocabulary
- Apply "i+1" theory: recommend words slightly above their current level to promote growth
- If user is at {level}, prioritize {max_level} words but include some {min_level} for reinforcement
"""


def update_word_difficulty(phrase_id: int, difficulty_level: str):
    """
    Update the difficulty level of a saved phrase.
    Called when we assess a word's difficulty (e.g., via LLM).
    """
    if difficulty_level not in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        return
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE phrases SET difficulty_level = ? WHERE id = ?",
        (difficulty_level, phrase_id)
    )
    
    conn.commit()
    conn.close()
