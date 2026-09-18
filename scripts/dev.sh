#!/usr/bin/env bash
# Starts the API (:8001) and the Vite dev server (:3000) together.
# Usage: ./scripts/dev.sh   (Ctrl-C stops both)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing — copy backend/.env.example and fill it in." >&2
  exit 1
fi

trap 'kill 0' EXIT
(cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8001) &
(cd frontend && yarn dev --host 0.0.0.0 --port 3000) &
wait
