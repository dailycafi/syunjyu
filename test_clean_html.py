
import asyncio
import os
import sys
from bs4 import BeautifulSoup

# Add python-backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'python-backend'))

from news_fetcher import clean_html

# Sample text with junk content mentioned by user
sample_html = """
<p>OpenAI employees in San Francisco were told to stay inside...</p>
<p>"Our information indicates that [name] from StopAI..."</p>
<p>Just before 11 am, San Francisco police received a 911 call...</p>
<p>| Got a Tip? |</p>
<p>|---|</p>
<p>| Are you a current or former tech worker... |</p>
<p>WIRED reached out to the man in question...</p>
"""

def test_clean_html():
    print("Original HTML:")
    print(sample_html)
    print("-" * 20)
    cleaned = clean_html(sample_html)
    print("Cleaned Content:")
    print(cleaned)

if __name__ == "__main__":
    test_clean_html()

