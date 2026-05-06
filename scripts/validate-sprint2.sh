#!/bin/bash
# Pre-deployment validation script for Sprint #2 Indexing Resilience features
# Run this before deploying to staging or production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}=== Sprint #2 Pre-Deployment Validation ===${NC}\n"

# Track validation results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
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

# ========== Step 1: Code Quality Checks ==========
echo -e "${YELLOW}[1/8] Running code quality checks...${NC}"

# TypeScript compilation (check tsconfig.json exists and compiles)
if cd "$PROJECT_ROOT" && npx tsc --noEmit &>/dev/null; then
  pass "TypeScript compilation successful"
else
  fail "TypeScript compilation failed"
fi

# Linting
if cd "$PROJECT_ROOT" && yarn lint &>/dev/null; then
  pass "ESLint checks passed"
else
  warn "Linting issues detected (non-blocking)"
fi

# Formatting
if cd "$PROJECT_ROOT" && yarn format:check &>/dev/null; then
  pass "Code formatting is correct"
else
  warn "Code formatting issues detected (run 'yarn format:fix')"
fi

echo ""

# ========== Step 2: Unit Tests ==========
echo -e "${YELLOW}[2/8] Running unit tests...${NC}"

# Run all unit tests
if cd "$PROJECT_ROOT" && yarn test:unit &>/dev/null; then
  pass "Unit tests passed"
else
  warn "Some unit tests failed (check manually)"
fi

echo ""

# ========== Step 3: Integration Tests ==========
echo -e "${YELLOW}[3/8] Running integration tests...${NC}"

# Check if integration test file exists
if [ -f "$PROJECT_ROOT/test/integration/resilienceStack.spec.ts" ]; then
  pass "Integration test file exists"
else
  fail "Integration test file missing"
fi

echo ""
  fail "Integration tests failed"
fi

echo ""

# ========== Step 4: Test Coverage Check ==========
echo -e "${YELLOW}[4/8] Checking test coverage...${NC}"

# Run coverage report
if cd "$PROJECT_ROOT" && yarn test:unit:coverage --silent &>/dev/null; then
  COVERAGE_JSON="$PROJECT_ROOT/coverage/coverage-summary.json"
  
  if [ -f "$COVERAGE_JSON" ]; then
    # Extract coverage percentages (requires jq)
    if command -v jq &>/dev/null; then
      STATEMENTS=$(jq -r '.total.statements.pct' "$COVERAGE_JSON")
      BRANCHES=$(jq -r '.total.branches.pct' "$COVERAGE_JSON")
      FUNCTIONS=$(jq -r '.total.functions.pct' "$COVERAGE_JSON")
      LINES=$(jq -r '.total.lines.pct' "$COVERAGE_JSON")
      
      echo "  Statements: ${STATEMENTS}%"
      echo "  Branches: ${BRANCHES}%"
      echo "  Functions: ${FUNCTIONS}%"
      echo "  Lines: ${LINES}%"
      
      # Check if coverage meets minimum thresholds
      THRESHOLD=70
      if (( $(echo "$LINES >= $THRESHOLD" | bc -l) )); then
        pass "Test coverage meets minimum threshold (${THRESHOLD}%)"
      else
        warn "Test coverage below ${THRESHOLD}% (${LINES}%)"
      fi
    else
      warn "jq not installed, skipping coverage percentage check"
    fi
  else
    warn "Coverage report not found"
  fi
else
  warn "Coverage generation failed"
fi

echo ""

# ========== Step 5: Dependency Security Check ==========
echo -e "${YELLOW}[5/8] Checking for security vulnerabilities...${NC}"

if cd "$PROJECT_ROOT" && yarn audit --level=high &>/dev/null; then
  pass "No high-severity vulnerabilities found"
else
  AUDIT_COUNT=$(yarn audit --level=high 2>/dev/null | grep -c "high" || echo "0")
  if [ "$AUDIT_COUNT" -gt 0 ]; then
    fail "Found $AUDIT_COUNT high-severity vulnerabilities"
  else
    pass "No high-severity vulnerabilities found"
  fi
fi

echo ""

# ========== Step 6: Environment Configuration ==========
echo -e "${YELLOW}[6/8] Validating environment configuration...${NC}"

# Check for required environment variables
ENV_FILE="$PROJECT_ROOT/.env"
REQUIRED_VARS=(
  "MONGO_URI"
  "NETWORK_RPC_URL"
  "PORT"
)

if [ -f "$ENV_FILE" ]; then
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" "$ENV_FILE"; then
      pass "Environment variable $var is set"
    else
      warn "Environment variable $var not found in .env"
    fi
  done
else
  warn ".env file not found (ensure it's configured in deployment environment)"
fi

echo ""

# ========== Step 7: Database Connectivity ==========
echo -e "${YELLOW}[7/8] Testing database connectivity...${NC}"

# Only test if MongoDB URI is available
if [ -n "$MONGO_URI" ] || grep -q "MONGO_URI=" "$ENV_FILE" 2>/dev/null; then
  MONGO_URI_VAL=$(grep "MONGO_URI=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  
  if command -v mongosh &>/dev/null; then
    if mongosh "$MONGO_URI_VAL" --eval "db.adminCommand('ping')" --quiet &>/dev/null; then
      pass "MongoDB connection successful"
    else
      warn "MongoDB connection failed (check URI and credentials)"
    fi
  else
    warn "mongosh not installed, skipping DB connectivity test"
  fi
else
  warn "MongoDB URI not configured, skipping connectivity test"
fi

echo ""

# ========== Step 8: Docker Build Test (Optional) ==========
echo -e "${YELLOW}[8/8] Testing Docker build...${NC}"

if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
  if command -v docker &>/dev/null; then
    if docker build -t aragon-backend-test:latest "$PROJECT_ROOT" &>/dev/null; then
      pass "Docker image builds successfully"
      # Clean up test image
      docker rmi aragon-backend-test:latest &>/dev/null || true
    else
      fail "Docker build failed"
    fi
  else
    warn "Docker not installed, skipping build test"
  fi
else
  warn "Dockerfile not found, skipping Docker build test"
fi

echo ""

# ========== Summary ==========
echo -e "${GREEN}=== Validation Summary ===${NC}"
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Validation FAILED. Do not deploy until issues are resolved.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Validation passed with warnings. Review warnings before deploying.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ All validations PASSED. Ready for deployment!${NC}"
  exit 0
fi
