"""
Database module for SQLite operations
Handles all database initialization and table management
"""

import sqlite3
import os
import sys
from typing import Optional
from datetime import datetime
from config import config


def is_bundled_app():
    """Check if running inside a bundled application"""
    # Check for PyInstaller frozen attribute
    if getattr(sys, 'frozen', False):
        return True
    
    # Check if running inside a .app bundle (macOS Tauri)
    current_path = os.path.abspath(__file__)
    if '.app/Contents/' in current_path:
        return True
    
    # Check if running inside Program Files (Windows)
    if sys.platform == 'win32' and 'Program Files' in current_path:
        return True
    
    return False


def get_data_directory():
    """Get the appropriate data directory for the current platform"""
    # Check if running in a bundled app (Tauri/PyInstaller)
    if is_bundled_app():
        # Running in a bundle - use user data directory
        if sys.platform == 'darwin':
            # macOS: ~/Library/Application Support/AI Daily/
            data_dir = os.path.expanduser("~/Library/Application Support/AI Daily")
        elif sys.platform == 'win32':
            # Windows: %APPDATA%/AI Daily/
            data_dir = os.path.join(os.environ.get('APPDATA', ''), 'AI Daily')
        else:
            # Linux: ~/.local/share/AI Daily/
            data_dir = os.path.expanduser("~/.local/share/AI Daily")
    else:
        # Development mode: use project root
        data_dir = os.path.join(os.path.dirname(__file__), "..")
    
    # Ensure directory exists
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def get_database_path():
    """Get the database file path"""
    # Check for explicit DATABASE_PATH environment variable
    env_path = os.environ.get('DATABASE_PATH')
    if env_path and os.path.isabs(env_path):
        return env_path
    
    data_dir = get_data_directory()
    db_filename = config.DATABASE_PATH if hasattr(config, 'DATABASE_PATH') else 'database.sqlite'
    return os.path.join(data_dir, db_filename)


DATABASE_PATH = get_database_path()


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
            is_read INTEGER DEFAULT 0,
            hidden INTEGER DEFAULT 0,
            ai_score INTEGER,
            ai_reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Backfill missing category column for existing installations
    if not column_exists(cursor, "news", "category"):
        cursor.execute("ALTER TABLE news ADD COLUMN category TEXT")
    
    # Backfill new columns
    if not column_exists(cursor, "news", "is_read"):
        cursor.execute("ALTER TABLE news ADD COLUMN is_read INTEGER DEFAULT 0")
    if not column_exists(cursor, "news", "hidden"):
        cursor.execute("ALTER TABLE news ADD COLUMN hidden INTEGER DEFAULT 0")
    if not column_exists(cursor, "news", "ai_score"):
        cursor.execute("ALTER TABLE news ADD COLUMN ai_score INTEGER")
    if not column_exists(cursor, "news", "ai_reason"):
        cursor.execute("ALTER TABLE news ADD COLUMN ai_reason TEXT")

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
            context_before TEXT,
            context_after TEXT,
            start_offset INTEGER,
            end_offset INTEGER,
            color TEXT DEFAULT '#fff3b0',
            type TEXT DEFAULT 'vocabulary',
            user_id INTEGER,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (news_id) REFERENCES news(id)
        )
    """)

    if not column_exists(cursor, "phrases", "context_before"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN context_before TEXT")
    if not column_exists(cursor, "phrases", "context_after"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN context_after TEXT")
    if not column_exists(cursor, "phrases", "start_offset"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN start_offset INTEGER")
    if not column_exists(cursor, "phrases", "end_offset"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN end_offset INTEGER")
    if not column_exists(cursor, "phrases", "color"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN color TEXT DEFAULT '#fff3b0'")
    if not column_exists(cursor, "phrases", "type"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN type TEXT DEFAULT 'vocabulary'")
    if not column_exists(cursor, "phrases", "pronunciation"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN pronunciation TEXT")
    
    # Add difficulty level to phrases for user level tracking
    if not column_exists(cursor, "phrases", "difficulty_level"):
        cursor.execute("ALTER TABLE phrases ADD COLUMN difficulty_level TEXT")  # A1, A2, B1, B2, C1, C2

    # User vocabulary profile table - tracks user's vocabulary level over time
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_vocab_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            estimated_level TEXT DEFAULT 'C1',
            total_words_saved INTEGER DEFAULT 0,
            level_distribution TEXT,
            last_assessed_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Article Analysis Cache table (stores expensive AI results)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS article_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_id INTEGER,
            scope TEXT NOT NULL,
            mode TEXT NOT NULL,
            content TEXT NOT NULL,
            model_used TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (news_id) REFERENCES news(id),
            UNIQUE(news_id, scope, mode)
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

    # Users table for authentication
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Letters comments table (for Ghost blog)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS letters_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id TEXT NOT NULL,
            parent_id INTEGER DEFAULT NULL,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Add parent_id column if not exists (migration for existing tables)
    if not column_exists(cursor, "letters_comments", "parent_id"):
        cursor.execute("ALTER TABLE letters_comments ADD COLUMN parent_id INTEGER DEFAULT NULL")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_letters_comments_post ON letters_comments(post_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_letters_comments_parent ON letters_comments(parent_id)")

    # Letters notifications table (for Ghost blog)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS letters_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient TEXT NOT NULL,
            type TEXT NOT NULL,
            post_id TEXT,
            comment_id INTEGER,
            from_user TEXT NOT NULL,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_letters_notifications_recipient ON letters_notifications(recipient)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_letters_notifications_unread ON letters_notifications(recipient, is_read)")

    # Create indexes for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_date ON news(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_starred ON news(starred)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_user ON news(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_concepts_news ON concepts(news_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_phrases_news ON phrases(news_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_article_analysis_lookup ON article_analysis(news_id, scope, mode)")

    conn.commit()
    conn.close()

    print(f"Database initialized at {DATABASE_PATH}")


def insert_default_settings():
    """Insert default settings if they don't exist"""
    conn = get_connection()
    cursor = conn.cursor()

    defaults = [
        ("model_provider", config.DEFAULT_MODEL_PROVIDER),  # local or remote
        ("local_model_name", config.LOCAL_MODEL_NAME),
        ("remote_provider", config.DEFAULT_REMOTE_PROVIDER),
        ("remote_model_name", config.DEFAULT_MODEL_NAME),
        ("openai_api_key", config.OPENAI_API_KEY),
        ("deepseek_api_key", config.DEEPSEEK_API_KEY),
        ("minimax_api_key", config.MINIMAX_API_KEY),
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
