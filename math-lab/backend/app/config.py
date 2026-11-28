"""Parámetros pedagógicos y técnicos en un solo lugar.

Cambiar un umbral aquí cambia el comportamiento de toda la plataforma.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DB_URL = os.environ.get("MATHLAB_DB", f"sqlite:///{BASE_DIR / 'mathlab.db'}")
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# --- Dominio (sección 5 del proyecto) ---------------------------------------
MASTERY_THRESHOLD = 0.90  # 90 % mínimo
MASTERY_WINDOW = 12  # últimos N intentos sin ayuda que cuentan para la precisión
REPEATED_ERROR_LIMIT = 3  # mismo error ≥ 3 veces en la ventana → no se avanza
GUIDED_REQUIRED_CORRECT = 4  # aciertos sin ayuda en la práctica guiada

# --- Evaluaciones ------------------------------------------------------------
ASSESSMENT_SIZES = {
    "diagnostico": 5,
    "intermedia": 10,
    "desafio": 10,
    "examen": 10,
    "consolidacion": 10,
    "bloque": 15,
    "modulo": 20,
}
PROCEDURE_FOLLOWUPS = {"examen": 3, "desafio": 2, "bloque": 3, "modulo": 4}  # preguntas «¿qué procedimiento usaste?»
CONSOLIDATION_DELAY_HOURS = 20  # el repaso de consolidación exige al menos ~1 día

# --- Gamificación ------------------------------------------------------------
XP_CORRECT = {1: 5, 2: 10, 3: 15}
XP_STAGE = 40
XP_MASTERED = 200
XP_CONSOLIDATED = 300
XP_BLOCK = 1000
