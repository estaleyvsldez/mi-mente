"""Repetición espaciada (variante simplificada de SM-2).

* Un tema dominado se agenda para repaso.
* Acertar alarga el intervalo (1 → 3 → ×facilidad…); fallar lo reinicia a 1
  día y baja la facilidad, así los temas difíciles vuelven antes.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from ..db.models import ReviewSchedule


def quality_from_score(score: float) -> int:
    """Convierte un porcentaje de acierto (0–1) en calidad SM-2 (0–5)."""
    if score >= 0.95:
        return 5
    if score >= 0.85:
        return 4
    if score >= 0.7:
        return 3
    if score >= 0.5:
        return 2
    return 1 if score > 0 else 0


def update(rs: ReviewSchedule, quality: int, at: datetime) -> ReviewSchedule:
    rs.ease = max(1.3, rs.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if quality < 3:
        rs.lapses += 1
        rs.reps = 0
        rs.interval_days = 1.0
    else:
        rs.reps += 1
        rs.interval_days = 1.0 if rs.reps == 1 else (3.0 if rs.reps == 2 else round(rs.interval_days * rs.ease, 1))
    rs.last_review = at
    rs.due_at = at + timedelta(days=rs.interval_days)
    return rs
