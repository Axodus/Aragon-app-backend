#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-.}"
PROJECT_URL="${2:-""}"
DRY_RUN=true

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --repo-root) REPO_ROOT="$2"; shift 2;;
    --project-url) PROJECT_URL="$2"; shift 2;;
    --dry-run) DRY_RUN="$2"; shift 2;;
    --help) echo "Usage: sync-md-to-issues.sh --repo-root . --project-url <url> --dry-run true|false"; exit 0;;
    *) shift ;;
  esac
done

echo "Repo root: $REPO_ROOT"
echo "Project URL: $PROJECT_URL"
echo "Dry run: $DRY_RUN"

mapfile -t MD_FILES < <(find "$REPO_ROOT" -maxdepth 2 -type f -name "PLAN.md")

if [ ${#MD_FILES[@]} -eq 0 ]; then
  echo "No PLAN.md files found under $REPO_ROOT"
  exit 0
fi

for f in "${MD_FILES[@]}"; do
  echo "Processing $f"
  node .github/scripts/compare-md.js "$f" > /tmp/$(basename "$f").json || true
  echo "Parsed -> /tmp/$(basename "$f").json"
  if [ "$DRY_RUN" = "false" ]; then
    node .github/scripts/gh-issue-ops.js /tmp/$(basename "$f").json --project-url "$PROJECT_URL"
  else
    echo "Dry-run: skipping issue ops for $f"
  fi
done

echo "Sync complete"
