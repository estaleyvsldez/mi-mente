"""Conexión a la base de datos y creación de tablas."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from ..config import DB_URL
from .models import Base, User

_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def init_db(url: str = DB_URL) -> None:
    global _engine, _SessionLocal
    _engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    if url.startswith("sqlite"):
        @event.listens_for(_engine, "connect")
        def _fk(dbapi_conn, _rec):  # noqa: ANN001
            dbapi_conn.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)
    with _SessionLocal() as s:
        if s.get(User, 1) is None:
            s.add(User(id=1, name="Estudiante", settings={"explorer": False}))
            s.commit()


def ensure_db() -> None:
    """Inicializa la BD sólo si aún no lo está (las pruebas la inicializan antes)."""
    if _SessionLocal is None:
        init_db()


def get_session() -> Iterator[Session]:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        yield s
