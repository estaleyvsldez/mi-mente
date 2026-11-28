#!/usr/bin/env bash
# Arranca MATH LAB en http://127.0.0.1:8000 (compila el frontend si hace falta).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q -e engine -e "backend[dev]"; }
[ -d frontend/node_modules ] || (cd frontend && npm install)
[ -d frontend/dist ] || (cd frontend && npm run build)
cd backend && exec ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
