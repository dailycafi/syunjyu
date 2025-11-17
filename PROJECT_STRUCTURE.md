# Project Structure

Complete overview of the AI Daily project structure and file organization.

## Directory Tree

```
ai-daily/
├── web/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/                 # App Router (Next.js 13+)
│   │   │   ├── layout.tsx       # Root layout with sidebar
│   │   │   ├── page.tsx         # Home page (news feed)
│   │   │   ├── globals.css      # Global styles
│   │   │   ├── news/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # News detail page
│   │   │   ├── concepts/
│   │   │   │   └── page.tsx     # Concepts library page
│   │   │   ├── phrases/
│   │   │   │   └── page.tsx     # Learning library page
│   │   │   ├── settings/
│   │   │   │   └── page.tsx     # Settings page
│   │   │   └── account/
│   │   │       └── page.tsx     # Account & sync page
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Main navigation sidebar
│   │   │   └── NewsCard.tsx     # News item card component
│   │   ├── lib/
│   │   │   └── api.ts           # API client for backend
│   │   └── store/               # State management (future)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── python-backend/               # Python FastAPI Backend
│   ├── app.py                   # Main FastAPI application
│   ├── db.py                    # Database operations
│   ├── model_local.py           # Local LLM interface
│   ├── model_remote.py          # Remote LLM API client
│   ├── news_fetcher.py          # News aggregation (50+ sources)
│   ├── concept_extractor.py     # LLM-based concept extraction
│   ├── pdf_exporter.py          # PDF generation
│   ├── sync_client.py           # Sync with remote server
│   ├── models/                  # Pydantic models (future)
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment variables template
│
├── src-tauri/                   # Tauri Desktop Application
│   ├── src/
│   │   └── main.rs             # Rust entry point
│   ├── icons/                  # Application icons
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri configuration
│   └── build.rs                # Build script
│
├── sync-server/                 # Cloud Sync Server (Optional)
│   ├── server.py               # FastAPI sync server
│   ├── db.py                   # Sync server database
│   └── requirements.txt        # Python dependencies
│
├── scripts/                     # Helper scripts
│   ├── setup.sh                # Full project setup
│   ├── dev-backend.sh          # Start backend only
│   └── dev-sync-server.sh      # Start sync server only
│
├── database.sqlite              # Local SQLite database (generated)
├── package.json                 # Root package.json
├── .gitignore                  # Git ignore rules
├── README.md                    # Main documentation
├── QUICKSTART.md               # Quick start guide
├── DEVELOPMENT.md              # Development guide
└── PROJECT_STRUCTURE.md        # This file
```

## Key Files Explained

### Frontend (Next.js)

| File | Purpose |
|------|---------|
| `web/src/app/layout.tsx` | Root layout, includes Sidebar navigation |
| `web/src/app/page.tsx` | News feed with filtering and starring |
| `web/src/app/news/[id]/page.tsx` | Article detail with text selection for learning library |
| `web/src/lib/api.ts` | All API calls to Python backend |
| `web/src/components/Sidebar.tsx` | Navigation component |
| `web/tailwind.config.js` | Tailwind CSS configuration |

### Backend (Python)

| File | Purpose |
|------|---------|
| `app.py` | FastAPI app with all HTTP endpoints |
| `db.py` | SQLite database initialization and queries |
| `model_local.py` | Interface for local LLM models (preset) |
| `model_remote.py` | Client for remote APIs (OpenAI, DeepSeek) |
| `news_fetcher.py` | Aggregates news from 50+ sources |
| `concept_extractor.py` | Uses LLM to extract AI concepts |
| `pdf_exporter.py` | Generates PDF exports using ReportLab |
| `sync_client.py` | Client for syncing with cloud server |

### Tauri (Desktop)

| File | Purpose |
|------|---------|
| `src-tauri/src/main.rs` | Tauri entry, manages Python subprocess |
| `src-tauri/tauri.conf.json` | App configuration, permissions, build settings |
| `src-tauri/Cargo.toml` | Rust dependencies |

### Sync Server

| File | Purpose |
|------|---------|
| `sync-server/server.py` | Authentication and sync endpoints |
| `sync-server/db.py` | Cloud database for user data |

## Data Flow

### News Fetching Flow

```
User clicks "Fetch News"
    ↓
Frontend: POST /api/news/fetch
    ↓
Backend: news_fetcher.fetch_all_news()
    ↓
Backend: Fetches from 50+ RSS/web sources
    ↓
Backend: Saves to SQLite news table
    ↓
Frontend: GET /api/news (reload)
    ↓
Display in news feed
```

### Concept Extraction Flow

```
User clicks "Extract Concepts"
    ↓
Frontend: POST /api/concepts/extract?news_id=X
    ↓
Backend: Get article content from DB
    ↓
Backend: Send to LLM (local or remote)
    ↓
Backend: Parse JSON response
    ↓
Backend: Save concepts to DB
    ↓
Return concepts to frontend
```

### Sync Flow

```
User clicks "Sync Now"
    ↓
Frontend: POST /api/sync
    ↓
Backend: sync_client.sync()
    ↓
Backend: Collect local changes (updated_at > last_sync)
    ↓
Backend: POST /sync/upload to sync server
    ↓
Backend: GET /sync/download from sync server
    ↓
Backend: Merge server changes to local DB
    ↓
Backend: Update last_sync_time
    ↓
Return sync status
```

## Database Schema

### Local Database (database.sqlite)

**settings** - Application settings
- `key` (TEXT, PK) - Setting name
- `value` (TEXT) - Setting value
- `updated_at` (TIMESTAMP) - Last update

**news** - News articles
- `id` (INTEGER, PK)
- `title` (TEXT) - Article title
- `url` (TEXT, UNIQUE) - Article URL
- `summary` (TEXT) - Brief summary
- `content_raw` (TEXT) - Full content
- `source` (TEXT) - Source name
- `date` (TEXT) - Publication date
- `starred` (INTEGER) - User starred (0 or 1)
- `user_id` (INTEGER) - Associated user
- `updated_at` (TIMESTAMP) - Last update
- `deleted` (INTEGER) - Soft delete flag
- `created_at` (TIMESTAMP) - Creation time

**concepts** - Extracted AI concepts
- `id` (INTEGER, PK)
- `news_id` (INTEGER, FK) - Source article
- `term` (TEXT) - Concept name
- `definition` (TEXT) - Concept definition
- `user_id` (INTEGER) - Associated user
- `updated_at` (TIMESTAMP) - Last update
- `deleted` (INTEGER) - Soft delete flag
- `created_at` (TIMESTAMP) - Creation time

**phrases** - Learning library
- `id` (INTEGER, PK)
- `news_id` (INTEGER, FK) - Source article
- `text` (TEXT) - Saved phrase
- `note` (TEXT) - User note
- `user_id` (INTEGER) - Associated user
- `updated_at` (TIMESTAMP) - Last update
- `deleted` (INTEGER) - Soft delete flag
- `created_at` (TIMESTAMP) - Creation time

**news_sources** - News source configuration
- `id` (INTEGER, PK)
- `name` (TEXT) - Source name
- `url` (TEXT) - Source URL
- `rss_url` (TEXT) - RSS feed URL
- `enabled` (INTEGER) - Enable/disable (0 or 1)
- `category` (TEXT) - Source category

### Sync Server Database (sync_database.sqlite)

**users** - User accounts
- `id` (INTEGER, PK)
- `email` (TEXT, UNIQUE)
- `password_hash` (TEXT)
- `created_at` (TIMESTAMP)

**news**, **concepts**, **phrases** - Same schema as local, with user_id

## API Endpoints

### Backend API (Port 8000)

**Settings**
- `GET /api/settings` - Get all settings
- `GET /api/settings/{key}` - Get one setting
- `POST /api/settings` - Update setting

**Models**
- `GET /api/models/local` - List local models
- `GET /api/models/remote` - List remote providers
- `POST /api/chat` - Chat with LLM

**News**
- `GET /api/news` - List news articles
- `GET /api/news/{id}` - Get article detail
- `POST /api/news/{id}/star` - Toggle star
- `POST /api/news/fetch` - Fetch new articles
- `GET /api/news/sources` - List sources

**Concepts**
- `POST /api/concepts/extract?news_id=X` - Extract concepts
- `GET /api/concepts` - List concepts

**Phrases**
- `POST /api/phrases` - Save phrase
- `GET /api/phrases` - List phrases

**Export**
- `POST /api/export/pdf?type=X` - Export as PDF

**Auth & Sync**
- `POST /api/auth/register` - Register account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/sync` - Perform sync
- `GET /api/sync/status` - Get sync status

### Sync Server API (Port 8001)

**Auth**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user

**Sync**
- `POST /sync/upload` - Upload local changes
- `GET /sync/download?since=X` - Download server changes

## Technology Stack Details

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Shell | Tauri 1.5 (Rust) | Native desktop app wrapper |
| Frontend Framework | Next.js 14 (React 18) | UI and routing |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| Backend Framework | FastAPI 0.109 | REST API server |
| Runtime | Python 3.8+ | Backend logic |
| Database | SQLite 3 | Local-first data storage |
| PDF Generation | ReportLab 4.0 | PDF export |
| HTTP Client | httpx | Async HTTP requests |
| Feed Parser | feedparser 6.0 | RSS feed parsing |
| Auth | python-jose + passlib | JWT tokens & password hashing |

## Build Outputs

### Development
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://127.0.0.1:8000`
- Tauri opens native window loading frontend

### Production Build
```
src-tauri/target/release/bundle/
├── deb/              # Ubuntu/Debian package
│   └── ai-daily_0.1.0_amd64.deb
├── appimage/         # Linux AppImage
│   └── ai-daily_0.1.0_amd64.AppImage
├── dmg/              # macOS disk image
│   └── ai-daily_0.1.0_x64.dmg
└── msi/              # Windows installer
    └── ai-daily_0.1.0_x64.msi
```

## Extension Points

### Adding News Sources
Edit `NEWS_SOURCES` list in `python-backend/news_fetcher.py`

### Adding LLM Providers
1. Add to `PROVIDERS` in `python-backend/model_remote.py`
2. Implement API integration in `generate_remote()`
3. Add API key field in settings

### Adding Export Formats
1. Create new function in `python-backend/pdf_exporter.py`
2. Add endpoint in `app.py`
3. Add button in `web/src/app/settings/page.tsx`

### Adding Sync Tables
1. Add table schema in `db.py`
2. Include in sync upload/download logic in `sync_client.py`
3. Update sync server schema in `sync-server/db.py`

## Performance Considerations

- **News Fetching**: Runs in background to avoid blocking UI
- **Database**: Indexed on frequently queried columns
- **Frontend**: Uses React Server Components where possible
- **Sync**: Incremental sync based on timestamps

## Security Notes

- API keys stored in local database (encrypted in production)
- Sync uses JWT tokens (change SECRET_KEY in production)
- File system access restricted via Tauri allowlist
- CORS enabled for localhost development (restrict in production)

---

For more details, see [README.md](./README.md) and [DEVELOPMENT.md](./DEVELOPMENT.md)
