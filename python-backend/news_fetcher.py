"""
News fetcher module
Handles fetching AI news from 50+ English sources
Uses Trafilatura for intelligent extraction with LLM fallback
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional

import feedparser
import httpx
import trafilatura
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from db import get_connection, get_setting
from model_remote import RemoteModelError, generate_remote
from config import config

# 50+ AI News Sources (Same list as before)
NEWS_SOURCES = [
    # Research institutions & labs
    {"id": 1, "name": "OpenAI", "url": "https://openai.com/news", "rss_url": "https://openai.com/news/rss.xml", "category": "research"},
    {"id": 2, "name": "DeepMind", "url": "https://deepmind.google/blog", "rss_url": None, "category": "research"},
    {"id": 3, "name": "Google AI Blog", "url": "https://blog.research.google/", "rss_url": "https://blog.research.google/feeds/posts/default", "category": "research"},
    {"id": 4, "name": "Google Research", "url": "https://research.google/blog", "rss_url": "https://research.google/blog/feed/", "category": "research"},
    {"id": 5, "name": "Meta AI", "url": "https://ai.meta.com/blog", "rss_url": "https://ai.meta.com/blog/rss/", "category": "research"},
    {"id": 6, "name": "Microsoft AI Blog", "url": "https://news.microsoft.com/source/topics/ai/", "rss_url": "https://blogs.microsoft.com/ai/feed/", "category": "research"},
    {"id": 7, "name": "Microsoft Research", "url": "https://www.microsoft.com/en-us/research/blog/", "rss_url": "https://www.microsoft.com/research/feed/", "category": "research"},
    # NVIDIA AI Blog has 404, disabled
    # {"id": 8, "name": "NVIDIA AI Blog", "url": "https://blogs.nvidia.com/tag/ai/", "rss_url": "https://blogs.nvidia.com/tag/ai/feed/", "category": "research"},
    {"id": 9, "name": "Anthropic", "url": "https://www.anthropic.com/news", "rss_url": None, "category": "research"},
    {"id": 10, "name": "Stability AI", "url": "https://stability.ai/news", "rss_url": None, "category": "research"},
    {"id": 11, "name": "Hugging Face", "url": "https://huggingface.co/blog", "rss_url": None, "category": "research"},
    {"id": 12, "name": "Cohere", "url": "https://cohere.com/blog", "rss_url": None, "category": "research"},
    {"id": 13, "name": "Mistral AI", "url": "https://mistral.ai/news/", "rss_url": None, "category": "research"},
    {"id": 14, "name": "xAI", "url": "https://x.ai/blog", "rss_url": None, "category": "research"},
    {"id": 15, "name": "Scale AI", "url": "https://scale.com/blog", "rss_url": None, "category": "research"},
    {"id": 16, "name": "Runway ML", "url": "https://runwayml.com/research", "rss_url": None, "category": "research"},
    # Adept AI returns 403, disabled
    # {"id": 17, "name": "Adept AI", "url": "https://www.adept.ai/blog", "rss_url": None, "category": "research"},
    {"id": 18, "name": "EleutherAI", "url": "https://blog.eleuther.ai/", "rss_url": None, "category": "research"},

    # Academic & preprints
    {"id": 19, "name": "arXiv cs.AI", "url": "https://arxiv.org/list/cs.AI/recent", "rss_url": "https://arxiv.org/rss/cs.AI", "category": "academic"},
    {"id": 20, "name": "arXiv cs.CL", "url": "https://arxiv.org/list/cs.CL/recent", "rss_url": "https://arxiv.org/rss/cs.CL", "category": "academic"},
    {"id": 21, "name": "arXiv stat.ML", "url": "https://arxiv.org/list/stat.ML/recent", "rss_url": "https://arxiv.org/rss/stat.ML", "category": "academic"},
    {"id": 22, "name": "arXiv Blog", "url": "https://blog.arxiv.org", "rss_url": "https://blog.arxiv.org/feed/", "category": "academic"},
    # Allen AI returns 404, disabled
    # {"id": 23, "name": "Allen AI (AI2)", "url": "https://allenai.org/news", "rss_url": None, "category": "academic"},
    {"id": 24, "name": "MIT CSAIL", "url": "https://www.csail.mit.edu/news", "rss_url": "https://www.csail.mit.edu/rss/news", "category": "academic"},
    {"id": 25, "name": "Stanford HAI", "url": "https://hai.stanford.edu/news", "rss_url": None, "category": "academic"},

    # Tech media AI sections
    # VentureBeat returns 429 rate limit, disabled
    # {"id": 26, "name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/", "rss_url": "https://venturebeat.com/category/ai/feed/", "category": "media"},
    {"id": 27, "name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/", "rss_url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "media"},
    # The Verge AI returns 404, disabled
    # {"id": 28, "name": "The Verge AI", "url": "https://www.theverge.com/artificial-intelligence", "rss_url": "https://www.theverge.com/rss/artificial-intelligence/index.xml", "category": "media"},
    {"id": 29, "name": "Wired AI", "url": "https://www.wired.com/tag/artificial-intelligence/", "rss_url": "https://www.wired.com/feed/tag/ai/latest/rss", "category": "media"},
    {"id": 30, "name": "MIT Tech Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/", "rss_url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "category": "media"},
    {"id": 31, "name": "NYT AI", "url": "https://www.nytimes.com/spotlight/artificial-intelligence", "rss_url": None, "category": "media"},
    {"id": 32, "name": "Financial Times AI", "url": "https://www.ft.com/artificial-intelligence", "rss_url": None, "category": "media"},
    {"id": 33, "name": "AI News", "url": "https://www.artificialintelligence-news.com/", "rss_url": "https://www.artificialintelligence-news.com/feed/", "category": "media"},
    {"id": 34, "name": "AI Business", "url": "https://aibusiness.com/", "rss_url": "https://aibusiness.com/rss.xml", "category": "media"},
    {"id": 35, "name": "AI Magazine", "url": "https://aimagazine.com/", "rss_url": None, "category": "media"},

    # Data science & AI blogs
    {"id": 36, "name": "Analytics Vidhya", "url": "https://www.analyticsvidhya.com/blog/category/artificial-intelligence/", "rss_url": "https://www.analyticsvidhya.com/feed/", "category": "blog"},
    {"id": 37, "name": "KDnuggets", "url": "https://www.kdnuggets.com/news/index.html", "rss_url": "https://www.kdnuggets.com/feed", "category": "blog"},
    {"id": 38, "name": "Towards Data Science", "url": "https://towardsdatascience.com/", "rss_url": None, "category": "blog"},
    # Marktechpost returns 404, disabled
    # {"id": 39, "name": "Marktechpost", "url": "https://www.marktechpost.com/category/ai/", "rss_url": "https://www.marktechpost.com/feed/", "category": "blog"},
    {"id": 40, "name": "TopBots", "url": "https://www.topbots.com/", "rss_url": None, "category": "blog"},

    # Newsletters
    {"id": 41, "name": "The Batch (DeepLearning.AI)", "url": "https://www.deeplearning.ai/the-batch/", "rss_url": None, "category": "newsletter"},
    {"id": 42, "name": "Import AI", "url": "https://jack-clark.net/", "rss_url": None, "category": "newsletter"},
    {"id": 43, "name": "Last Week in AI", "url": "https://lastweekin.ai/", "rss_url": None, "category": "newsletter"},
    {"id": 44, "name": "Ben's Bites", "url": "https://bensbites.com/", "rss_url": None, "category": "newsletter"},
    {"id": 45, "name": "The Rundown AI", "url": "https://www.therundown.ai/", "rss_url": None, "category": "newsletter"},
    # There's an AI For That returns 403, disabled
    # {"id": 46, "name": "There's an AI For That", "url": "https://theresanaiforthat.com/newsletter/", "rss_url": None, "category": "newsletter"},
    {"id": 47, "name": "Inside AI", "url": "https://inside.com/ai", "rss_url": None, "category": "newsletter"},
    {"id": 48, "name": "TLDR AI", "url": "https://tldr.tech/ai", "rss_url": None, "category": "newsletter"},

    # General science & tech
    {"id": 49, "name": "ScienceDaily AI", "url": "https://www.sciencedaily.com/news/computers_math/artificial_intelligence/", "rss_url": "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml", "category": "science"},
    {"id": 50, "name": "IEEE Spectrum AI", "url": "https://spectrum.ieee.org/topic/artificial-intelligence/", "rss_url": "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss", "category": "science"},
    # O'Reilly Radar AI returns 404, disabled
    # {"id": 51, "name": "O'Reilly Radar AI", "url": "https://www.oreilly.com/radar/topics/ai/", "rss_url": None, "category": "science"},

    # Additional sources
    # AI Trends returns 503, disabled
    # {"id": 52, "name": "AI Trends", "url": "https://www.aitrends.com/", "rss_url": "https://www.aitrends.com/feed/", "category": "media"},
    {"id": 53, "name": "Synced", "url": "https://syncedreview.com/", "rss_url": None, "category": "media"},
    # Papers with Code now redirects to HuggingFace
    {"id": 54, "name": "Papers with Code", "url": "https://huggingface.co/papers/trending", "rss_url": None, "category": "academic"},
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


LLM_INPUT_LIMIT = 30000


import re as regex_module


def clean_extracted_text(text: str) -> str:
    """
    Post-process extracted text to remove common junk patterns that LLM might miss.
    This includes "Got a Tip?" blocks, separator lines, and other boilerplate.
    """
    if not text:
        return text
    
    # Patterns to remove (case-insensitive where appropriate)
    junk_patterns = [
        # "Got a Tip?" style blocks with surrounding content
        r'\|\s*Got a Tip\?\s*\|?\s*\|?-+\|?\s*\|[^|]+\|?',
        # Simpler "Got a Tip?" lines
        r'^\s*\|?\s*Got a Tip\?\s*\|?\s*$',
        r'^\s*\|?\s*Got a tip\?\s*\|?\s*$',
        # Separator lines like |---| or |---|---|
        r'^\s*\|[-\s|]+\|\s*$',
        # Lines that are just pipes with content asking for tips/contact
        r'^\s*\|[^|]*(?:contact|tip|reporter|signal|securely)[^|]*\|?\s*$',
        # "Are you a current or former..." style lines
        r'^.*Are you a current or former.*$',
        # Contact reporter lines
        r'^.*[Cc]ontact the reporter[s]? securely.*$',
        # Lines ending with lone pipe
        r'\s*\|\s*$',
        # Lines starting with lone pipe (not tables)
        r'^\s*\|\s+(?![^\n]*\|)',
    ]
    
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        should_remove = False
        for pattern in junk_patterns:
            if regex_module.search(pattern, line, regex_module.IGNORECASE | regex_module.MULTILINE):
                should_remove = True
                break
        
        if not should_remove:
            # Also clean trailing pipes from lines
            line = regex_module.sub(r'\s*\|\s*$', '', line)
            cleaned_lines.append(line)
    
    result = '\n'.join(cleaned_lines)
    
    # Remove multiple consecutive blank lines
    result = regex_module.sub(r'\n{3,}', '\n\n', result)
    
    return result.strip()


async def extract_content_with_llm(url: str, html_content: str, candidate_text: Optional[str]) -> Optional[str]:
    """
    Use MiniMax LLM to clean and extract main content from HTML.
    Always returns plain text paragraphs, removing menus/ads.
    """
    provider = get_setting("analysis_provider") or config.DEFAULT_ANALYSIS_PROVIDER
    model = get_setting("analysis_model") or config.DEFAULT_MODEL_NAME
    api_key = get_setting("minimax_api_key") or config.MINIMAX_API_KEY

    if provider != "minimax":
        provider = "minimax"

    if not api_key:
        return None

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 1. Remove obvious non-content tags
        for tag in soup(['script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header', 'aside', 'iframe', 'form', 'object', 'button', 'input', 'select', 'textarea']):
            tag.decompose()

        # 2. Remove elements by class/id patterns usually associated with junk
        # Enhanced list of junk keywords
            junk_patterns = [
            'menu', 'nav', 'footer', 'header', 'ad-', 'ads', 'banner', 'sidebar', 
            'popup', 'cookie', 'subscribe', 'share', 'social', 'comment', 'related', 
            'promo', 'newsletter', 'login', 'signup', 'register', 'breadcrumb', 'author-bio',
            'recommended', 'read-more', 'also-like', 'trending', 'popular'
        ]
        
        for tag in soup.find_all(attrs={"class": lambda x: x and any(y in str(x).lower() for y in junk_patterns)}):
            tag.decompose()
        
        for tag in soup.find_all(attrs={"id": lambda x: x and any(y in str(x).lower() for y in junk_patterns)}):
            tag.decompose()

        # 3. Prioritize <article> or <main> if available to reduce token usage
        main_content = soup.find('article') or soup.find('main') or soup.body or soup
        
        # Convert to string and truncate if necessary
        body_html = str(main_content)
        
        if len(body_html) > LLM_INPUT_LIMIT:
            # If too long, try to find the largest block of text or just truncate carefully
            # A simple heuristic: keep the first LLM_INPUT_LIMIT chars
            body_html = body_html[:LLM_INPUT_LIMIT] + "...(truncated)"

        candidate = (candidate_text or "").strip()

        prompt = f"""
You are an expert web content extractor. Extract the clean article text from HTML.

URL: {url}
HTML Fragment: 
{body_html}

CRITICAL FORMATTING RULES:

1. **INLINE ALL TEXT**: Never break sentences across lines. Link text, bold text, italic text must flow inline with surrounding text.
   - BAD: "demand could reach\n106 gigawatts\nby 2035"  
   - GOOD: "demand could reach 106 gigawatts by 2035"

2. **CODE BLOCKS**: Preserve code exactly as-is in triple backticks. Keep all code on proper lines:
   - BAD: ```python\nfrom openai import OpenAI\nclient = OpenAI()\n```
   - GOOD: 
```python
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {{"role": "system", "content": "You are helpful."}},
        {{"role": "user", "content": "Hello"}}
    ]
)
```

3. **PARAGRAPHS**: Each paragraph is ONE continuous block. Separate paragraphs with blank lines.

4. **REMOVE**: Navigation, ads, footers, "subscribe", "read more", author bios, social buttons.

5. **TABLES**: Convert to Markdown tables with | and |---|.

6. **OUTPUT**: Just the article text. No commentary.

Extract:
"""

        refined = await generate_remote(
            provider=provider,
            model_name=model,
            prompt=prompt,
            api_key=api_key,
            max_tokens=4000, # Increased for longer articles
            temperature=0.1, # Lower temperature for more deterministic extraction
            system_prompt="You are a precise article extraction engine."
        )
        
        result = refined.strip()
        if "ERROR: No content" in result:
            return None
        
        # Post-process: Clean up common junk patterns that LLM might miss
        result = clean_extracted_text(result)
            
        return result
        
    except RemoteModelError as err:
        print(f"[LLM Extraction] MiniMax error: {err}")
        return None
    except Exception as e:
        print(f"[LLM Extraction] Unexpected error: {e}")
        return None


async def fetch_url_content(url: str) -> str:
    """
    Fetch full text content from a URL using Trafilatura with mandatory MiniMax refinement.
    Includes headers and better error handling.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with AsyncSession(impersonate="chrome110", headers=headers) as client:
            response = await client.get(url, timeout=30)
            # curl_cffi doesn't always raise on status, check manually or use internal check if available
            if response.status_code >= 400:
                response.raise_for_status()
            html = response.text

        # 1. Trafilatura Extraction (First pass)
        # Removed favor_precision=True to improve recall. Added deduplicate=True.
        trafilatura_text = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,
            include_formatting=True, # Changed to True to preserve potential code blocks for LLM
            deduplicate=True,
            url=url 
        )

        # 2. LLM Refinement (Quality pass)
        # We almost always want to use LLM to clean up the "junk" that Trafilatura might leave (like ads in the middle of text)
        # or to fix structure.
        refined = await extract_content_with_llm(url, html, trafilatura_text)
        
        if refined and len(refined) > 300: # Ensure we got a substantial result
            return refined

        # 3. Fallbacks
        if trafilatura_text and len(trafilatura_text) > 100:
            return trafilatura_text

        # Last resort: Soup
        soup = BeautifulSoup(html, "html.parser")
        # Basic cleanup
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            tag.decompose()
        return soup.get_text(separator="\n\n", strip=True)

    except Exception as e:
        print(f"Error fetching content from {url}: {e}")
        return ""


def clean_html(html_content: str) -> str:
    """Remove HTML tags and return clean text"""
    if not html_content:
        return ""
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        # Remove script/style elements
        for script in soup(["script", "style", "iframe", "noscript"]):
            script.decompose()
            
        # Also remove common ad containers here if possible
        for tag in soup.find_all(attrs={"class": lambda x: x and any(y in str(x).lower() for y in ['ad-', 'ads', 'banner'])}):
            tag.decompose()

        # Remove empty paragraphs or specific junk patterns often found in scraped text
        # e.g., "Got a Tip?", separator lines like "|---|"
        # Also handle raw text nodes that might not be in <p> tags if the soup parsing allows
        for element in soup.find_all(["p", "div", "span"]):
            text = element.get_text(strip=True)
            if not text:
                # Don't decompose div/span blindly as they might contain valid p tags
                if element.name == "p":
                    element.decompose()
                continue
            
            # Check for common junk patterns in paragraphs
            # Using lower() for case-insensitive matching on some patterns
            text_lower = text.lower()
            
            junk_phrases = [
                "| got a tip? |", "|---|", "are you a current or former tech worker",
                "contact the reporters securely", "advertisement", "sponsored content",
                "got a tip?", "you may also like", "recommended for you", "related stories",
                "read next", "more from", "sign up for"
            ]
            
            # Exact match for short junk lines
            if len(text) < 50 and (text.strip() == "|---|" or "got a tip?" in text_lower):
                 element.decompose()
                 continue

            if any(phrase in text_lower for phrase in junk_phrases):
                element.decompose()
            
        return soup.get_text(separator="\n\n", strip=True)
    except Exception:
        return html_content


async def fetch_rss_feed(source: Dict) -> List[Dict]:
    """
    Fetch news from RSS feed
    """
    if not source.get("rss_url"):
        return []

    try:
        # Parse RSS feed
        feed = await asyncio.to_thread(feedparser.parse, source["rss_url"])

        news_items = []
        for entry in feed.entries[:10]:  # Limit to 10 most recent
            title = entry.get("title", "")
            url = entry.get("link", "")
            
            # Get raw summary and content
            summary_raw = entry.get("summary", "") or entry.get("description", "")
            
            content_encoded = ""
            if "content" in entry:
                for content in entry.content:
                    content_encoded += content.value
            
            if not content_encoded:
                 content_encoded = summary_raw

            # Clean summary immediately to remove <p> tags
            summary_clean = clean_html(summary_raw)

            # Clean initial content for length check
            content_clean = clean_html(content_encoded)

            # Parse date
            published = entry.get("published_parsed") or entry.get("updated_parsed")
            date = datetime(*published[:6]).isoformat() if published else datetime.now().isoformat()

            # Smart Fetch Logic:
            # If content is short (< 2000 chars) OR it's known truncated source, fetch full text
            should_fetch = len(content_clean) < 2000 or "techcrunch" in url or "wired" in url
            
            # Also fetch if content seems to be just the summary repeated
            if len(content_clean) < len(summary_clean) + 100:
                should_fetch = True

            final_content = content_clean
            
            if should_fetch and url:
                 print(f"Fetching full content for: {title[:30]}...")
                 full_text = await fetch_url_content(url)
                 # If we got a good full text, use it
                 if len(full_text) > len(content_clean):
                     final_content = full_text
                 elif not content_clean and full_text:
                     final_content = full_text

            news_items.append({
                "title": title,
                "url": url,
                "summary": summary_clean[:500],
                "content_raw": final_content,
                "source": source["name"],
                "category": source.get("category"),
                "date": date,
            })

        return news_items

    except Exception as e:
        print(f"Error fetching RSS from {source['name']}: {e}")
        return []


async def fetch_web_scrape(source: Dict) -> List[Dict]:
    # Simplified for now
    return []


async def fetch_source(source: Dict) -> List[Dict]:
    if source.get("rss_url"):
        return await fetch_rss_feed(source)
    else:
        return await fetch_web_scrape(source)


async def fetch_all_news(enabled_only: bool = True) -> Dict[str, List[Dict]]:
    conn = get_connection()
    cursor = conn.cursor()

    if enabled_only:
        cursor.execute("SELECT * FROM news_sources WHERE enabled = 1")
    else:
        cursor.execute("SELECT * FROM news_sources")

    sources = [dict(row) for row in cursor.fetchall()]
    conn.close()

    tasks = [fetch_source(source) for source in sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_news = {}
    for source, news_items in zip(sources, results):
        if isinstance(news_items, Exception):
            print(f"Error fetching {source['name']}: {news_items}")
            all_news[source["name"]] = []
        else:
            all_news[source["name"]] = news_items

    return all_news


def save_news_to_db(news_items: List[Dict]):
    conn = get_connection()
    cursor = conn.cursor()

    for item in news_items:
        try:
            category = item.get("category")
            if not category:
                cursor.execute(
                    "SELECT category FROM news_sources WHERE name = ? LIMIT 1",
                    (item["source"],)
                )
                row = cursor.fetchone()
                category = row["category"] if row else None

            cursor.execute(
                """
                INSERT OR IGNORE INTO news 
                (title, url, summary, content_raw, source, category, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["title"],
                    item["url"],
                    item["summary"],
                    item["content_raw"],
                    item["source"],
                    category,
                    item["date"],
                )
            )
        except Exception as e:
            print(f"Error saving news item: {e}")
            continue

    conn.commit()
    conn.close()


async def refetch_news_item(news_id: int) -> Optional[str]:
    """
    Force re-fetch content for a specific news item
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT url FROM news WHERE id = ?", (news_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise ValueError("News item not found")
        
    url = row["url"]
    conn.close() # Close connection before await
    
    # Fetch fresh content
    print(f"Refetching content for news {news_id}: {url}")
    try:
        new_content = await fetch_url_content(url)
    except Exception as e:
        print(f"Error refetching content: {e}")
        return None
    
    if new_content:
        # Update DB
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE news SET content_raw = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_content, news_id)
        )
        conn.commit()
        conn.close()
        return new_content
    
    return None


if __name__ == "__main__":
    init_news_sources_db()
    print(f"Initialized {len(NEWS_SOURCES)} news sources")
