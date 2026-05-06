#!/bin/bash
# Quick pre-deployment validation for Sprint #2
# Focuses on essential checks that run fast

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}=== Sprint #2 Quick Validation ===${NC}\n"

PASSED=0
FAILED=0
WARNINGS=0

pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

# ========== Step 1: TypeScript Compilation ==========
echo -e "${YELLOW}[1/6] TypeScript compilation...${NC}"
cd "$PROJECT_ROOT"
if npx tsc --noEmit; then
  pass "TypeScript compilation successful"
else
  fail "TypeScript compilation failed"
fi
echo ""

# ========== Step 2: File Existence Checks ==========
echo -e "${YELLOW}[2/6] Checking Sprint #2 files...${NC}"

FILES=(
  "src/services/resilienceMetrics.ts"
  "src/services/backfillReplay.ts"
  "src/modules/rpcPool.ts"
  "test/integration/resilienceStack.spec.ts"
  "docs/ROLLBACK_PROCEDURES.md"
  "docs/DEPLOYMENT_CHECKLIST.md"
  "docs/RESILIENCE_METRICS_ALERTS.md"
  "docs/RESILIENCE_METRICS_INTEGRATION.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    pass "$(basename $file) exists"
  else
    fail "$file missing"
  fi
done
echo ""

# ========== Step 3: Linting ==========
echo -e "${YELLOW}[3/6] Running linter...${NC}"
if yarn lint; then
  pass "ESLint checks passed"
else
  warn "Linting issues detected (non-blocking)"
fi
echo ""

# ========== Step 4: Environment Configuration ==========
echo -e "${YELLOW}[4/6] Checking environment...${NC}"

if [ -f "$PROJECT_ROOT/.env" ]; then
  pass ".env file exists"
  
  # Check for required Sprint #2 variables
  REQUIRED_VARS=("MONGODB_URI" "RPC_URL_HARMONY_MAINNET")
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "$PROJECT_ROOT/.env"; then
      pass "$var configured"
    else
      warn "$var not found in .env"
    fi
  done
else
  warn ".env file not found (copy from .env.sample)"
fi
echo ""

# ========== Step 5: Documentation Check ==========
echo -e "${YELLOW}[5/6] Validating documentation...${NC}"

# Check rollback procedures have all sections
if grep -q "## Method 1: Git Revert" "$PROJECT_ROOT/docs/ROLLBACK_PROCEDURES.md" && \
   grep -q "## Component-Specific Rollback" "$PROJECT_ROOT/docs/ROLLBACK_PROCEDURES.md"; then
  pass "Rollback procedures complete"
else
  fail "Rollback procedures incomplete"
fi

# Check deployment checklist has all phases
if grep -q "## Pre-Deployment" "$PROJECT_ROOT/docs/DEPLOYMENT_CHECKLIST.md" && \
   grep -q "## Production Deployment" "$PROJECT_ROOT/docs/DEPLOYMENT_CHECKLIST.md"; then
  pass "Deployment checklist complete"
else
  fail "Deployment checklist incomplete"
fi
echo ""

# ========== Step 6: Git Status ==========
echo -e "${YELLOW}[6/6] Git status...${NC}"
cd "$PROJECT_ROOT"

if [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes present"
  echo "  Modified files:"
  git status --short | head -n 10
else
  pass "Working directory clean"
fi
echo ""

# ========== Summary ==========
echo -e "${GREEN}=== Validation Summary ===${NC}"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Validation failed. Fix errors before deployment.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Validation passed with warnings. Review before deployment.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
  exit 0
fi
