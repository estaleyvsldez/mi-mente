"""Valida pensum + lecciones. Uso: python scripts/validate_curriculum.py [b04 b05 ...]

Sale con código 1 si hay problemas (lo usa la puerta de calidad)."""

import sys

from app.curriculum.loader import load
from pydantic import ValidationError

try:
    cur = load()
except ValidationError as e:
    print("ERROR DE ESQUEMA:\n", e)
    sys.exit(1)
only = set(sys.argv[1:])
probs = [p for p in cur.problems if not only or any(f".{b}." in p or p.startswith(b) for b in only)]
print(f"Bloques: {len(cur.blocks)} · Temas: {len(cur.topics)} · Problemas: {len(probs)}")
for p in probs:
    print(" -", p)
sys.exit(1 if probs else 0)
