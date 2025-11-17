# Development Guide

This guide covers development workflows, architecture details, and best practices for the AI Daily project.

## Architecture Overview

### Component Communication

```
┌─────────────────┐
│   Tauri Shell   │
│    (Rust)       │
└────────┬────────┘
         │
         │ Starts/Manages
         ▼
┌─────────────────┐      HTTP API      ┌──────────────────┐
│   Next.js UI    │ ◄─────────────────►│ Python Backend   │
│  (TypeScript)   │                    │   (FastAPI)      │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                                │ SQLite
                                                ▼
                                       ┌──────────────────┐
                                       │ Local Database   │
                                       └──────────────────┘
                                                │
                                                │ HTTP Sync
                                                ▼
                                       ┌──────────────────┐
                                       │  Sync Server     │
                                       │  (Optional)      │
                                       └──────────────────┘
```

### Data Flow

1. **News Fetching**:
   - Triggered by user or schedule
   - Python backend fetches from RSS/web sources
   - Stores in SQLite `news` table
   - Frontend displays via API

2. **Concept Extraction**:
   - User triggers on news article
   - Backend sends content to LLM (local or remote)
   - Parses response for concepts
   - Stores in `concepts` table

3. **Learning Library**:
   - User selects text in frontend
   - Frontend sends to backend API
   - Stored in `phrases` table

4. **Synchronization**:
   - Client collects local changes since last sync
   - Uploads to sync server
   - Downloads server changes
   - Merges using last-write-wins

## Development Workflow

### Setting Up Development Environment

1. **Install Tools**:
   ```bash
   # Node.js (use nvm for version management)
   nvm install 18
   nvm use 18

   # Python (use pyenv for version management)
   pyenv install 3.11
   pyenv local 3.11

   # Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **IDE Setup**:
   - **VSCode** (recommended):
     - Extensions: Rust Analyzer, Python, ESLint, Prettier
     - Recommended settings in `.vscode/settings.json`
   - **PyCharm** for Python development
   - **WebStorm** for frontend development

### Running Components Independently

#### Python Backend Only

```bash
cd python-backend
python app.py
# Visit http://127.0.0.1:8000/docs for API testing
```

#### Frontend Only

```bash
cd web
npm run dev
# Visit http://localhost:3000
```

#### Tauri Only (Desktop Shell)

```bash
npm run tauri dev
```

### Testing

#### Backend Tests

```bash
cd python-backend
pytest tests/
```

To add tests, create `tests/` directory:

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
```

#### Frontend Tests

```bash
cd web
npm test
```

To add tests, use Jest + React Testing Library:

```typescript
// __tests__/NewsCard.test.tsx
import { render, screen } from '@testing-library/react'
import NewsCard from '@/components/NewsCard'

test('renders news title', () => {
  const news = { id: 1, title: 'Test News', ... }
  render(<NewsCard news={news} onToggleStar={jest.fn()} />)
  expect(screen.getByText('Test News')).toBeInTheDocument()
})
```

### Code Style

#### Python

- Follow PEP 8
- Use `black` for formatting:
  ```bash
  pip install black
  black python-backend/
  ```
- Use `mypy` for type checking:
  ```bash
  pip install mypy
  mypy python-backend/
  ```

#### TypeScript/React

- Use ESLint + Prettier
- Configure in `web/.eslintrc.json`
- Format on save in your IDE

#### Rust

- Use `rustfmt`:
  ```bash
  cd src-tauri
  cargo fmt
  ```
- Use `clippy` for linting:
  ```bash
  cargo clippy
  ```

## Database Schema

### Local Database (SQLite)

**settings**
- `key` (TEXT, PK)
- `value` (TEXT)
- `updated_at` (TIMESTAMP)

**news**
- `id` (INTEGER, PK)
- `title` (TEXT)
- `url` (TEXT, UNIQUE)
- `summary` (TEXT)
- `content_raw` (TEXT)
- `source` (TEXT)
- `date` (TEXT)
- `starred` (INTEGER)
- `user_id` (INTEGER, nullable)
- `updated_at` (TIMESTAMP)
- `deleted` (INTEGER)

**concepts**
- `id` (INTEGER, PK)
- `news_id` (INTEGER, FK)
- `term` (TEXT)
- `definition` (TEXT)
- `user_id` (INTEGER, nullable)
- `updated_at` (TIMESTAMP)
- `deleted` (INTEGER)

**phrases**
- `id` (INTEGER, PK)
- `news_id` (INTEGER, FK)
- `text` (TEXT)
- `note` (TEXT, nullable)
- `user_id` (INTEGER, nullable)
- `updated_at` (TIMESTAMP)
- `deleted` (INTEGER)

**news_sources**
- `id` (INTEGER, PK)
- `name` (TEXT)
- `url` (TEXT)
- `rss_url` (TEXT, nullable)
- `enabled` (INTEGER)
- `category` (TEXT)

## API Reference

### Backend Endpoints

**Settings**
- `GET /api/settings` - Get all settings
- `GET /api/settings/{key}` - Get specific setting
- `POST /api/settings` - Update setting

**Models**
- `GET /api/models/local` - List local models
- `GET /api/models/remote` - List remote providers
- `POST /api/chat` - Chat with LLM

**News**
- `GET /api/news` - List news (with filters)
- `GET /api/news/{id}` - Get news detail
- `POST /api/news/{id}/star` - Toggle star
- `POST /api/news/fetch` - Fetch new articles
- `GET /api/news/sources` - List sources

**Concepts**
- `POST /api/concepts/extract` - Extract from article
- `GET /api/concepts` - List concepts

**Phrases**
- `POST /api/phrases` - Save phrase
- `GET /api/phrases` - List phrases

**Export**
- `POST /api/export/pdf` - Export as PDF

**Auth & Sync**
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/sync` - Sync now
- `GET /api/sync/status` - Get sync status

### Sync Server Endpoints

**Auth**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user

**Sync**
- `POST /sync/upload` - Upload changes
- `GET /sync/download?since={timestamp}` - Download changes

## Adding New Features

### Example: Adding a "Favorite Sources" Feature

1. **Database Schema** (`python-backend/db.py`):
   ```python
   cursor.execute("""
       CREATE TABLE IF NOT EXISTS favorite_sources (
           user_id INTEGER,
           source_name TEXT,
           PRIMARY KEY (user_id, source_name)
       )
   """)
   ```

2. **Backend API** (`python-backend/app.py`):
   ```python
   @app.post("/api/favorites/add")
   async def add_favorite(source: str, user_id: int = Depends(get_user_id)):
       # Implementation
       pass

   @app.get("/api/favorites/list")
   async def list_favorites(user_id: int = Depends(get_user_id)):
       # Implementation
       pass
   ```

3. **Frontend API** (`web/src/lib/api.ts`):
   ```typescript
   export async function addFavoriteSource(source: string) {
     return fetchAPI('/api/favorites/add', {
       method: 'POST',
       body: JSON.stringify({ source }),
     })
   }
   ```

4. **Frontend UI** (`web/src/app/news/page.tsx`):
   ```typescript
   const handleFavorite = async (source: string) => {
     await addFavoriteSource(source)
     // Update UI
   }
   ```

## Performance Optimization

### Backend

- Use connection pooling for SQLite (consider `aiosqlite`)
- Cache frequently accessed data
- Implement pagination for large datasets
- Use background tasks for slow operations

### Frontend

- Lazy load images
- Implement virtual scrolling for long lists
- Use React.memo for expensive components
- Debounce search inputs

### Database

- Add indexes for frequently queried columns
- Use EXPLAIN QUERY PLAN to optimize slow queries
- Consider archiving old data

## Security Considerations

### API Keys

- Never commit API keys to git
- Use environment variables
- Encrypt sensitive settings in database

### Sync Server

- Change `SECRET_KEY` in production
- Use HTTPS in production
- Implement rate limiting
- Add input validation

### Desktop App

- Sanitize user inputs
- Validate file paths for PDF export
- Be cautious with shell commands

## Deployment

### Deploying Sync Server

**Option 1: Railway/Render/Heroku**
```bash
# Create Procfile
echo "web: cd sync-server && python server.py" > Procfile
```

**Option 2: Docker**
```dockerfile
# Dockerfile for sync-server
FROM python:3.11-slim
WORKDIR /app
COPY sync-server/requirements.txt .
RUN pip install -r requirements.txt
COPY sync-server/ .
CMD ["python", "server.py"]
```

### Building Desktop App

```bash
# Build for current platform
npm run build

# Build for specific platform (requires cross-compilation setup)
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
```

### Distribution

- Sign your app (required for macOS, recommended for Windows)
- Create update server for auto-updates
- Package with installer for better UX

## Troubleshooting

### Common Issues

**Issue**: Frontend can't connect to backend
- **Solution**: Check if backend is running, verify port numbers

**Issue**: News fetching fails silently
- **Solution**: Check logs, verify network connection, test RSS URLs manually

**Issue**: LLM responses are slow
- **Solution**: Use smaller models, implement streaming, add loading states

**Issue**: Database locked errors
- **Solution**: Use connection pooling, reduce concurrent writes

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Getting Help

- Check existing issues on GitHub
- Review API documentation at `/docs` endpoints
- Read error messages carefully
- Use debugging tools (DevTools, Python debugger, etc.)
