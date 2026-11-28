"""Evaluación del dominio de un tema (sección 5 del proyecto).

Funciones PURAS sobre la lista de intentos: fáciles de probar.

Un tema sólo puede considerarse dominado si:
* la precisión sin ayuda en la ventana reciente es ≥ 90 %,
* se resolvieron correctamente variantes distintas en cada nivel trabajado,
* no se repite constantemente el mismo error,
* y, además (en flow.py), se aprobaron las evaluaciones y el repaso diferido.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from ..config import MASTERY_THRESHOLD, MASTERY_WINDOW, REPEATED_ERROR_LIMIT
from ..db.models import Attempt


@dataclass
class MasteryReport:
    attempts: int
    unassisted: int
    accuracy: float  # precisión ponderada en la ventana
    variants_ok: dict[int, set[str]] = field(default_factory=dict)  # nivel → variantes acertadas
    repeated_errors: list[tuple[str, str, int]] = field(default_factory=list)  # (código, título, veces)
    top_errors: list[tuple[str, str, int]] = field(default_factory=list)

    def ready(self, min_level: int, variants_needed: dict[int, int]) -> tuple[bool, list[str]]:
        reasons = []
        if self.unassisted < min(MASTERY_WINDOW, 8):
            reasons.append(f"Necesitas al menos {min(MASTERY_WINDOW, 8)} ejercicios resueltos sin ayuda (llevas {self.unassisted}).")
        if self.accuracy < MASTERY_THRESHOLD:
            reasons.append(f"Tu precisión reciente es {round(self.accuracy * 100)} %; se requiere {round(MASTERY_THRESHOLD * 100)} %.")
        for lvl, need in variants_needed.items():
            if lvl > min_level:
                continue
            got = len(self.variants_ok.get(lvl, set()))
            if got < need:
                reasons.append(f"Resuelve correctamente {need - got} tipo(s) de ejercicio más del nivel {lvl}.")
        for _code, title, n in self.repeated_errors:
            reasons.append(f"Repetiste {n} veces el error «{title}». Practiquemos ese punto.")
        return not reasons, reasons


def compute(attempts: list[Attempt], levels: tuple[int, ...] = (1, 2, 3)) -> MasteryReport:
    """`attempts` en orden cronológico (más antiguo primero)."""
    clean = [a for a in attempts if not a.assisted and a.level in levels]
    window = clean[-MASTERY_WINDOW:]
    if window:
        # Más peso a lo reciente: peso lineal 1..n
        weights = range(1, len(window) + 1)
        acc = sum(w for w, a in zip(weights, window) if a.correct) / sum(weights)
    else:
        acc = 0.0
    variants: dict[int, set[str]] = {}
    for a in clean:
        if a.correct:
            variants.setdefault(a.level, set()).add(f"{a.generator_id}:{a.variant}")
    errs = Counter((a.error_code, a.error_title or a.error_code) for a in window if not a.correct and a.error_code)
    repeated = [(c, t, n) for (c, t), n in errs.items() if n >= REPEATED_ERROR_LIMIT and c not in ("desconocido",)]
    all_errs = Counter((a.error_code, a.error_title or a.error_code) for a in attempts if not a.correct and a.error_code)
    return MasteryReport(attempts=len(attempts), unassisted=len(clean), accuracy=acc, variants_ok=variants,
                         repeated_errors=repeated, top_errors=[(c, t, n) for (c, t), n in all_errs.most_common(5)])


def mastery_percent(state: str, report: MasteryReport, exam_score: float | None) -> float:
    """Porcentaje de dominio mostrado en la interfaz (0–100)."""
    if state == "consolidado":
        return 100.0
    base = report.accuracy * 70 * min(1.0, report.unassisted / MASTERY_WINDOW)
    if exam_score is not None:
        base += exam_score * 25
    if state == "dominado":
        base = max(base, 90.0)
    return round(min(base, 99.0 if state != "consolidado" else 100.0), 1)
