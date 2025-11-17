# AI Daily

A desktop application for aggregating AI news from 50+ English sources, with built-in concept extraction, learning library, and cloud synchronization.

## Features

- **AI News Aggregation**: Automatically fetch news from 50+ AI-related sources
- **Dual Model Support**:
  - Local models (preset, no download required)
  - Remote models (OpenAI, DeepSeek, etc.)
- **Concept Extraction**: Use LLM to extract AI terminology and concepts from articles
- **Learning Library**: Save selected phrases and expressions for later review
- **PDF Export**: Export news, concepts, and phrases as PDF files
- **Cloud Sync**: Optional user accounts with data synchronization across devices
- **Desktop App**: Built with Tauri for native performance

## Tech Stack

- **Desktop Shell**: Tauri (Rust)
- **Frontend**: Next.js (React + TypeScript)
- **Backend**: Python + FastAPI
- **Database**: SQLite (local-first)
- **Sync Server**: Python + FastAPI (optional)

## Project Structure

```
ai-daily/
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   └── lib/           # API client
│   └── package.json
├── python-backend/        # Local FastAPI backend
│   ├── app.py            # Main entry point
│   ├── db.py             # Database operations
│   ├── model_local.py    # Local model interface
│   ├── model_remote.py   # Remote model interface
│   ├── news_fetcher.py   # News aggregation
│   ├── concept_extractor.py
│   ├── pdf_exporter.py
│   └── sync_client.py
├── src-tauri/            # Tauri application
│   ├── src/
│   │   └── main.rs       # Rust entry point
│   └── tauri.conf.json
├── sync-server/          # Optional sync server
│   ├── server.py
│   └── db.py
└── README.md
```

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Rust** (for building Tauri app)
- **npm** or **yarn**

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-daily
```

### 2. Install dependencies

Install all dependencies at once:

```bash
npm install
npm run setup
```

Or install separately:

```bash
# Frontend dependencies
cd web
npm install
cd ..

# Python backend dependencies
cd python-backend
pip install -r requirements.txt
cd ..

# Sync server dependencies (optional)
cd sync-server
pip install -r requirements.txt
cd ..
```

### 3. Initialize the database

```bash
cd python-backend
python db.py
python news_fetcher.py  # Initialize news sources
cd ..
```

## Running in Development Mode

### Option 1: Run the full Tauri app

This will start both the frontend and backend automatically:

```bash
npm run dev
```

### Option 2: Run components separately

**Terminal 1 - Python Backend:**
```bash
cd python-backend
python app.py
# Backend runs on http://127.0.0.1:8000
```

**Terminal 2 - Next.js Frontend:**
```bash
cd web
npm run dev
# Frontend runs on http://localhost:3000
```

**Terminal 3 - Tauri (optional):**
```bash
npm run tauri dev
```

### Option 3: Run sync server (optional)

If you want to test cloud synchronization:

```bash
cd sync-server
python server.py
# Sync server runs on http://127.0.0.1:8001
```

## Building for Production

### Build the desktop application

```bash
npm run build
```

This will:
1. Build the Next.js frontend (static export)
2. Build the Tauri application
3. Create distributable packages in `src-tauri/target/release/bundle/`

### Platform-specific builds

- **Linux**: `.deb`, `.AppImage`
- **Windows**: `.msi`, `.exe`
- **macOS**: `.dmg`, `.app`

## Usage Guide

### 1. Fetching News

1. Go to the **News Feed** page
2. Click **"Fetch News"** to pull latest articles from enabled sources
3. Star articles you want to save for later

### 2. Extracting Concepts

1. Open a news article
2. Click **"Extract Concepts"** button
3. Concepts will be saved to the Concepts Library

### 3. Saving Phrases

1. In any news article, select text with your mouse
2. A dialog will appear
3. Add an optional note and save to Learning Library

### 4. Model Configuration

1. Go to **Settings**
2. Choose between **Local** or **Remote** model
3. For remote models:
   - Select provider (OpenAI, DeepSeek, etc.)
   - Enter your API key

### 5. Exporting PDFs

1. Go to **Settings**
2. Click export buttons for News, Concepts, or Phrases
3. PDF will be downloaded to your computer

### 6. Cloud Synchronization

1. Go to **Account** page
2. Register or login
3. Click **"Sync Now"** to sync your data
4. Enable auto-sync in Settings if desired

## Configuration

### News Sources

News sources are defined in `python-backend/news_fetcher.py`. The app includes 50+ preset sources covering:

- Research labs (OpenAI, DeepMind, Meta AI, etc.)
- Academic preprints (arXiv)
- Tech media (TechCrunch, VentureBeat, etc.)
- AI-focused publications
- Newsletters

You can enable/disable sources in the database `news_sources` table.

### Local Models

Local models are preset in `python-backend/model_local.py`:

- `local_small`: Fast model for quick tasks
- `local_medium`: Balanced model (default)
- `local_large`: Large model for complex tasks

**Note**: These are currently mock implementations. To use real local models:

- Integrate with `llama.cpp` (via `llama-cpp-python`)
- Integrate with `Ollama`
- Use HuggingFace `transformers`

See code comments in `model_local.py` for integration examples.

### Remote Models

Supported providers:

- **OpenAI**: GPT-3.5, GPT-4, etc.
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder

Add your API keys in the Settings page.

## API Documentation

When running the backend, visit:

- Backend API: http://127.0.0.1:8000/docs
- Sync Server API: http://127.0.0.1:8001/docs

## Development Tips

### Hot Reload

- Next.js frontend has hot reload enabled by default
- Python backend: Use `uvicorn` with `--reload` flag (already enabled in `app.py`)
- Tauri: Run `npm run tauri dev` for hot reload

### Debugging

**Frontend:**
- Use browser DevTools
- Check console for errors
- Network tab for API calls

**Backend:**
- Check terminal output for Python errors
- Visit `/docs` endpoint for API testing
- Use `print()` statements or Python debugger

**Tauri:**
- Use `console.log()` in Rust code (outputs to terminal)
- Check `src-tauri/target/` for build errors

### Database Inspection

View the SQLite database:

```bash
sqlite3 database.sqlite
```

Useful commands:
```sql
.tables                    -- List all tables
.schema news              -- Show table schema
SELECT * FROM news;       -- Query data
```

## Troubleshooting

### Python backend won't start

- Check Python version: `python --version` (needs 3.8+)
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use

### Frontend won't connect to backend

- Ensure backend is running on http://127.0.0.1:8000
- Check CORS settings in `python-backend/app.py`
- Verify API URL in `web/src/lib/api.ts`

### Tauri build fails

- Ensure Rust is installed: `rustc --version`
- Install Tauri prerequisites: https://tauri.app/v1/guides/getting-started/prerequisites
- Check `src-tauri/target/` for detailed error logs

### News fetching fails

- Check internet connection
- Some sources may require updated parsers
- Check `news_fetcher.py` logs for specific errors

### Sync not working

- Ensure sync server is running
- Check `sync_client.py` server URL configuration
- Verify you're logged in

## Extending the App

### Adding New News Sources

Edit `python-backend/news_fetcher.py`:

```python
NEWS_SOURCES = [
    # ... existing sources
    {
        "id": 55,
        "name": "New AI Blog",
        "url": "https://example.com/ai",
        "rss_url": "https://example.com/ai/feed",
        "category": "blog"
    },
]
```

### Implementing Real Local Models

Example with llama.cpp:

```python
# In model_local.py
from llama_cpp import Llama

def generate_local(model_name: str, prompt: str, max_tokens: int = 512) -> str:
    model_path = f"./models/{model_name}.gguf"
    llm = Llama(model_path=model_path)
    output = llm(prompt, max_tokens=max_tokens)
    return output['choices'][0]['text']
```

### Custom Concept Extraction Prompts

Edit `CONCEPT_EXTRACTION_PROMPT` in `python-backend/concept_extractor.py`.

### UI Customization

- Modify Tailwind config: `web/tailwind.config.js`
- Edit components in `web/src/components/`
- Customize colors in `web/src/app/globals.css`

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API docs at `/docs` endpoints

## Roadmap

- [ ] Auto-update functionality
- [ ] More LLM provider integrations
- [ ] Advanced search and filtering
- [ ] Mobile companion app
- [ ] Browser extension
- [ ] More export formats (Markdown, JSON)
- [ ] Customizable news source management UI
- [ ] Multi-language support

---

Built with ❤️ using Tauri, Next.js, and Python
