"""Rutas HTTP (capa delgada): validan la entrada y delegan en los servicios."""

from __future__ import annotations

import random
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from mathlab_engine.core.bank import BANK_PREFIX
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..curriculum.loader import Topic, get_curriculum
from ..db.models import Assessment, ChallengeRun, IssuedExercise
from ..db.session import get_session
from ..services import exercises as exs
from ..services import flow, stats
from ..services import gamification as gm

router = APIRouter(prefix="/api")
UID = 1  # plataforma personal: un único estudiante (preparado para más)


def _topic(uid: str) -> Topic:
    t = get_curriculum().topics.get(uid)
    if t is None:
        raise HTTPException(404, f"Tema inexistente: {uid}")
    return t


def _bad(e: Exception) -> HTTPException:
    return HTTPException(409, str(e))


# ------------------------------------------------------------ currículo ---


@router.get("/curriculum")
def get_map(s: Session = Depends(get_session)) -> dict[str, Any]:
    out = stats.curriculum_map(s, UID)
    s.commit()
    return out


@router.get("/topics/{uid}")
def get_topic(uid: str, s: Session = Depends(get_session)) -> dict[str, Any]:
    t = _topic(uid)
    block = get_curriculum().block_of(uid)
    prev = get_curriculum().previous(uid)
    lesson = t.lesson.model_dump() if t.lesson else None
    if lesson:
        for sec in lesson["sections"]:
            sec["check"] = {k: v for k, v in sec["check"].items() if k not in ("answer", "explanation")}
        lesson.pop("practice", None)
    example = None
    if t.gens:  # Fase C: ejemplo resuelto generado y verificado por el motor
        ex = exs.build_exercise(t, 1, random.Random(f"ejemplo:{uid}"))
        example = {"prompt": ex.prompt, "solution": exs.solution_view(ex)}
    elif t.lesson and t.lesson.practice:
        q = t.lesson.practice[0]
        example = {"prompt": q.question, "solution": {"steps": [{"title": "Razonamiento", "explanation": q.explanation, "why": "", "procedure": "", "property": ""}],
                                                       "final": q.options[q.answer], "exercise_name": "Pregunta de comprensión",
                                                       "procedure_name": "Razonamiento conceptual", "properties": [], "workspace": None}}
    state = flow.flow_state(s, UID, t)
    s.commit()
    return {"uid": t.uid, "number": t.number, "title": t.title, "block": {"uid": block.uid, "number": block.number, "title": block.title},
            "previous": {"uid": prev.uid, "title": prev.title, "number": prev.number} if prev else None,
            "lesson": lesson, "example": example, "flow": state, "conceptual": t.is_conceptual}


class SectionCheckIn(BaseModel):
    option: int


@router.post("/topics/{uid}/sections/{index}/check")
def check_section(uid: str, index: int, body: SectionCheckIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    try:
        out = flow.section_check(s, UID, _topic(uid), index, body.option)
    except ValueError as e:
        raise _bad(e) from e
    s.commit()
    return out


class StageIn(BaseModel):
    stage: str


@router.post("/topics/{uid}/complete-stage")
def complete_stage(uid: str, body: StageIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    t = _topic(uid)
    if not flow.is_unlocked(s, UID, t):
        raise HTTPException(403, "Tema bloqueado: domina primero el tema anterior.")
    try:
        out = flow.complete_content_stage(s, UID, t, body.stage)
    except ValueError as e:
        raise _bad(e) from e
    out["events"].extend(gm.check_achievements(s, UID))
    s.commit()
    return out


# ------------------------------------------------------------ ejercicios ---


class NextIn(BaseModel):
    topic_uid: str | None = None
    mode: str = Field(pattern="^(academia|practica|desafio)$")
    level: int | None = Field(default=None, ge=1, le=3)


@router.post("/exercises/next")
def next_exercise(body: NextIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    if not body.topic_uid:
        raise HTTPException(422, "Falta el tema")
    t = _topic(body.topic_uid)
    if not flow.is_unlocked(s, UID, t):
        raise HTTPException(403, "Tema bloqueado: domina primero el tema anterior.")
    p = flow.progress(s, UID, t)
    assert p is not None
    prefer = None
    if body.mode == "academia":
        if p.stage not in ("guiada", "independiente"):
            raise HTTPException(409, f"En la etapa «{flow.STAGE_LABELS[p.stage]}» no hay práctica libre.")
        level, prefer = flow.choose_level(s, UID, t, p)
        stage = p.stage
    else:
        level = body.level or (p.level if body.mode == "practica" else 1)
        stage = None
    try:
        rec, ex = exs.issue(s, UID, t, level, body.mode, stage=stage, prefer=prefer)
    except exs.TopicHasNoExercises as e:
        raise HTTPException(409, "Este tema aún no tiene ejercicios disponibles (falta su banco de preguntas).") from e
    out = exs.public_view(rec, ex, t)
    s.commit()
    return out


class AnswerIn(BaseModel):
    answer: Any
    time_ms: int | None = Field(default=None, ge=0)


def _rec(s: Session, ex_id: str) -> IssuedExercise:
    rec = s.get(IssuedExercise, ex_id)
    if rec is None or rec.user_id != UID:
        raise HTTPException(404, "Ejercicio inexistente")
    return rec


@router.post("/exercises/{ex_id}/answer")
def answer(ex_id: str, body: AnswerIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    rec = _rec(s, ex_id)
    if rec.answered:
        raise HTTPException(409, "Este ejercicio ya fue respondido.")
    t = _topic(rec.topic_uid)
    out = exs.grade(s, rec, body.answer, body.time_ms)
    if out.payload.get("help_requested"):
        if rec.assessment_id:
            raise HTTPException(409, "En las evaluaciones no hay ayuda. Si no lo sabes, responde lo que creas y luego repasaremos.")
        payload = {"help": exs.help_rung(rec)}
        s.commit()
        return payload
    if not out.parsed:
        return out.payload
    assert out.attempt is not None
    events = flow.after_attempt(s, UID, t, rec, out.attempt)
    payload = out.payload
    if rec.assessment_id:
        a = s.get(Assessment, rec.assessment_id)
        assert a is not None
        followup_pending = bool(payload.get("followup"))
        result = flow.register_assessment_answer(s, a, rec, out.correct, followup_pending)
        payload["assessment"] = {"id": a.id, "answered": a.answered, "total": a.total, "result": result}
        # en evaluación no se muestra la solución completa hasta terminar
    events.extend(gm.check_achievements(s, UID))
    payload["events"] = [e for e in events if e]
    payload["flow"] = flow.flow_state(s, UID, t)
    s.commit()
    return payload


@router.post("/exercises/{ex_id}/help")
def help_(ex_id: str, s: Session = Depends(get_session)) -> dict[str, Any]:
    rec = _rec(s, ex_id)
    if rec.assessment_id:
        raise HTTPException(409, "En las evaluaciones no hay ayuda. Responde lo que creas: después repasaremos juntos.")
    if rec.answered:
        raise HTTPException(409, "El ejercicio ya está resuelto: revisa la solución paso a paso.")
    out = exs.help_rung(rec)
    s.commit()
    return out


class StepIn(BaseModel):
    step_index: int
    answer: Any


@router.post("/exercises/{ex_id}/step")
def step(ex_id: str, body: StepIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    rec = _rec(s, ex_id)
    if rec.assessment_id:
        raise HTTPException(409, "No disponible durante una evaluación.")
    try:
        out = exs.check_step(s, rec, body.step_index, body.answer)
    except ValueError as e:
        raise _bad(e) from e
    s.commit()
    return out


class FollowupIn(BaseModel):
    option: str


@router.post("/exercises/{ex_id}/followup")
def followup(ex_id: str, body: FollowupIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    rec = _rec(s, ex_id)
    if not rec.followup_required or not rec.answered or rec.followup_correct is not None:
        raise HTTPException(409, "No hay pregunta de procedimiento pendiente.")
    out = exs.check_followup(rec, body.option)
    if rec.assessment_id:
        a = s.get(Assessment, rec.assessment_id)
        assert a is not None
        result = flow.register_assessment_answer(s, a, rec, bool(rec.correct) and out["correct"], False)
        out["assessment"] = {"id": a.id, "answered": a.answered, "total": a.total, "result": result}
    s.commit()
    return out


@router.get("/exercises/{ex_id}/review")
def review_exercise(ex_id: str, s: Session = Depends(get_session)) -> dict[str, Any]:
    """Revisar un ejercicio antiguo (p. ej. desde el historial de errores)."""
    rec = _rec(s, ex_id)
    if rec.assessment_id:
        a = s.get(Assessment, rec.assessment_id)
        if a and a.finished_at is None:
            raise HTTPException(409, "Disponible al terminar la evaluación.")
    ex = exs.rebuild(rec)
    t = _topic(rec.topic_uid)
    return {"exercise": exs.public_view(rec, ex, t), "solution": exs.solution_view(ex)}


# ----------------------------------------------------------- evaluaciones ---


class AssessIn(BaseModel):
    kind: str = Field(pattern="^(diagnostico|intermedia|desafio|examen|consolidacion|bloque|modulo|repaso)$")
    scope: str = ""


@router.post("/assessments")
def start(body: AssessIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    cur = get_curriculum()
    scope = body.scope or ("mat01" if body.kind in ("modulo", "repaso") else "")
    if body.kind in flow.LEVEL_PLANS:
        t = _topic(scope)
        if not flow.is_unlocked(s, UID, t):
            raise HTTPException(403, "Tema bloqueado.")
    elif body.kind == "bloque" and scope not in cur.blocks:
        raise HTTPException(404, "Bloque inexistente")
    active = s.scalar(select(Assessment).where(Assessment.user_id == UID, Assessment.kind == body.kind, Assessment.scope == scope,
                                               Assessment.finished_at.is_(None)))
    if active:
        return _assessment_view(s, active)
    try:
        a = flow.start_assessment(s, UID, body.kind, scope)
    except ValueError as e:
        raise _bad(e) from e
    s.commit()
    return _assessment_view(s, a)


def _assessment_view(s: Session, a: Assessment) -> dict[str, Any]:
    return {"id": a.id, "kind": a.kind, "scope": a.scope, "scope_title": stats._scope_title(a.scope), "total": a.total, "answered": a.answered,
            "correct": a.correct if a.finished_at else None, "finished": a.finished_at is not None, "passed": a.passed,
            "time_limit_s": a.time_limit_s, "started_at": a.started_at.isoformat()}


@router.get("/assessments/{aid}")
def get_assessment(aid: int, s: Session = Depends(get_session)) -> dict[str, Any]:
    a = s.get(Assessment, aid)
    if a is None or a.user_id != UID:
        raise HTTPException(404, "Evaluación inexistente")
    view = _assessment_view(s, a)
    if a.finished_at:
        recs = s.scalars(select(IssuedExercise).where(IssuedExercise.assessment_id == a.id).order_by(IssuedExercise.created_at)).all()
        view["items"] = [{"exercise_id": r.id, "topic_uid": r.topic_uid, "correct": bool(r.correct) and r.followup_correct is not False,
                          "level": r.level} for r in recs]
    return view


@router.post("/assessments/{aid}/next")
def assessment_next(aid: int, s: Session = Depends(get_session)) -> dict[str, Any]:
    a = s.get(Assessment, aid)
    if a is None or a.user_id != UID:
        raise HTTPException(404, "Evaluación inexistente")
    if a.finished_at:
        raise HTTPException(409, "La evaluación ya terminó.")
    pending = flow.pending_assessment_exercise(s, a)
    if pending:
        t = _topic(pending.topic_uid)
        return exs.public_view(pending, exs.rebuild(pending), t)
    item = flow.next_assessment_item(s, a)
    if item is None:
        raise HTTPException(409, "Responde la pregunta de procedimiento pendiente.")
    t, level, fu = item
    rec, ex = exs.issue(s, UID, t, level, "examen" if a.kind not in ("repaso",) else "repaso",
                        stage=a.kind if a.kind in flow.ASSESSMENT_STAGES else None, assessment_id=a.id, followup=fu)
    out = exs.public_view(rec, ex, t)
    out["position"] = (s.scalar(select(func.count()).select_from(IssuedExercise).where(IssuedExercise.assessment_id == a.id)) or 1)
    out["total"] = a.total
    s.commit()
    return out


# --------------------------------------------------------------- desafío ---


class ChallengeIn(BaseModel):
    scope: str
    score: int = Field(ge=0)
    max_level: int = Field(ge=1, le=3)


@router.post("/challenge/finish")
def challenge_finish(body: ChallengeIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    s.add(ChallengeRun(user_id=UID, scope=body.scope, score=body.score, max_level=body.max_level))
    s.flush()
    events = [gm.award(s, UID, body.score * 2, "Modo Desafío")] if body.score else []
    events.extend(gm.check_achievements(s, UID))
    best = s.scalar(select(func.max(ChallengeRun.score)).where(ChallengeRun.user_id == UID, ChallengeRun.scope == body.scope))
    s.commit()
    return {"best": best, "events": [e for e in events if e]}


# ----------------------------------------------------- panel, stats, repaso ---


@router.get("/dashboard")
def dashboard(s: Session = Depends(get_session)) -> dict[str, Any]:
    return stats.dashboard(s, UID)


@router.get("/stats")
def get_stats(s: Session = Depends(get_session)) -> dict[str, Any]:
    return stats.statistics(s, UID)


@router.get("/errors")
def get_errors(s: Session = Depends(get_session)) -> dict[str, Any]:
    return stats.error_history(s, UID)


@router.get("/achievements")
def get_achievements(s: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return stats.achievements(s, UID)


@router.get("/review")
def get_review(s: Session = Depends(get_session)) -> dict[str, Any]:
    return flow.review_queue(s, UID)


@router.get("/glossary")
def glossary() -> list[dict[str, Any]]:
    out = []
    for t in get_curriculum().ordered_topics:
        if t.lesson:
            for g in t.lesson.glossary:
                out.append({"term": g.term, "definition": g.definition, "topic_uid": t.uid, "topic": f"{t.number} {t.title}"})
    return sorted(out, key=lambda x: x["term"].lower())


class SettingsIn(BaseModel):
    explorer: bool | None = None
    name: str | None = Field(default=None, max_length=80)


@router.get("/settings")
def get_settings(s: Session = Depends(get_session)) -> dict[str, Any]:
    u = flow.user(s, UID)
    return {"name": u.name, **u.settings}


@router.put("/settings")
def put_settings(body: SettingsIn, s: Session = Depends(get_session)) -> dict[str, Any]:
    u = flow.user(s, UID)
    st = dict(u.settings)
    if body.explorer is not None:
        st["explorer"] = body.explorer
    u.settings = st
    if body.name:
        u.name = body.name
    s.commit()
    return {"name": u.name, **u.settings}


@router.get("/health")
def health() -> dict[str, Any]:
    cur = get_curriculum()
    return {"ok": True, "blocks": len(cur.blocks), "topics": len(cur.topics), "curriculum_problems": len(cur.problems),
            "bank_prefix": BANK_PREFIX}
