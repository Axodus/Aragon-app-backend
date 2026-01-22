#!/usr/bin/env bash

# GitIssuer - Interactive GitHub Issue Manager Wrapper
# Usage: ./gitissuer.sh add --file ./ISSUE_UPDATES.md

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check gh CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Run the gitissuer script
echo -e "${BLUE}🚀 GitIssuer - Issue Manager${NC}"
node "$SCRIPT_DIR/gitissuer.js" "$@"
