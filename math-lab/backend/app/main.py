"""Punto de entrada de la API (FastAPI).

Arranque:  .venv/bin/uvicorn app.main:app --app-dir backend --reload
Si existe ``frontend/dist`` (frontend compilado), también lo sirve, de modo
que toda la plataforma funciona con un único proceso.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import FRONTEND_DIST
from .curriculum.loader import get_curriculum
from .db.session import ensure_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cur = get_curriculum()  # valida el currículo al arrancar (falla rápido si está mal)
    if cur.problems:
        print(f"[MATH LAB] Aviso: {len(cur.problems)} problema(s) en el currículo. Ejecuta scripts/validate_curriculum.py")
    ensure_db()
    yield


app = FastAPI(title="MATH LAB API", version="0.1.0", lifespan=lifespan)
app.include_router(router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        f = FRONTEND_DIST / path
        return FileResponse(f if path and f.is_file() else FRONTEND_DIST / "index.html")
