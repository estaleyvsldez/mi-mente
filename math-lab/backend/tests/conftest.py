"""Configuración de pruebas: currículo de prueba y base de datos temporal."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures" / "curriculum"
REAL = Path(__file__).resolve().parents[2] / "curriculum"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Cliente HTTP contra la app con el currículo de PRUEBA y una BD nueva."""
    from fastapi.testclient import TestClient

    from app.curriculum import loader
    from app.db import session

    monkeypatch.setattr(loader, "ROOT", FIXTURES)
    loader.get_curriculum.cache_clear()
    monkeypatch.setattr(loader, "get_curriculum", lambda: _cached(loader))
    for mod in ("app.services.flow", "app.services.exercises", "app.services.stats", "app.api.routes", "app.main", "app.services.gamification"):
        m = __import__(mod, fromlist=["x"])
        if hasattr(m, "get_curriculum"):
            monkeypatch.setattr(m, "get_curriculum", lambda: _cached(loader))
    session.init_db(f"sqlite:///{tmp_path / 'test.db'}")
    from app.main import app

    with TestClient(app) as c:
        yield c
    _CACHE.clear()


_CACHE: dict = {}


def _cached(loader):
    if "cur" not in _CACHE:
        _CACHE["cur"] = loader.load(FIXTURES)
    return _CACHE["cur"]


os.environ.setdefault("MATHLAB_DB", "sqlite:///:memory:")
