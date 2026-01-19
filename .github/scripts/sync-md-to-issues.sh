#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-.}"
PROJECT_NODE_ID="${2:-}"
DRY_RUN=true

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --repo-root) REPO_ROOT="${2:-}"; shift 2;;
    --project-node-id) PROJECT_NODE_ID="${2:-}"; shift 2;;
    --dry-run) DRY_RUN="${2:-true}"; shift 2;;
    --help) echo "Usage: sync-md-to-issues.sh --repo-root . --project-node-id <id> --dry-run true|false"; exit 0;;
    *) shift ;;
  esac
done

echo "Repo root: $REPO_ROOT"
echo "Project node id: $PROJECT_NODE_ID"
echo "Dry run: $DRY_RUN"

mapfile -t MD_FILES < <(find "$REPO_ROOT" -maxdepth 2 -type f -name "PLAN.md")

if [ ${#MD_FILES[@]} -eq 0 ]; then
  echo "No PLAN.md files found under $REPO_ROOT"
  exit 0
fi

TMP_DIR="./tmp"
mkdir -p "$TMP_DIR"
rm -f "$TMP_DIR"/*.json || true

# Ensure GITHUB_REPOSITORY env for local runs (used by gh-issue-ops.js)
REPO_URL=$(git -C "$REPO_ROOT" config --get remote.origin.url 2>/dev/null || true)
if [ -n "$REPO_URL" ]; then
  if [[ "$REPO_URL" =~ github.com[:/](.+)/([^/.]+) ]]; then
    GITHUB_REPOSITORY="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
    export GITHUB_REPOSITORY
    echo "Detected repo: $GITHUB_REPOSITORY"
  fi
fi

for f in "${MD_FILES[@]}"; do
  echo "Processing $f"
  node .github/scripts/compare-md.js "$f" > "$TMP_DIR/$(basename "$f").json" || true
  echo "Parsed -> $TMP_DIR/$(basename "$f").json"
  if [ "$DRY_RUN" = "false" ]; then
    if [ -n "$PROJECT_NODE_ID" ]; then
      node .github/scripts/gh-issue-ops.js "$TMP_DIR/$(basename "$f").json" --project-node-id "$PROJECT_NODE_ID"
    else
      node .github/scripts/gh-issue-ops.js "$TMP_DIR/$(basename "$f").json"
    fi
  else
    echo "Dry-run: skipping issue ops for $f"
  fi
done

echo "Sync complete"
