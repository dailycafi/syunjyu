# Quick Start Guide

Get AI Daily up and running in 5 minutes!

## Prerequisites

Make sure you have these installed:

- **Node.js 18+**: `node --version`
- **Python 3.8+**: `python3 --version`
- **Rust**: `rustc --version` (for building desktop app)

## Quick Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-daily

# Run setup script (Linux/Mac)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or install manually
npm install
npm run setup
```

### 2. Initialize Database

```bash
cd python-backend
python db.py
python news_fetcher.py
cd ..
```

### 3. Start the App

**Option A: Full Desktop App (Recommended)**

```bash
npm run dev
```

This starts:
- ✓ Python backend (port 8500)
- ✓ Next.js frontend (port 3500)
- ✓ Tauri desktop app

**Option B: Web Version Only**

Terminal 1 - Backend:
```bash
cd python-backend
python app.py
```

Terminal 2 - Frontend:
```bash
cd web
npm run dev
```

Visit: http://localhost:3500

## First Steps

### 1. Fetch Some News

1. Open the app
2. Click **"Fetch News"** button
3. Wait for articles to load (may take 1-2 minutes first time)

### 2. Try Starring an Article

1. Find an interesting article
2. Click the **⭐ star icon**
3. Filter by "Starred" to see saved articles

### 3. Extract Concepts

1. Click on any article to view details
2. Click **"Extract Concepts"** button
3. Go to **Concepts** page to see extracted terms

### 4. Save a Learning Phrase

1. In article detail, select some text with your mouse
2. A dialog appears - click **"Save"**
3. Check **Learning Library** page

### 5. Configure Model (Optional)

1. Go to **Settings**
2. Choose **Local** or **Remote** model
3. For remote: Add API key (OpenAI, DeepSeek, etc.)

## What's Next?

- **Export PDF**: Go to Settings → Export Data
- **Cloud Sync**: Go to Account → Register/Login
- **Customize Sources**: Edit `python-backend/news_fetcher.py`

## Troubleshooting

### Backend won't start
```bash
# Check if port 8500 is in use
lsof -i :8500

# Install Python dependencies
cd python-backend
pip install -r requirements.txt
```

### Frontend won't start
```bash
# Install Node dependencies
cd web
npm install

# Clear cache
rm -rf .next
npm run dev
```

### No news showing up
1. Click "Fetch News" button
2. Wait 1-2 minutes for initial fetch
3. Check browser console for errors
4. Check backend logs in terminal

### Tauri build fails
```bash
# Install Tauri prerequisites
# Visit: https://tauri.app/v1/guides/getting-started/prerequisites

# For Ubuntu/Debian:
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## Need Help?

- 📖 Full docs: See [README.md](./README.md)
- 🔧 Development guide: See [DEVELOPMENT.md](./DEVELOPMENT.md)
- 🐛 Issues: Check terminal/console for error messages
- 📡 API docs: Visit http://127.0.0.1:8000/docs when backend is running

## Tips

- **Performance**: First news fetch is slow. Subsequent fetches are faster.
- **Local Models**: Currently mock implementations. See README for real integration.
- **API Keys**: Store in Settings, not in code files.
- **Database**: Located at `database.sqlite` in project root.

---

Happy learning! 🚀
