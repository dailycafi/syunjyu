import sqlite3
import os

def main():
    db_path = "/Users/cafi/Workspace/syunjyu/database.sqlite"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    url = "https://openai.com/index/jetbrains-2025/"
    # Try with and without trailing slash
    urls = [url, url.rstrip("/")]
    
    for u in urls:
        print(f"Checking URL: {u}")
        cursor.execute("SELECT id, title, length(content_raw) as len, content_raw FROM news WHERE url = ?", (u,))
        row = cursor.fetchone()
        if row:
            print(f"Found ID: {row['id']}")
            print(f"Title: {row['title']}")
            print(f"Content Length: {row['len']}")
            print(f"Content Preview: {row['content_raw'][:200]}")
            return

    print("URL not found in DB")

if __name__ == "__main__":
    main()
