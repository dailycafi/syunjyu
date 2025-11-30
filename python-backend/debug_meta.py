import asyncio
import os
import sys
from bs4 import BeautifulSoup
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
        print(f"First 500 chars: {html[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
