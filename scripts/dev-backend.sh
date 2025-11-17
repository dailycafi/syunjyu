#!/bin/bash
# Start Python backend in development mode

echo "Starting AI Daily Python Backend..."

cd "$(dirname "$0")/../python-backend" || exit

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

# Start backend
echo "Backend starting on http://127.0.0.1:8000"
python app.py
