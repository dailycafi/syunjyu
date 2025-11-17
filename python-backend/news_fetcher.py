"""
News fetcher module
Handles fetching AI news from 50+ English sources
"""

import feedparser
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import asyncio
from db import get_connection

# 50+ AI News Sources
NEWS_SOURCES = [
    # Research institutions & labs
    {"id": 1, "name": "OpenAI", "url": "https://openai.com/news", "rss_url": "https://openai.com/news/rss.xml", "category": "research"},
    {"id": 2, "name": "DeepMind", "url": "https://deepmind.google/blog", "rss_url": None, "category": "research"},
    {"id": 3, "name": "Google AI Blog", "url": "https://ai.googleblog.com", "rss_url": "https://ai.googleblog.com/feeds/posts/default", "category": "research"},
    {"id": 4, "name": "Google Research", "url": "https://research.google/blog", "rss_url": "https://research.google/blog/feed/", "category": "research"},
    {"id": 5, "name": "Meta AI", "url": "https://ai.meta.com/blog", "rss_url": "https://ai.meta.com/blog/rss/", "category": "research"},
    {"id": 6, "name": "Microsoft AI Blog", "url": "https://blogs.microsoft.com/ai/", "rss_url": "https://blogs.microsoft.com/ai/feed/", "category": "research"},
    {"id": 7, "name": "Microsoft Research", "url": "https://www.microsoft.com/research/blog/", "rss_url": "https://www.microsoft.com/research/feed/", "category": "research"},
    {"id": 8, "name": "NVIDIA AI Blog", "url": "https://blogs.nvidia.com/tag/ai/", "rss_url": "https://blogs.nvidia.com/tag/ai/feed/", "category": "research"},
    {"id": 9, "name": "Anthropic", "url": "https://www.anthropic.com/news", "rss_url": None, "category": "research"},
    {"id": 10, "name": "Stability AI", "url": "https://stability.ai/news", "rss_url": None, "category": "research"},
    {"id": 11, "name": "Hugging Face", "url": "https://huggingface.co/blog", "rss_url": None, "category": "research"},
    {"id": 12, "name": "Cohere", "url": "https://txt.cohere.com/", "rss_url": None, "category": "research"},
    {"id": 13, "name": "Mistral AI", "url": "https://mistral.ai/news/", "rss_url": None, "category": "research"},
    {"id": 14, "name": "xAI", "url": "https://x.ai/blog", "rss_url": None, "category": "research"},
    {"id": 15, "name": "Scale AI", "url": "https://scale.com/blog", "rss_url": None, "category": "research"},
    {"id": 16, "name": "Runway ML", "url": "https://research.runwayml.com/", "rss_url": None, "category": "research"},
    {"id": 17, "name": "Adept AI", "url": "https://www.adept.ai/blog", "rss_url": None, "category": "research"},
    {"id": 18, "name": "EleutherAI", "url": "https://blog.eleuther.ai/", "rss_url": None, "category": "research"},

    # Academic & preprints
    {"id": 19, "name": "arXiv cs.AI", "url": "https://arxiv.org/list/cs.AI/recent", "rss_url": "https://arxiv.org/rss/cs.AI", "category": "academic"},
    {"id": 20, "name": "arXiv cs.CL", "url": "https://arxiv.org/list/cs.CL/recent", "rss_url": "https://arxiv.org/rss/cs.CL", "category": "academic"},
    {"id": 21, "name": "arXiv stat.ML", "url": "https://arxiv.org/list/stat.ML/recent", "rss_url": "https://arxiv.org/rss/stat.ML", "category": "academic"},
    {"id": 22, "name": "arXiv Blog", "url": "https://blog.arxiv.org", "rss_url": "https://blog.arxiv.org/feed/", "category": "academic"},
    {"id": 23, "name": "Allen AI (AI2)", "url": "https://allenai.org/news", "rss_url": None, "category": "academic"},
    {"id": 24, "name": "MIT CSAIL", "url": "https://www.csail.mit.edu/news", "rss_url": "https://www.csail.mit.edu/rss/news", "category": "academic"},
    {"id": 25, "name": "Stanford HAI", "url": "https://hai.stanford.edu/news", "rss_url": None, "category": "academic"},

    # Tech media AI sections
    {"id": 26, "name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/", "rss_url": "https://venturebeat.com/category/ai/feed/", "category": "media"},
    {"id": 27, "name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/", "rss_url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "media"},
    {"id": 28, "name": "The Verge AI", "url": "https://www.theverge.com/artificial-intelligence", "rss_url": "https://www.theverge.com/rss/artificial-intelligence/index.xml", "category": "media"},
    {"id": 29, "name": "Wired AI", "url": "https://www.wired.com/tag/artificial-intelligence/", "rss_url": "https://www.wired.com/feed/tag/ai/latest/rss", "category": "media"},
    {"id": 30, "name": "MIT Tech Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/", "rss_url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "category": "media"},
    {"id": 31, "name": "NYT AI", "url": "https://www.nytimes.com/topic/subject/artificial-intelligence", "rss_url": None, "category": "media"},
    {"id": 32, "name": "Financial Times AI", "url": "https://www.ft.com/artificial-intelligence", "rss_url": None, "category": "media"},
    {"id": 33, "name": "AI News", "url": "https://www.artificialintelligence-news.com/", "rss_url": "https://www.artificialintelligence-news.com/feed/", "category": "media"},
    {"id": 34, "name": "AI Business", "url": "https://aibusiness.com/", "rss_url": "https://aibusiness.com/rss.xml", "category": "media"},
    {"id": 35, "name": "AI Magazine", "url": "https://aimagazine.com/", "rss_url": None, "category": "media"},

    # Data science & AI blogs
    {"id": 36, "name": "Analytics Vidhya", "url": "https://www.analyticsvidhya.com/blog/category/artificial-intelligence/", "rss_url": "https://www.analyticsvidhya.com/feed/", "category": "blog"},
    {"id": 37, "name": "KDnuggets", "url": "https://www.kdnuggets.com/news/index.html", "rss_url": "https://www.kdnuggets.com/feed", "category": "blog"},
    {"id": 38, "name": "Towards Data Science", "url": "https://towardsdatascience.com/", "rss_url": None, "category": "blog"},
    {"id": 39, "name": "Marktechpost", "url": "https://www.marktechpost.com/category/ai/", "rss_url": "https://www.marktechpost.com/feed/", "category": "blog"},
    {"id": 40, "name": "TopBots", "url": "https://www.topbots.com/", "rss_url": None, "category": "blog"},

    # Newsletters
    {"id": 41, "name": "The Batch (DeepLearning.AI)", "url": "https://www.deeplearning.ai/the-batch/", "rss_url": None, "category": "newsletter"},
    {"id": 42, "name": "Import AI", "url": "https://jack-clark.net/", "rss_url": None, "category": "newsletter"},
    {"id": 43, "name": "Last Week in AI", "url": "https://lastweekin.ai/", "rss_url": None, "category": "newsletter"},
    {"id": 44, "name": "Ben's Bites", "url": "https://www.bensbites.co/", "rss_url": None, "category": "newsletter"},
    {"id": 45, "name": "The Rundown AI", "url": "https://www.therundown.ai/", "rss_url": None, "category": "newsletter"},
    {"id": 46, "name": "There's an AI For That", "url": "https://theresanaiforthat.com/newsletter/", "rss_url": None, "category": "newsletter"},
    {"id": 47, "name": "Inside AI", "url": "https://inside.com/ai", "rss_url": None, "category": "newsletter"},
    {"id": 48, "name": "TLDR AI", "url": "https://tldr.tech/ai", "rss_url": None, "category": "newsletter"},

    # General science & tech
    {"id": 49, "name": "ScienceDaily AI", "url": "https://www.sciencedaily.com/news/computers_math/artificial_intelligence/", "rss_url": "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml", "category": "science"},
    {"id": 50, "name": "IEEE Spectrum AI", "url": "https://spectrum.ieee.org/artificial-intelligence", "rss_url": "https://spectrum.ieee.org/feeds/artificial-intelligence.rss", "category": "science"},
    {"id": 51, "name": "O'Reilly Radar AI", "url": "https://www.oreilly.com/radar/topics/ai/", "rss_url": None, "category": "science"},

    # Additional sources
    {"id": 52, "name": "AI Trends", "url": "https://www.aitrends.com/", "rss_url": "https://www.aitrends.com/feed/", "category": "media"},
    {"id": 53, "name": "Synced", "url": "https://syncedreview.com/", "rss_url": None, "category": "media"},
    {"id": 54, "name": "Papers with Code", "url": "https://paperswithcode.com/", "rss_url": None, "category": "academic"},
]


def init_news_sources_db():
    """Initialize news sources in database"""
    conn = get_connection()
    cursor = conn.cursor()

    for source in NEWS_SOURCES:
        cursor.execute(
            """
            INSERT OR IGNORE INTO news_sources (id, name, url, rss_url, category)
            VALUES (?, ?, ?, ?, ?)
            """,
            (source["id"], source["name"], source["url"], source["rss_url"], source["category"])
        )

    conn.commit()
    conn.close()


async def fetch_rss_feed(source: Dict) -> List[Dict]:
    """
    Fetch news from RSS feed

    Args:
        source: Source dictionary with name, rss_url, etc.

    Returns:
        List of news items
    """
    if not source.get("rss_url"):
        return []

    try:
        # Parse RSS feed (feedparser is synchronous, so run in thread pool)
        feed = await asyncio.to_thread(feedparser.parse, source["rss_url"])

        news_items = []
        for entry in feed.entries[:10]:  # Limit to 10 most recent
            # Extract basic info
            title = entry.get("title", "")
            url = entry.get("link", "")
            summary = entry.get("summary", "") or entry.get("description", "")

            # Parse date
            published = entry.get("published_parsed") or entry.get("updated_parsed")
            date = datetime(*published[:6]).isoformat() if published else datetime.now().isoformat()

            # For full content, we might need to fetch the actual page
            content_raw = summary  # Simplified - could fetch full page

            news_items.append({
                "title": title,
                "url": url,
                "summary": summary[:500],  # Truncate summary
                "content_raw": content_raw,
                "source": source["name"],
                "date": date,
            })

        return news_items

    except Exception as e:
        print(f"Error fetching RSS from {source['name']}: {e}")
        return []


async def fetch_web_scrape(source: Dict) -> List[Dict]:
    """
    Fetch news by scraping web page (for sources without RSS)

    Args:
        source: Source dictionary

    Returns:
        List of news items
    """
    # This is a simplified implementation
    # In production, you'd need custom scraping logic for each source
    # or use a more sophisticated scraping framework
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(source["url"])
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # This is a generic scraper - would need customization per site
            # For demonstration, return empty list
            # In production, implement site-specific parsing
            return []

    except Exception as e:
        print(f"Error scraping {source['name']}: {e}")
        return []


async def fetch_source(source: Dict) -> List[Dict]:
    """
    Fetch news from a single source

    Args:
        source: Source dictionary

    Returns:
        List of news items
    """
    if source.get("rss_url"):
        return await fetch_rss_feed(source)
    else:
        return await fetch_web_scrape(source)


async def fetch_all_news(enabled_only: bool = True) -> Dict[str, List[Dict]]:
    """
    Fetch news from all sources

    Args:
        enabled_only: Only fetch from enabled sources

    Returns:
        Dictionary mapping source names to news items
    """
    # Get enabled sources from database
    conn = get_connection()
    cursor = conn.cursor()

    if enabled_only:
        cursor.execute("SELECT * FROM news_sources WHERE enabled = 1")
    else:
        cursor.execute("SELECT * FROM news_sources")

    sources = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Fetch from all sources concurrently
    tasks = [fetch_source(source) for source in sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Combine results
    all_news = {}
    for source, news_items in zip(sources, results):
        if isinstance(news_items, Exception):
            print(f"Error fetching {source['name']}: {news_items}")
            all_news[source["name"]] = []
        else:
            all_news[source["name"]] = news_items

    return all_news


def save_news_to_db(news_items: List[Dict]):
    """
    Save news items to database

    Args:
        news_items: List of news dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()

    for item in news_items:
        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO news
                (title, url, summary, content_raw, source, date)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    item["title"],
                    item["url"],
                    item["summary"],
                    item["content_raw"],
                    item["source"],
                    item["date"],
                )
            )
        except Exception as e:
            print(f"Error saving news item: {e}")
            continue

    conn.commit()
    conn.close()


if __name__ == "__main__":
    # Test fetching
    init_news_sources_db()
    print(f"Initialized {len(NEWS_SOURCES)} news sources")
