"""Estadísticas, historial y panel principal."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..curriculum.loader import get_curriculum
from ..db.models import Assessment, Attempt, ReviewSchedule, StudyDay, UnlockedAchievement, XpEvent, now
from . import gamification as gm
from .flow import STAGE_LABELS, all_progress, is_unlocked


def curriculum_map(s: Session, uid: int) -> dict[str, Any]:
    cur = get_curriculum()
    progs = all_progress(s, uid)
    blocks = []
    for b in cur.blocks.values():
        topics = []
        for t in b.topics:
            p = progs.get(t.uid)
            topics.append({"uid": t.uid, "number": t.number, "title": t.title, "state": p.state if p else "no_iniciado",
                           "stage": p.stage if p else "diagnostico", "stage_label": STAGE_LABELS[p.stage] if p else STAGE_LABELS["diagnostico"],
                           "mastery": p.mastery if p else 0.0, "unlocked": is_unlocked(s, uid, t, progs), "conceptual": t.is_conceptual})
        done = sum(1 for t in topics if t["state"] in ("dominado", "consolidado"))
        blocks.append({"uid": b.uid, "number": b.number, "title": b.title, "intro": b.intro, "topics": topics, "mastered": done,
                       "total": len(topics), "unlocked": topics[0]["unlocked"],
                       "progress": round(sum(t["mastery"] for t in topics) / len(topics), 1)})
    return {"modules": list(cur.modules.values()), "blocks": blocks}


def dashboard(s: Session, uid: int) -> dict[str, Any]:
    cur = get_curriculum()
    progs = all_progress(s, uid)
    xp = gm.total_xp(s, uid)
    lvl, lo, hi = gm.level_for_xp(xp)
    st_cur, st_best = gm.streak(s, uid)
    counts = Counter(p.state for p in progs.values())
    n_topics = len(cur.topics)
    # siguiente tema recomendado: el primero desbloqueado que no esté dominado
    nxt = None
    for t in cur.ordered_topics:
        p = progs.get(t.uid)
        if (not p or p.state not in ("dominado", "consolidado")) and is_unlocked(s, uid, t, progs):
            nxt = {"uid": t.uid, "number": t.number, "title": t.title, "stage_label": STAGE_LABELS[p.stage] if p else STAGE_LABELS["diagnostico"],
                   "block": cur.block_of(t.uid).title}
            break
    due = s.scalar(select(func.count()).select_from(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.due_at <= now())) or 0
    total = s.scalar(select(func.count()).select_from(Attempt).where(Attempt.user_id == uid)) or 0
    correct = s.scalar(select(func.count()).select_from(Attempt).where(Attempt.user_id == uid, Attempt.correct.is_(True))) or 0
    week = now() - timedelta(days=7)
    recent = s.execute(select(Attempt.correct).where(Attempt.user_id == uid, Attempt.created_at >= week)).scalars().all()
    return {
        "xp": xp, "level": lvl, "level_floor": lo, "level_ceil": hi, "streak": st_cur, "best_streak": st_best,
        "topics_total": n_topics, "mastered": counts.get("dominado", 0) + counts.get("consolidado", 0), "consolidated": counts.get("consolidado", 0),
        "in_progress": counts.get("aprendiendo", 0) + counts.get("en_practica", 0), "reviews_due": due, "next_topic": nxt,
        "attempts": total, "accuracy": round(correct / total * 100, 1) if total else None,
        "week_attempts": len(recent), "week_accuracy": round(sum(recent) / len(recent) * 100, 1) if recent else None,
        "achievements": s.scalar(select(func.count()).select_from(UnlockedAchievement).where(UnlockedAchievement.user_id == uid)) or 0,
    }


def statistics(s: Session, uid: int) -> dict[str, Any]:
    cur = get_curriculum()
    days = s.scalars(select(StudyDay).where(StudyDay.user_id == uid).order_by(StudyDay.day)).all()
    atts = s.scalars(select(Attempt).where(Attempt.user_id == uid).order_by(Attempt.id)).all()
    by_block: dict[str, list[bool]] = defaultdict(list)
    by_level: dict[int, list[bool]] = defaultdict(list)
    times: dict[int, list[int]] = defaultdict(list)
    for a in atts:
        if a.topic_uid in cur.topics:
            by_block[cur.block_of(a.topic_uid).uid].append(a.correct)
        by_level[a.level].append(a.correct)
        if a.time_ms and a.correct:
            times[a.level].append(a.time_ms)
    blocks = []
    for b in cur.blocks.values():
        r = by_block.get(b.uid, [])
        blocks.append({"uid": b.uid, "number": b.number, "title": b.title, "attempts": len(r), "accuracy": round(sum(r) / len(r) * 100, 1) if r else None})
    assessments = s.scalars(select(Assessment).where(Assessment.user_id == uid, Assessment.finished_at.is_not(None)).order_by(Assessment.id.desc()).limit(30)).all()
    xp_hist = s.execute(select(func.date(XpEvent.created_at), func.sum(XpEvent.amount)).where(XpEvent.user_id == uid)
                        .group_by(func.date(XpEvent.created_at)).order_by(func.date(XpEvent.created_at))).all()
    return {
        "days": [{"day": d.day.isoformat(), "exercises": d.exercises, "correct": d.correct} for d in days][-60:],
        "blocks": blocks,
        "levels": [{"level": lv, "attempts": len(v), "accuracy": round(sum(v) / len(v) * 100, 1)} for lv, v in sorted(by_level.items())],
        "avg_time_s": {str(lv): round(sum(v) / len(v) / 1000, 1) for lv, v in times.items()},
        "assessments": [{"id": a.id, "kind": a.kind, "scope": a.scope, "scope_title": _scope_title(a.scope), "score": round(a.correct / a.total * 100, 1) if a.total else 0,
                         "passed": a.passed, "finished_at": a.finished_at.isoformat() if a.finished_at else None} for a in assessments],
        "xp_by_day": [{"day": str(d), "xp": int(x)} for d, x in xp_hist][-60:],
    }


def _scope_title(scope: str) -> str:
    cur = get_curriculum()
    if scope in cur.topics:
        t = cur.topics[scope]
        return f"{t.number} {t.title}"
    if scope in cur.blocks:
        b = cur.blocks[scope]
        return f"Bloque {b.number}: {b.title}"
    return cur.modules.get(scope, {}).get("code", scope)


def error_history(s: Session, uid: int, limit: int = 100) -> dict[str, Any]:
    cur = get_curriculum()
    rows = s.scalars(select(Attempt).where(Attempt.user_id == uid, Attempt.correct.is_(False)).order_by(Attempt.id.desc()).limit(limit)).all()
    freq = Counter((a.topic_uid, a.error_code, a.error_title) for a in rows if a.error_code)
    return {
        "frequent": [{"topic_uid": t, "topic": _scope_title(t), "code": c, "title": ti or "Error sin diagnóstico concreto", "count": n}
                     for (t, c, ti), n in freq.most_common(15)],
        "recent": [{"exercise_id": a.exercise_id, "topic_uid": a.topic_uid, "topic": _scope_title(a.topic_uid) if a.topic_uid in cur.topics else a.topic_uid,
                    "answer": a.answer_raw, "error": a.error_title or "Error sin diagnóstico concreto", "level": a.level,
                    "at": a.created_at.isoformat()} for a in rows[:40]],
    }


def achievements(s: Session, uid: int) -> list[dict[str, Any]]:
    have = {a.code: a.unlocked_at for a in s.scalars(select(UnlockedAchievement).where(UnlockedAchievement.user_id == uid))}
    return [{"code": a.code, "title": a.title, "description": a.description, "icon": a.icon,
             "unlocked_at": have[a.code].isoformat() if a.code in have else None} for a in gm.ACHIEVEMENTS]
