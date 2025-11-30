import asyncio
import os
import sys

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

from news_fetcher import refetch_news_item

async def main():
    news_id = 1663
    print(f"Refetching news ID: {news_id}")
    
    try:
        content = await refetch_news_item(news_id)
        if content:
            print("Refetch SUCCESS!")
            print(f"New content length: {len(content)}")
        else:
            print("Refetch FAILED.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
