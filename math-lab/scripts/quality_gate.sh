#!/usr/bin/env bash
# PUERTA DE CALIDAD de MATH LAB: nada se entrega si algo falla aquí.
# Uso: scripts/quality_gate.sh   (desde la carpeta math-lab)
set -euo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python
step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }

step "1/6 Estilo y errores estáticos (ruff)"
.venv/bin/ruff check engine backend scripts

step "2/6 Integridad del currículo (32 bloques, 280 temas, lecciones, bancos)"
$PY scripts/validate_curriculum.py
$PY -m pytest -q -p no:cacheprovider backend/tests/test_curriculum.py

step "3/6 Motor matemático (pruebas unitarias y de propiedad)"
$PY -m pytest -q -p no:cacheprovider engine/tests

step "4/6 Backend: flujo de enseñanza, dominio, repaso, gamificación"
$PY -m pytest -q -p no:cacheprovider -W ignore backend/tests

step "5/6 Frontend: tipos y compilación"
(cd frontend && npx tsc -b && npx vite build --logLevel warn)

step "6/6 Prueba de extremo a extremo en navegador"
export MATHLAB_DB="sqlite:///$(mktemp -d)/e2e.db"
(cd backend && ../.venv/bin/uvicorn app.main:app --port 8765 >/dev/null 2>&1 & echo $! > /tmp/mathlab_e2e.pid)
trap 'kill $(cat /tmp/mathlab_e2e.pid) 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -sf http://127.0.0.1:8765/api/health >/dev/null && break; sleep 0.5; done
(cd frontend && MATHLAB_URL=http://127.0.0.1:8765 npx playwright test --config playwright.config.cjs --trace off)

printf "\n\033[1;32m✔ PUERTA DE CALIDAD SUPERADA\033[0m\n"
