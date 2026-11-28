"""Integridad del pensum oficial MAT-01 (sección 13 del proyecto).

Si alguien elimina, resume, combina o reordena un tema, estas pruebas fallan.
"""

import hashlib
from pathlib import Path

import yaml

from app.curriculum.loader import load

ROOT = Path(__file__).resolve().parents[2] / "curriculum"
TOPICS_PER_BLOCK = [6, 10, 10, 10, 10, 11, 12, 10, 9, 8, 8, 7, 7, 11, 8, 9, 8, 11, 10, 8, 7, 8, 9, 6, 8, 6, 11, 8, 9, 7, 9, 9]
FINGERPRINT = "823c2bcf92c72d636f0674a172a23d1d1d5d5a5c2b00f8e82f361e8ed7065e30"


def _pensum():
    return yaml.safe_load((ROOT / "mat-01" / "pensum.yaml").read_text(encoding="utf-8"))


def test_32_blocks_280_topics():
    d = _pensum()
    assert len(d["blocks"]) == 32
    assert [len(b["topics"]) for b in d["blocks"]] == TOPICS_PER_BLOCK
    assert sum(TOPICS_PER_BLOCK) == 280


def test_titles_unchanged():
    d = _pensum()
    text = "\n".join(b["title"] + "|" + "|".join(t["title"] for t in b["topics"]) for b in d["blocks"])
    assert hashlib.sha256(text.encode()).hexdigest() == FINGERPRINT, "Se modificó el texto u orden del pensum oficial"


def test_curriculum_loads_without_problems():
    cur = load(ROOT)
    assert len(cur.blocks) == 32 and len(cur.topics) == 280
    assert cur.problems == []


def test_every_topic_has_exercises():
    cur = load(ROOT)
    for t in cur.topics.values():
        assert t.gens or (t.lesson and len(t.lesson.practice) >= 9), t.uid
