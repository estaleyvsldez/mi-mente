"""Sistema de enseñanza: máquina de estados de cada tema.

    diagnostico → intro → teoria → ejemplo → guiada → independiente →
    intermedia → desafio → examen → (dominado) → consolidacion → completado

Reglas clave (secciones 3–6 del proyecto):
* La teoría se divide en secciones; cada una exige acertar su comprobación.
* La práctica guiada permite ayuda; la independiente mide dominio SIN ayuda.
* La dificultad sube por evidencia (varias variantes acertadas), no por un
  acierto aislado, y baja si se repite un error.
* Aprobar el examen deja el tema «dominado» (provisional). Sólo superar un
  repaso diferido (≥ ~1 día después) lo deja «consolidado».
"""

from __future__ import annotations

import random
from datetime import timedelta
from typing import Any

from mathlab_engine import REGISTRY
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import (
    ASSESSMENT_SIZES,
    CONSOLIDATION_DELAY_HOURS,
    GUIDED_REQUIRED_CORRECT,
    MASTERY_THRESHOLD,
    PROCEDURE_FOLLOWUPS,
    XP_BLOCK,
    XP_CONSOLIDATED,
    XP_MASTERED,
    XP_STAGE,
)
from ..curriculum.loader import Topic, get_curriculum
from ..db.models import Assessment, Attempt, IssuedExercise, ReviewSchedule, TopicProgress, User, now
from . import gamification as gm
from . import mastery, srs
from .exercises import _resolve_level, bank_items

STAGES = ["diagnostico", "intro", "teoria", "ejemplo", "guiada", "independiente", "intermedia", "desafio", "examen",
          "consolidacion", "completado"]
STAGE_LABELS = {
    "diagnostico": "Evaluación inicial", "intro": "Introducción", "teoria": "Clase teórica", "ejemplo": "Ejemplo resuelto",
    "guiada": "Práctica guiada", "independiente": "Práctica independiente", "intermedia": "Evaluación intermedia",
    "desafio": "Desafío avanzado", "examen": "Examen final", "consolidacion": "Repaso de consolidación", "completado": "Completado",
}
ASSESSMENT_STAGES = {"diagnostico", "intermedia", "desafio", "examen", "consolidacion"}
LEVEL_PLANS = {
    "diagnostico": [1, 1, 2, 2, 3],
    "intermedia": [1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
    "desafio": [3] * 10,
    "examen": [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
    "consolidacion": [1, 2, 2, 2, 2, 3, 3, 3, 2, 1],
}
TIME_LIMITS = {"desafio": 25 * 60, "examen": 30 * 60}


# ------------------------------------------------------------- utilidades ---


def user(s: Session, uid: int = 1) -> User:
    u = s.get(User, uid)
    assert u is not None
    return u


def progress(s: Session, uid: int, topic: Topic, create: bool = True) -> TopicProgress | None:
    p = s.scalar(select(TopicProgress).where(TopicProgress.user_id == uid, TopicProgress.topic_uid == topic.uid))
    if p is None and create:
        p = TopicProgress(user_id=uid, topic_uid=topic.uid, stage="diagnostico", state="no_iniciado", level=1, sections_passed=[])
        s.add(p)
        s.flush()
    return p


def all_progress(s: Session, uid: int) -> dict[str, TopicProgress]:
    return {p.topic_uid: p for p in s.scalars(select(TopicProgress).where(TopicProgress.user_id == uid))}


def is_unlocked(s: Session, uid: int, topic: Topic, progs: dict[str, TopicProgress] | None = None) -> bool:
    if user(s, uid).settings.get("explorer"):
        return True
    progs = progs if progs is not None else all_progress(s, uid)
    if topic.uid in progs and progs[topic.uid].state != "no_iniciado":
        return True
    prev = get_curriculum().previous(topic.uid)
    if prev is None:
        return True
    pp = progs.get(prev.uid)
    return bool(pp and pp.state in ("dominado", "consolidado"))


def topic_attempts(s: Session, uid: int, topic_uid: str) -> list[Attempt]:
    return list(s.scalars(select(Attempt).where(Attempt.user_id == uid, Attempt.topic_uid == topic_uid).order_by(Attempt.id)))


def variants_available(topic: Topic, level: int) -> set[str]:
    if topic.is_conceptual:
        return {str(i) for i, _ in bank_items(topic, level)}
    out: set[str] = set()
    for ref in topic.gens:
        lvl, var = _resolve_level(ref, level)
        info = REGISTRY[ref.gen_id]
        lv = lvl if lvl in info.variants else max(info.variants)
        vs = [var] if var else list(info.variants[lv])
        out |= {f"{ref.gen_id}:{v}" for v in vs}
    return out


def variants_needed(topic: Topic, upto: int) -> dict[int, int]:
    cap = 3 if topic.is_conceptual else 2
    return {lvl: min(cap, len(variants_available(topic, lvl))) for lvl in range(1, upto + 1)}


def _variant_key(a: Attempt) -> str:
    return a.variant if a.generator_id.startswith("bank:") else f"{a.generator_id}:{a.variant}"


def report_for(s: Session, uid: int, topic: Topic, stages: tuple[str, ...] | None = None) -> mastery.MasteryReport:
    atts = topic_attempts(s, uid, topic.uid)
    if stages:
        atts = [a for a in atts if a.stage in stages or a.mode in ("practica", "repaso")]
    rep = mastery.compute(atts)
    if topic.is_conceptual:  # para bancos la «variante» es el índice de la pregunta
        rep.variants_ok = {}
        for a in atts:
            if a.correct and not a.assisted:
                rep.variants_ok.setdefault(a.level, set()).add(_variant_key(a))
    return rep


def _set_stage(p: TopicProgress, stage: str) -> None:
    p.stage = stage
    if p.state == "no_iniciado":
        p.state = "aprendiendo"
    if stage in ("guiada", "independiente", "intermedia", "desafio", "examen") and p.state == "aprendiendo":
        p.state = "en_practica"


# ------------------------------------------------------------ estado / API ---


def flow_state(s: Session, uid: int, topic: Topic) -> dict[str, Any]:
    p = progress(s, uid, topic)
    assert p is not None
    rep = report_for(s, uid, topic)
    req_level = 2 if p.stage in ("independiente", "intermedia") else (1 if p.stage == "guiada" else 3)
    ready, reasons = rep.ready(req_level, variants_needed(topic, req_level))
    active = s.scalar(select(Assessment).where(Assessment.user_id == uid, Assessment.scope == topic.uid, Assessment.finished_at.is_(None))
                      .order_by(Assessment.id.desc()))
    rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == topic.uid))
    consolidation_due = rs.due_at.isoformat() if rs and p.state == "dominado" else None
    p.mastery = mastery.mastery_percent(p.state, rep, p.exam_score)
    guided_ok = sum(1 for a in topic_attempts(s, uid, topic.uid) if a.stage == "guiada" and a.correct and not a.assisted)
    return {
        "topic_uid": topic.uid, "stage": p.stage, "stage_label": STAGE_LABELS[p.stage], "state": p.state, "level": p.level,
        "mastery": p.mastery, "accuracy": round(rep.accuracy * 100, 1), "unassisted": rep.unassisted,
        "stages": [{"id": st, "label": STAGE_LABELS[st], "done": STAGES.index(st) < STAGES.index(p.stage)} for st in STAGES],
        "sections_passed": p.sections_passed, "sections_total": len(topic.lesson.sections) if topic.lesson else 0,
        "requirements": reasons if p.stage == "independiente" else [],
        "ready_for_assessment": ready and p.stage == "independiente",
        "guided_progress": {"done": min(guided_ok, GUIDED_REQUIRED_CORRECT), "needed": GUIDED_REQUIRED_CORRECT},
        "active_assessment": active.id if active else None,
        "consolidation_due": consolidation_due,
        "consolidation_available": bool(rs and p.state == "dominado" and rs.due_at <= now()),
        "top_errors": [{"code": c, "title": t, "count": n} for c, t, n in rep.top_errors],
        "diagnostic_score": p.diagnostic_score, "exam_score": p.exam_score, "unlocked": is_unlocked(s, uid, topic),
    }


def complete_content_stage(s: Session, uid: int, topic: Topic, stage: str) -> dict[str, Any]:
    p = progress(s, uid, topic)
    assert p is not None
    events: list[dict] = []
    if stage == "diagnostico" and p.stage == "diagnostico":
        _set_stage(p, "intro")  # el estudiante decide saltar la evaluación inicial
    elif stage == "intro" and p.stage == "intro":
        _set_stage(p, "teoria")
    elif stage == "teoria" and p.stage == "teoria":
        total = len(topic.lesson.sections) if topic.lesson else 0
        if len(set(p.sections_passed)) < total:
            raise ValueError("Antes de continuar, responde correctamente la comprobación de cada sección.")
        _set_stage(p, "ejemplo")
        events.append(gm.award(s, uid, XP_STAGE, "Clase teórica completada", topic.uid))
    elif stage == "ejemplo" and p.stage == "ejemplo":
        _set_stage(p, "guiada")
    else:
        raise ValueError(f"No se puede completar «{stage}» desde la etapa «{p.stage}».")
    return {"stage": p.stage, "events": [e for e in events if e]}


def section_check(s: Session, uid: int, topic: Topic, index: int, option: int) -> dict[str, Any]:
    if not topic.lesson or not 0 <= index < len(topic.lesson.sections):
        raise ValueError("Sección inexistente")
    sec = topic.lesson.sections[index]
    ok = option == sec.check.answer
    p = progress(s, uid, topic)
    assert p is not None
    if p.state == "no_iniciado":
        p.state = "aprendiendo"
    if ok and index not in p.sections_passed:
        p.sections_passed = sorted({*p.sections_passed, index})
    return {"correct": ok, "explanation": sec.check.explanation, "correct_option": sec.check.answer if ok else None,
            "sections_passed": p.sections_passed}


# ------------------------------------------------- nivel adaptativo (práctica) --


def choose_level(s: Session, uid: int, topic: Topic, p: TopicProgress) -> tuple[int, tuple[str, str | None] | None]:
    """Nivel y (opcionalmente) generador preferido para reforzar un error."""
    atts = topic_attempts(s, uid, topic.uid)[-8:]
    if p.stage == "guiada":
        return 1, None
    lvl = p.level
    # refuerzo: si los dos últimos fallos comparten error, repetir ese tipo de ejercicio
    wrong = [a for a in atts if not a.correct][-2:]
    if len(wrong) == 2 and wrong[0].error_code and wrong[0].error_code == wrong[1].error_code and not wrong[0].generator_id.startswith("bank:"):
        return wrong[-1].level, (wrong[-1].generator_id, wrong[-1].variant)
    return lvl, None


def _adapt_level(s: Session, uid: int, topic: Topic, p: TopicProgress, max_level: int) -> dict | None:
    atts = [a for a in topic_attempts(s, uid, topic.uid) if a.stage == p.stage and not a.assisted]
    at_level = [a for a in atts if a.level == p.level]
    last = at_level[-4:]
    ok_variants = {_variant_key(a) for a in at_level if a.correct}
    need = min(2, len(variants_available(topic, p.level)))
    if p.level < max_level and len(last) == 4 and all(a.correct for a in last) and len(ok_variants) >= need:
        p.level += 1
        return {"level_up": p.level, "message": f"Has demostrado varias variantes del nivel {p.level - 1}. Pasamos al nivel {p.level}."}
    recent = atts[-3:]
    if p.level > 1 and len(recent) == 3 and not any(a.correct for a in recent):
        p.level -= 1
        return {"level_down": p.level, "message": "Volvamos un nivel atrás para afianzar la base. No pasa nada: así se aprende."}
    return None


def after_attempt(s: Session, uid: int, topic: Topic, rec: IssuedExercise, att: Attempt) -> list[dict]:
    """Efectos de un intento: XP, racha, cambios de nivel y de etapa."""
    events: list[dict] = []
    gm.record_study(s, uid, att.correct)
    xp = gm.xp_for_attempt(s, att)
    if xp:
        events.append(gm.award(s, uid, xp, "Respuesta correcta" + (" (con ayuda)" if att.assisted else ""), topic.uid))
    p = progress(s, uid, topic)
    assert p is not None
    if rec.mode == "academia" and rec.assessment_id is None:
        if p.stage == "guiada":
            ok = [a for a in topic_attempts(s, uid, topic.uid) if a.stage == "guiada" and a.correct and not a.assisted]
            if len(ok) >= GUIDED_REQUIRED_CORRECT:
                _set_stage(p, "independiente")
                p.level = 1
                events.append({"stage": "independiente", "message": "¡Bien! Ya resuelves solo los ejercicios básicos. Empieza la práctica independiente."})
                events.append(gm.award(s, uid, XP_STAGE, "Práctica guiada superada", topic.uid))
        elif p.stage == "independiente":
            ev = _adapt_level(s, uid, topic, p, max_level=2)
            if ev:
                events.append(ev)
    elif rec.mode == "practica":
        ev = _adapt_level(s, uid, topic, p, max_level=3) if p.state in ("dominado", "consolidado") else None
        if ev:
            events.append(ev)
    return events


# --------------------------------------------------------------- evaluaciones ---


def start_assessment(s: Session, uid: int, kind: str, scope: str) -> Assessment:
    cur = get_curriculum()
    rng = random.Random()
    plan: list[list[Any]] = []
    if kind in LEVEL_PLANS:
        topic = cur.topics[scope]
        p = progress(s, uid, topic)
        assert p is not None
        expected = {"diagnostico": "diagnostico", "intermedia": "intermedia", "desafio": "desafio", "examen": "examen",
                    "consolidacion": "consolidacion"}[kind]
        if kind == "consolidacion":
            rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == topic.uid))
            if p.state != "dominado" or not rs or rs.due_at > now():
                raise ValueError("El repaso de consolidación aún no está disponible: vuelve cuando haya pasado al menos un día.")
        elif kind == "intermedia" and p.stage == "independiente":
            # Desde la práctica independiente sólo se accede si se cumplen los requisitos de dominio.
            ready, reasons = report_for(s, uid, topic).ready(2, variants_needed(topic, 2))
            if not ready:
                raise ValueError("Todavía no: " + " ".join(reasons))
            _set_stage(p, "intermedia")
        elif p.stage != expected:
            raise ValueError(f"Esta evaluación corresponde a la etapa «{STAGE_LABELS[expected]}» y estás en «{STAGE_LABELS[p.stage]}».")
        plan = [[topic.uid, lvl] for lvl in LEVEL_PLANS[kind]]
    elif kind == "bloque":
        block = cur.blocks[scope]
        ts = list(block.topics)
        plan = [[rng.choice(ts).uid if i >= len(ts) else ts[i].uid, rng.choice([1, 2, 2, 3])] for i in range(ASSESSMENT_SIZES["bloque"])]
        rng.shuffle(plan)
    elif kind == "modulo":
        progs = all_progress(s, uid)
        pool = [t for t in cur.ordered_topics if t.module_id == scope and (progs.get(t.uid) and progs[t.uid].state in ("dominado", "consolidado"))]
        if len(pool) < 3:
            pool = [t for t in cur.ordered_topics if t.module_id == scope][: max(3, len(pool))]
        plan = [[rng.choice(pool).uid, rng.choice([1, 2, 3])] for _ in range(ASSESSMENT_SIZES["modulo"])]
    elif kind == "repaso":
        plan = review_plan(s, uid)
        if not plan:
            raise ValueError("No hay repasos pendientes ahora mismo. ¡Buen trabajo!")
    else:
        raise ValueError(f"Tipo de evaluación desconocido: {kind}")
    a = Assessment(user_id=uid, kind=kind, scope=scope, total=len(plan), plan=plan, time_limit_s=TIME_LIMITS.get(kind))
    s.add(a)
    s.flush()
    return a


def assessment_followup_slots(a: Assessment) -> set[int]:
    k = PROCEDURE_FOLLOWUPS.get(a.kind, 0)
    rng = random.Random(f"fu:{a.id}")
    return set(rng.sample(range(a.total), min(k, a.total)))


def next_assessment_item(s: Session, a: Assessment) -> tuple[Topic, int, bool] | None:
    issued = s.scalar(select(func.count()).select_from(IssuedExercise).where(IssuedExercise.assessment_id == a.id)) or 0
    pending = s.scalar(select(IssuedExercise).where(IssuedExercise.assessment_id == a.id, IssuedExercise.answered.is_(False)))
    if pending is not None or issued >= a.total:
        return None
    topic_uid, lvl = a.plan[issued]
    topic = get_curriculum().topics[topic_uid]
    followup = issued in assessment_followup_slots(a) and not topic.is_conceptual
    return topic, int(lvl), followup


def pending_assessment_exercise(s: Session, a: Assessment) -> IssuedExercise | None:
    return s.scalar(select(IssuedExercise).where(IssuedExercise.assessment_id == a.id, IssuedExercise.answered.is_(False)))


def register_assessment_answer(s: Session, a: Assessment, rec: IssuedExercise, correct: bool, followup_pending: bool) -> dict | None:
    if followup_pending:
        return None
    a.answered += 1
    a.correct += int(correct)
    if a.answered >= a.total:
        return finish_assessment(s, a)
    return None


def finish_assessment(s: Session, a: Assessment) -> dict[str, Any]:
    cur = get_curriculum()
    a.finished_at = now()
    score = a.correct / a.total if a.total else 0.0
    late = bool(a.time_limit_s and (a.finished_at - a.started_at).total_seconds() > a.time_limit_s)
    a.passed = score >= MASTERY_THRESHOLD and not late
    uid = a.user_id
    out: dict[str, Any] = {"assessment_id": a.id, "kind": a.kind, "score": round(score * 100, 1), "correct": a.correct, "total": a.total,
                           "passed": a.passed, "late": late, "events": []}
    ev: list[dict] = out["events"]
    if a.kind in LEVEL_PLANS:
        topic = cur.topics[a.scope]
        p = progress(s, uid, topic)
        assert p is not None
        if a.kind == "diagnostico":
            p.diagnostic_score = score
            if score == 1.0:
                _set_stage(p, "intermedia")
                out["message"] = ("Excelente: resolviste toda la evaluación inicial. Puedes ir directo a la evaluación intermedia "
                                  "(la lección sigue disponible en la biblioteca).")
            else:
                _set_stage(p, "intro")
                out["message"] = "Gracias. Con esto sé qué necesitas. Empecemos por la introducción del tema."
        elif a.kind == "intermedia":
            if a.passed:
                _set_stage(p, "desafio")
                p.level = 3
                ev.append(gm.award(s, uid, XP_STAGE, "Evaluación intermedia aprobada", topic.uid))
                out["message"] = "Aprobaste la evaluación intermedia. Ahora, el desafío avanzado (nivel 3)."
            else:
                _set_stage(p, "independiente")
                out["message"] = "Aún no alcanzas el 90 %. Revisa tus errores: te prepararé ejercicios de refuerzo."
        elif a.kind == "desafio":
            if a.passed:
                _set_stage(p, "examen")
                ev.append(gm.award(s, uid, XP_STAGE, "Desafío avanzado superado", topic.uid))
                out["message"] = "¡Desafío superado! Te espera el examen final del tema."
            else:
                _set_stage(p, "independiente")
                p.level = 2
                out["message"] = "El nivel avanzado aún cuesta. Practica más y vuelve a intentarlo."
        elif a.kind == "examen":
            p.exam_score = score
            rep = report_for(s, uid, topic)
            if a.passed and not rep.repeated_errors:
                p.state = "dominado"
                p.mastered_at = now()
                _set_stage(p, "consolidacion")
                p.state = "dominado"
                rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == topic.uid))
                if rs is None:
                    rs = ReviewSchedule(user_id=uid, topic_uid=topic.uid, due_at=now())
                    s.add(rs)
                rs.due_at = now() + timedelta(hours=CONSOLIDATION_DELAY_HOURS)
                ev.append(gm.award(s, uid, XP_MASTERED, f"Tema dominado: {topic.title}", topic.uid))
                out["message"] = ("Tema DOMINADO (provisional). Para consolidarlo, supera el repaso de consolidación a partir de mañana: "
                                  "así comprobamos que no se olvida.")
                block = cur.block_of(topic.uid)
                progs = all_progress(s, uid)
                if all(progs.get(t.uid) and progs[t.uid].state in ("dominado", "consolidado") for t in block.topics):
                    ev.append(gm.award(s, uid, XP_BLOCK, f"Bloque {block.number} dominado", None))
            else:
                _set_stage(p, "independiente")
                out["message"] = ("Aprobaste, pero sigues repitiendo un error: refuerza ese punto antes de dar el tema por dominado."
                                  if a.passed else "No alcanzaste el 90 %. Analicemos tus errores y refuerza con práctica.")
                if a.passed:
                    a.passed = False
        elif a.kind == "consolidacion":
            rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == topic.uid))
            assert rs is not None
            srs.update(rs, srs.quality_from_score(score), now())
            if a.passed:
                p.state = "consolidado"
                p.consolidated_at = now()
                _set_stage(p, "completado")
                p.state = "consolidado"
                ev.append(gm.award(s, uid, XP_CONSOLIDATED, f"Tema consolidado: {topic.title}", topic.uid))
                out["message"] = f"¡Tema CONSOLIDADO! Volverá a aparecer en tus repasos dentro de {rs.interval_days:g} día(s)."
            else:
                p.state = "en_practica"
                _set_stage(p, "independiente")
                out["message"] = "Has olvidado parte del tema. Es normal: practiquemos de nuevo y vuelve a examinarte."
    elif a.kind == "repaso":
        per: dict[str, list[bool]] = {}
        for rec in s.scalars(select(IssuedExercise).where(IssuedExercise.assessment_id == a.id)):
            per.setdefault(rec.topic_uid, []).append(bool(rec.correct) and rec.followup_correct is not False)
        for tuid, res in per.items():
            rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == tuid))
            if rs is None:
                rs = ReviewSchedule(user_id=uid, topic_uid=tuid, due_at=now())
                s.add(rs)
            srs.update(rs, srs.quality_from_score(sum(res) / len(res)), now())
        a.passed = None
        out["passed"] = None
        out["message"] = "Repaso registrado. Los temas que fallaste volverán pronto; los que dominas, más adelante."
    else:
        out["message"] = "Examen completado." if a.passed else "Examen completado. Revisa los temas en los que fallaste."
        if not a.passed:
            for rec in s.scalars(select(IssuedExercise).where(IssuedExercise.assessment_id == a.id, IssuedExercise.correct.is_(False))):
                rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.topic_uid == rec.topic_uid))
                if rs:
                    rs.due_at = now()
    ev[:] = [e for e in ev if e]
    ev.extend(gm.check_achievements(s, uid))
    return out


# ---------------------------------------------------------------- repaso ---


def review_plan(s: Session, uid: int, size: int = 8) -> list[list[Any]]:
    """Mezcla temas vencidos (repetición espaciada) y temas con errores recientes."""
    cur = get_curriculum()
    due = [r.topic_uid for r in s.scalars(select(ReviewSchedule).where(ReviewSchedule.user_id == uid, ReviewSchedule.due_at <= now())
                                         .order_by(ReviewSchedule.due_at))]
    progs = all_progress(s, uid)
    due = [t for t in due if t in cur.topics and progs.get(t) and progs[t].state == "consolidado"]
    since = now() - timedelta(days=14)
    errs = s.execute(select(Attempt.topic_uid, func.count()).where(Attempt.user_id == uid, Attempt.correct.is_(False), Attempt.created_at >= since)
                     .group_by(Attempt.topic_uid).order_by(func.count().desc()).limit(4)).all()
    weak = [t for t, _n in errs if t in cur.topics and t not in due]
    topics = due + weak
    if not topics:
        return []
    plan: list[list[Any]] = []
    i = 0
    while len(plan) < size:
        t = topics[i % len(topics)]
        lvl = progs[t].level if t in progs else 1
        plan.append([t, max(1, min(3, lvl))])
        i += 1
    return plan


def review_queue(s: Session, uid: int) -> dict[str, Any]:
    cur = get_curriculum()
    rows = s.scalars(select(ReviewSchedule).where(ReviewSchedule.user_id == uid).order_by(ReviewSchedule.due_at)).all()
    items = []
    for r in rows:
        t = cur.topics.get(r.topic_uid)
        if t:
            items.append({"topic_uid": t.uid, "title": t.title, "number": t.number, "due_at": r.due_at.isoformat(), "due": r.due_at <= now(),
                          "interval_days": r.interval_days, "reps": r.reps, "lapses": r.lapses})
    return {"items": items, "plan_size": len(review_plan(s, uid))}
