#!/bin/bash
# Start sync server in development mode

echo "Starting AI Daily Sync Server..."

cd "$(dirname "$0")/../sync-server" || exit

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
pip install -q -r requirements.txt

# Initialize database
python db.py

# Start sync server
echo "Sync server starting on http://127.0.0.1:8001"
python server.py
