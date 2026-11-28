"""XP, niveles, rachas y logros.

La gamificación premia el APRENDIZAJE (dominar, consolidar, corregir
errores), no el volumen: repetir ejercicios fáciles da cada vez menos XP.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import XP_CORRECT
from ..db.models import Attempt, ChallengeRun, StudyDay, TopicProgress, UnlockedAchievement, XpEvent, now


def level_for_xp(xp: int) -> tuple[int, int, int]:
    """(nivel, xp al inicio del nivel, xp para el siguiente). Curva: 100·n^1.5 acumulada."""
    lvl, acc = 1, 0
    while True:
        need = int(100 * lvl**1.5)
        if xp < acc + need:
            return lvl, acc, acc + need
        acc += need
        lvl += 1


def total_xp(s: Session, user_id: int) -> int:
    return int(s.scalar(select(func.coalesce(func.sum(XpEvent.amount), 0)).where(XpEvent.user_id == user_id)) or 0)


def award(s: Session, user_id: int, amount: int, reason: str, topic_uid: str | None = None) -> dict:
    if amount <= 0:
        return {}
    s.add(XpEvent(user_id=user_id, amount=amount, reason=reason, topic_uid=topic_uid))
    return {"xp": amount, "reason": reason}


def xp_for_attempt(s: Session, att: Attempt) -> int:
    if not att.correct:
        return 0
    base = XP_CORRECT.get(att.level, 5)
    if att.assisted:
        return max(1, base // 3)
    today = now().replace(hour=0, minute=0, second=0, microsecond=0)
    same = s.scalar(select(func.count()).select_from(Attempt).where(
        Attempt.user_id == att.user_id, Attempt.generator_id == att.generator_id, Attempt.correct.is_(True),
        Attempt.created_at >= today)) or 0
    # rendimientos decrecientes: después de 8 aciertos del mismo tipo en el día
    return base if same <= 8 else max(1, base // 4)


def record_study(s: Session, user_id: int, correct: bool) -> None:
    d = now().date()
    row = s.scalar(select(StudyDay).where(StudyDay.user_id == user_id, StudyDay.day == d))
    if row is None:
        row = StudyDay(user_id=user_id, day=d, exercises=0, correct=0)
        s.add(row)
    row.exercises += 1
    row.correct += int(correct)


def streak(s: Session, user_id: int, min_exercises: int = 5) -> tuple[int, int]:
    """(racha actual, mejor racha) en días con al menos `min_exercises` ejercicios."""
    days = sorted(d for d, n in s.execute(select(StudyDay.day, StudyDay.exercises).where(StudyDay.user_id == user_id)) if n >= min_exercises)
    best = cur = 0
    prev: date | None = None
    for d in days:
        cur = cur + 1 if prev and d - prev == timedelta(days=1) else 1
        best = max(best, cur)
        prev = d
    today = now().date()
    current = cur if prev and (today - prev).days <= 1 else 0
    return current, best


# ------------------------------------------------------------------ logros ---


@dataclass(frozen=True)
class AchievementDef:
    code: str
    title: str
    description: str
    icon: str
    check: Callable[[Session, int], bool]


def _count_states(s: Session, uid: int, states: tuple[str, ...]) -> int:
    return int(s.scalar(select(func.count()).select_from(TopicProgress).where(TopicProgress.user_id == uid, TopicProgress.state.in_(states))) or 0)


def _correct(s: Session, uid: int) -> int:
    return int(s.scalar(select(func.count()).select_from(Attempt).where(Attempt.user_id == uid, Attempt.correct.is_(True))) or 0)


def _fixed_errors(s: Session, uid: int) -> int:
    """Veces que tras un error en un generador se acertó el siguiente del mismo tipo sin ayuda."""
    rows = s.execute(select(Attempt.generator_id, Attempt.correct, Attempt.assisted).where(Attempt.user_id == uid).order_by(Attempt.id)).all()
    last: dict[str, bool] = {}
    n = 0
    for gid, ok, assisted in rows:
        if ok and not assisted and last.get(gid) is False:
            n += 1
        last[gid] = bool(ok)
    return n


def _block_mastered(s: Session, uid: int) -> bool:
    from ..curriculum.loader import get_curriculum

    cur = get_curriculum()
    done = set(s.scalars(select(TopicProgress.topic_uid).where(TopicProgress.user_id == uid, TopicProgress.state.in_(("dominado", "consolidado")))))
    return any(all(t.uid in done for t in b.topics) for b in cur.blocks.values())


ACHIEVEMENTS: list[AchievementDef] = [
    AchievementDef("primer_paso", "Primer paso", "Resuelve tu primer ejercicio correctamente.", "spark", lambda s, u: _correct(s, u) >= 1),
    AchievementDef("cien_aciertos", "Cien aciertos", "Acumula 100 respuestas correctas.", "target", lambda s, u: _correct(s, u) >= 100),
    AchievementDef("mil_aciertos", "Mil aciertos", "Acumula 1000 respuestas correctas.", "trophy", lambda s, u: _correct(s, u) >= 1000),
    AchievementDef("primer_dominio", "Primer dominio", "Domina tu primer tema (≥ 90 % y examen aprobado).", "medal", lambda s, u: _count_states(s, u, ("dominado", "consolidado")) >= 1),
    AchievementDef("consolidado", "Memoria a largo plazo", "Consolida un tema superando el repaso diferido.", "brain", lambda s, u: _count_states(s, u, ("consolidado",)) >= 1),
    AchievementDef("diez_temas", "Diez temas", "Domina 10 temas.", "layers", lambda s, u: _count_states(s, u, ("dominado", "consolidado")) >= 10),
    AchievementDef("bloque_completo", "Bloque completo", "Domina todos los temas de un bloque.", "grid", _block_mastered),
    AchievementDef("aprendes_de_errores", "Aprendes de tus errores", "Corrige 10 veces un error en el siguiente intento sin ayuda.", "repeat", lambda s, u: _fixed_errors(s, u) >= 10),
    AchievementDef("racha_3", "Constancia", "Estudia 3 días seguidos.", "flame", lambda s, u: streak(s, u)[1] >= 3),
    AchievementDef("racha_7", "Una semana", "Estudia 7 días seguidos.", "flame", lambda s, u: streak(s, u)[1] >= 7),
    AchievementDef("racha_30", "Hábito de acero", "Estudia 30 días seguidos.", "flame", lambda s, u: streak(s, u)[1] >= 30),
    AchievementDef("retador", "Retador", "Consigue 10 aciertos en una partida del Modo Desafío.", "bolt",
                   lambda s, u: (s.scalar(select(func.max(ChallengeRun.score)).where(ChallengeRun.user_id == u)) or 0) >= 10),
]
ACH_BY_CODE = {a.code: a for a in ACHIEVEMENTS}


def check_achievements(s: Session, user_id: int) -> list[dict]:
    have = set(s.scalars(select(UnlockedAchievement.code).where(UnlockedAchievement.user_id == user_id)))
    new = []
    for a in ACHIEVEMENTS:
        if a.code not in have and a.check(s, user_id):
            s.add(UnlockedAchievement(user_id=user_id, code=a.code))
            new.append({"code": a.code, "title": a.title, "description": a.description, "icon": a.icon})
    return new
