#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down PoliCRM...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting PoliCRM...${NC}"

# Check for virtual environment
if [ -d ".venv" ]; then
    echo -e "${GREEN}Activating virtual environment...${NC}"
    source .venv/bin/activate
else
    echo "Warning: No .venv directory found. Running with system Python."
fi

# Check if uvicorn is installed
if ! command -v uvicorn &> /dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Build Frontend (Vite)
echo -e "${BLUE}Building Frontend (Vite)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi
npm run build
cd ..

# Print access info
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}   PoliCRM Dashboard: http://localhost:8000${NC}"
echo -e "${GREEN}   API Docs:          http://localhost:8000/docs${NC}"
echo -e "${GREEN}==================================================${NC}"

# Start Backend (FastAPI)
echo -e "${BLUE}Starting Backend (FastAPI)...${NC}"
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
