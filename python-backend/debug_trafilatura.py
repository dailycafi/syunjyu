import asyncio
import os
import sys
import trafilatura
from curl_cffi.requests import AsyncSession

async def main():
    url = "https://openai.com/index/jetbrains-2025/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    async with AsyncSession(impersonate="chrome110", headers=headers) as client:
        response = await client.get(url)
        html = response.text
        print(f"HTML Length: {len(html)}")
        
        text = trafilatura.extract(html, include_comments=False, include_tables=True, include_formatting=True, deduplicate=True, url=url)
        
        if text:
            print(f"Trafilatura extraction successful. Length: {len(text)}")
            print(f"Preview: {text[:200]}")
        else:
            print("Trafilatura extraction FAILED (returned None)")

if __name__ == "__main__":
    asyncio.run(main())
