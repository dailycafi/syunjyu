import asyncio
import os
import sys

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

from news_fetcher import fetch_url_content, clean_html
from db import get_setting

async def main():
    url = "https://openai.com/index/jetbrains-2025/"
    print(f"Fetching URL: {url}")
    
    try:
        content = await fetch_url_content(url)
        print("\n--- Extracted Content Start ---\n")
        print(content)
        print("\n--- Extracted Content End ---\n")
        
        if content:
            print(f"Content Length: {len(content)}")
        else:
            print("No content extracted.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
