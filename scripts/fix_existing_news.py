import sqlite3
import os
import sys
from bs4 import BeautifulSoup

# 定位数据库文件
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database.sqlite')

def clean_html(html_content):
    """
    移除 HTML 标签，只保留纯文本。
    逻辑与 news_fetcher.py 中的保持一致。
    """
    if not html_content:
        return ""
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 移除干扰元素
        for tag in soup(['script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header', 'aside', 'iframe']):
            tag.decompose()
            
        # 获取纯文本，段落之间保留换行
        text = soup.get_text(separator="\n\n", strip=True)
        return text
    except Exception as e:
        print(f"Error cleaning HTML: {e}")
        return html_content

def fix_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at: {DB_PATH}")
        return

    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 获取所有新闻
    cursor.execute("SELECT id, title, summary, content_raw FROM news")
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} articles. Checking for HTML tags...")
    
    updated_count = 0
    
    for row in rows:
        news_id, title, summary, content = row
        
        # 清洗摘要
        new_summary = clean_html(summary)
        # 清洗内容
        new_content = clean_html(content)
        
        # 检查是否有变化
        if new_summary != summary or new_content != content:
            cursor.execute(
                "UPDATE news SET summary = ?, content_raw = ? WHERE id = ?",
                (new_summary, new_content, news_id)
            )
            updated_count += 1
            if updated_count % 10 == 0:
                print(f"Processed {updated_count} articles...")

    conn.commit()
    conn.close()
    
    print("-" * 40)
    print(f"✅ Done! Fixed {updated_count} articles.")
    print("Please restart your iOS app to see the changes (pull to refresh).")

if __name__ == "__main__":
    # 确保安装了 beautifulsoup4
    try:
        import bs4
    except ImportError:
        print("Error: beautifulsoup4 is not installed.")
        print("Run: pip install beautifulsoup4")
        sys.exit(1)
        
    fix_database()

