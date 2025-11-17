"""
Database module for SQLite operations
Handles all database initialization and table management
"""

import sqlite3
import os
from typing import Optional
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "database.sqlite")


def get_connection():
    """Get a connection to the SQLite database"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    return conn


def column_exists(cursor, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a SQLite table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return any(row["name"] == column_name for row in cursor.fetchall())


def init_database():
    """Initialize database with all required tables"""
    conn = get_connection()
    cursor = conn.cursor()

    # Settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # News table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            summary TEXT,
            content_raw TEXT,
            source TEXT NOT NULL,
            category TEXT,
            date TEXT NOT NULL,
            starred INTEGER DEFAULT 0,
            user_id INTEGER,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Backfill missing category column for existing installations
    if not column_exists(cursor, "news", "category"):
        cursor.execute("ALTER TABLE news ADD COLUMN category TEXT")

    # Concepts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS concepts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_id INTEGER,
            term TEXT NOT NULL,
            definition TEXT,
            user_id INTEGER,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (news_id) REFERENCES news(id)
        )
    """)

    # Phrases (learning library) table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS phrases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_id INTEGER,
            text TEXT NOT NULL,
            note TEXT,
            user_id INTEGER,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (news_id) REFERENCES news(id)
        )
    """)

    # News sources configuration table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            rss_url TEXT,
            enabled INTEGER DEFAULT 1,
            category TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_date ON news(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_starred ON news(starred)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_user ON news(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_concepts_news ON concepts(news_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_phrases_news ON phrases(news_id)")

    conn.commit()
    conn.close()

    print(f"Database initialized at {DATABASE_PATH}")


def insert_default_settings():
    """Insert default settings if they don't exist"""
    conn = get_connection()
    cursor = conn.cursor()

    defaults = [
        ("model_provider", "local"),  # local or remote
        ("local_model_name", "local_medium"),
        ("remote_provider", "openai"),
        ("remote_model_name", "gpt-3.5-turbo"),
        ("openai_api_key", ""),
        ("deepseek_api_key", ""),
        ("user_id", ""),
        ("auth_token", ""),
        ("last_sync_time", ""),
        ("auto_sync_enabled", "false"),
    ]

    for key, value in defaults:
        cursor.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )

    conn.commit()
    conn.close()


def get_setting(key: str) -> Optional[str]:
    """Get a setting value by key"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else None


def set_setting(key: str, value: str):
    """Set a setting value"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        """,
        (key, value)
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    # Initialize database when run directly
    init_database()
    insert_default_settings()
    print("Database setup complete!")
