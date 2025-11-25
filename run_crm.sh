#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting AEC Political Party CRM...${NC}"

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

# Print access info
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}   CRM Dashboard: http://localhost:8000${NC}"
echo -e "${GREEN}   API Docs:      http://localhost:8000/docs${NC}"
echo -e "${GREEN}==================================================${NC}"

# Run the application
# Using src.api.main:app because we are in the root directory
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
