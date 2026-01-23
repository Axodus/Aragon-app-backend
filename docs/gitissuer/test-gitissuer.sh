#!/bin/bash
# GitIssuer - Quick Test & Validation Script

set -e

echo "=================================================="
echo "GitIssuer - Quick Validation Test"
echo "=================================================="
echo ""

# Test 1: Node.js
echo "🔍 Test 1: Node.js Installation"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
else
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

# Test 2: GitHub CLI
echo ""
echo "🔍 Test 2: GitHub CLI Installation"
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version)
    echo "✅ GitHub CLI found: $GH_VERSION"
else
    echo "❌ GitHub CLI not found. Install from https://cli.github.com"
    exit 1
fi

# Test 3: GitHub Authentication
echo ""
echo "🔍 Test 3: GitHub Authentication"
if gh auth status &> /dev/null; then
    echo "✅ GitHub CLI authenticated"
    gh auth status | head -n 1
else
    echo "⚠️  GitHub CLI not authenticated"
    echo "Run: gh auth login"
fi

# Test 4: gitissuer.js Syntax
echo ""
echo "🔍 Test 4: GitIssuer.js Syntax Check"
if node -c scripts/gitissuer.js 2>/dev/null; then
    echo "✅ gitissuer.js syntax valid"
else
    echo "❌ gitissuer.js has syntax errors"
    exit 1
fi

# Test 5: ISSUE_UPDATES.md Exists
echo ""
echo "🔍 Test 5: ISSUE_UPDATES.md File"
if [ -f "ISSUE_UPDATES.md" ]; then
    ISSUE_COUNT=$(grep -c "^## " ISSUE_UPDATES.md || echo "0")
    echo "✅ ISSUE_UPDATES.md found ($ISSUE_COUNT sections)"
else
    echo "⚠️  ISSUE_UPDATES.md not found in current directory"
fi

# Test 6: Help Command
echo ""
echo "🔍 Test 6: GitIssuer Help"
echo "Running: node scripts/gitissuer.js help"
echo ""
node scripts/gitissuer.js help

# Summary
echo ""
echo "=================================================="
echo "✅ All Tests Passed!"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md"
echo "   (Interactive mode - select updates)"
echo ""
echo "2. node scripts/gitissuer.js apply-all --file ./ISSUE_UPDATES.md"
echo "   (Automatic mode - apply all changes at once)"
echo ""
echo "See GITISSUER_UPDATED.md for complete documentation"
echo "=================================================="
