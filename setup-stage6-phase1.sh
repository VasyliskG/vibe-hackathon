#!/bin/bash
# setup-stage6-phase1.sh - Automated setup script for Stage 6 Phase 1

set -e  # Exit on error

echo "=========================================="
echo "🚀 Stage 6 Phase 1 - Automated Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️  npm not found. Please install npm${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm -v) found"

# Step 1: Create .env file
echo ""
echo -e "${BLUE}Step 1: Creating .env configuration${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}⚠️  Please edit .env with your database credentials${NC}"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Step 2: Install dependencies
echo ""
echo -e "${BLUE}Step 2: Installing dependencies${NC}"

npm install

echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 3: Check PostgreSQL
echo ""
echo -e "${BLUE}Step 3: Checking PostgreSQL${NC}"

if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL client found"

    # Try to connect to PostgreSQL
    if psql -U postgres -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL server is running"

        # Create database if it doesn't exist
        if psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'vibe_delivery'" | grep -q 1; then
            echo -e "${GREEN}✓${NC} Database 'vibe_delivery' already exists"
        else
            echo -e "${YELLOW}Creating database 'vibe_delivery'...${NC}"
            psql -U postgres -c "CREATE DATABASE vibe_delivery;"
            echo -e "${GREEN}✓${NC} Database created"
        fi

        # Run migrations
        echo -e "${YELLOW}Running database schema...${NC}"
        psql -U postgres -d vibe_delivery -f src/db/schemas.sql
        echo -e "${GREEN}✓${NC} Database schema applied"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL server not running. Please start it manually:${NC}"
        echo "   - macOS: brew services start postgresql"
        echo "   - Linux: sudo service postgresql start"
        echo "   - Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Please install PostgreSQL client${NC}"
fi

# Step 4: Check Redis (optional)
echo ""
echo -e "${BLUE}Step 4: Checking Redis (optional)${NC}"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is running"
    else
        echo -e "${YELLOW}⚠️  Redis client found but server not running${NC}"
        echo "   Start Redis: redis-server"
    fi
else
    echo -e "${YELLOW}⚠️  Redis not found (optional for Phase 1)${NC}"
    echo "   To install Redis:"
    echo "   - macOS: brew install redis"
    echo "   - Linux: sudo apt-get install redis-server"
    echo "   - Docker: docker run --name redis -p 6379:6379 -d redis:7"
fi

# Step 5: Verify setup
echo ""
echo -e "${BLUE}Step 5: Verifying setup${NC}"

# Check if test database schema is correct
if psql -U postgres -d vibe_delivery -c "\dt" | grep -q "orders"; then
    echo -e "${GREEN}✓${NC} Database tables verified"
else
    echo -e "${YELLOW}⚠️  Database tables not found. Please run:${NC}"
    echo "   psql -U postgres -d vibe_delivery -f src/db/schemas.sql"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Stage 6 Phase 1 Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your database credentials (if needed)"
echo "2. Start the server: npm start"
echo "3. Test endpoints: curl http://localhost:3000/health"
echo ""
echo "Documentation:"
echo "- Quick Start: ./STAGE6_PHASE1_QUICKSTART.md"
echo "- Full Guide: ./STAGE6_PHASE1.md"
echo "- Summary: ./STAGE6_PHASE1_SUMMARY.md"
echo ""
echo "Run tests: npm test"
echo "=========================================="

