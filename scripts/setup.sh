#!/bin/bash
# Setup script for AI Daily project

echo "==================================="
echo "AI Daily - Project Setup"
echo "==================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3 is required but not installed."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: Rust is required but not installed."; exit 1; }

echo "✓ Prerequisites check passed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd web && npm install
cd ..
echo "✓ Frontend dependencies installed"
echo ""

# Setup Python backend
echo "Setting up Python backend..."
cd python-backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate and install
source venv/bin/activate
pip install -q -r requirements.txt

# Initialize database
python db.py
python news_fetcher.py

deactivate
cd ..
echo "✓ Python backend setup complete"
echo ""

# Setup sync server
echo "Setting up sync server..."
cd sync-server

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate and install
source venv/bin/activate
pip install -q -r requirements.txt

# Initialize database
python db.py

deactivate
cd ..
echo "✓ Sync server setup complete"
echo ""

echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "To start development:"
echo "  npm run dev              # Run full app with Tauri"
echo "  npm run dev:web          # Run frontend only"
echo "  npm run dev:backend      # Run backend only"
echo ""
echo "Or run scripts manually:"
echo "  ./scripts/dev-backend.sh       # Start Python backend"
echo "  ./scripts/dev-sync-server.sh   # Start sync server"
echo ""
echo "Visit http://localhost:3500 for the web UI"
echo "Visit http://127.0.0.1:8500/docs for API docs"
echo ""
