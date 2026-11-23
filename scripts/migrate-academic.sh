#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "data/academic.json" ]; then
  echo "Error: data/academic.json not found in $ROOT_DIR" >&2
  exit 1
fi

echo "==> Running Drizzle schema migrations inside backend container..."
docker compose exec -T backend node apps/backend/dist/db/migrate.js

echo "==> Syncing data/academic.json into backend container..."
docker compose cp data/academic.json backend:/app/data/academic.json

echo "==> Running academic curriculum migration ($*)..."
docker compose exec -T backend node apps/backend/dist/db/migrate-academic.js "$@"
