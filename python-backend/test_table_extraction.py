import asyncio
import os
import sys

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

from news_fetcher import fetch_url_content

async def main():
    url = "https://www.microsoft.com/en-us/research/blog/reducing-privacy-leaks-in-ai-two-approaches-to-contextual-integrity/"
    print(f"Refetching Microsoft blog post to test table extraction: {url}")
    
    try:
        content = await fetch_url_content(url)
        print("\n--- Extracted Content Start ---\n")
        print(content)
        print("\n--- Extracted Content End ---\n")
        
        if "|---" in content or "| ---" in content:
            print("SUCCESS: Markdown table structure found.")
        else:
            print("WARNING: No markdown table structure found in output.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
