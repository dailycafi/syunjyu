"""
Database module for sync server
"""

import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "sync_database.sqlite")


def get_connection():
    """Get a connection to the SQLite database"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize sync server database"""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Synced news table (for tracking starred status)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            summary TEXT,
            content_raw TEXT,
            source TEXT NOT NULL,
            date TEXT NOT NULL,
            starred INTEGER DEFAULT 0,
            user_id INTEGER NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Synced concepts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS concepts (
            id INTEGER PRIMARY KEY,
            news_id INTEGER,
            term TEXT NOT NULL,
            definition TEXT,
            user_id INTEGER NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Synced phrases table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS phrases (
            id INTEGER PRIMARY KEY,
            news_id INTEGER,
            text TEXT NOT NULL,
            note TEXT,
            user_id INTEGER NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_user ON news(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_updated ON news(updated_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_concepts_user ON concepts(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_phrases_user ON phrases(user_id)")

    conn.commit()
    conn.close()

    print(f"Sync server database initialized at {DATABASE_PATH}")


if __name__ == "__main__":
    init_database()
