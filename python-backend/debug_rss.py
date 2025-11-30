import asyncio
import feedparser

def main():
    url = "https://openai.com/news/rss.xml"
    print(f"Parsing RSS: {url}")
    feed = feedparser.parse(url)
    
    for entry in feed.entries:
        if "jetbrains" in entry.link.lower():
            print(f"\nFound Entry: {entry.title}")
            print(f"Link: {entry.link}")
            print(f"Summary: {entry.summary}")
            if hasattr(entry, 'content'):
                print("Content found")
                for c in entry.content:
                    print(f"Content Value: {c.value}")

if __name__ == "__main__":
    main()
