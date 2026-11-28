"""Servicio de ejercicios: elegir, entregar, corregir y ayudar.

Une el motor matemático (puro) con la persistencia. Aquí se decide QUÉ
generador usar para un tema y nivel, se guarda el ejercicio entregado y se
corrige la respuesta con el motor (nunca con IA).
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from mathlab_engine import REGISTRY, generate, is_help_request, validate_exercise, validate_step
from mathlab_engine.core.bank import BANK_PREFIX, exercise_from_bank
from mathlab_engine.core.types import AnswerSpec, Exercise, to_jsonable
from mathlab_engine.core.validate import canonical_input, validate
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..curriculum.loader import GenRef, Topic, get_curriculum
from ..db.models import Attempt, IssuedExercise, StepAttempt

# ------------------------------------------------------------ selección -----


class TopicHasNoExercises(Exception):
    pass


def _resolve_level(ref: GenRef, level: int) -> tuple[int, str | None]:
    """Nivel efectivo y variante forzada (ver docs/architecture.md §Selección)."""
    info = REGISTRY[ref.gen_id]
    if not ref.variant:
        return level, None
    levels = sorted(lv for lv, vs in info.variants.items() if ref.variant in vs)
    if level in levels:
        return level, ref.variant
    if level > max(levels):
        return level, None  # nivel superior: variantes más difíciles del mismo generador
    return levels[0], ref.variant


def bank_items(topic: Topic, level: int | None = None) -> list[tuple[int, dict[str, Any]]]:
    if not topic.lesson:
        return []
    items = [(i, q.model_dump()) for i, q in enumerate(topic.lesson.practice)]
    if level is not None:
        lv = [it for it in items if it[1]["level"] == level] or [it for it in items if it[1]["level"] <= level] or items
        return lv
    return items


def build_exercise(topic: Topic, level: int, rng: random.Random, prefer: tuple[str, str | None] | None = None,
                   avoid: set[str] | None = None) -> Exercise:
    """Elige generador/variante para el tema y produce un ejercicio nuevo."""
    seed = rng.randint(0, 2**31 - 1)
    if topic.is_conceptual:
        items = bank_items(topic, level)
        if not items:
            raise TopicHasNoExercises(topic.uid)
        fresh = [it for it in items if str(it[0]) not in (avoid or set())] or items
        idx, item = rng.choice(fresh)
        return exercise_from_bank(topic.uid, idx, item, seed)
    if prefer and prefer[0] in REGISTRY:
        gid, variant = prefer
        lvl = level
        if variant and not any(variant in vs for lv_, vs in REGISTRY[gid].variants.items() if lv_ == level):
            lvl = next(lv_ for lv_, vs in sorted(REGISTRY[gid].variants.items()) if variant in vs)
        return generate(gid, lvl, seed, variant)
    ref = rng.choice(topic.gens)
    lvl, variant = _resolve_level(ref, level)
    return generate(ref.gen_id, lvl, seed, variant)


def rebuild(rec: IssuedExercise) -> Exercise:
    if rec.generator_id.startswith(BANK_PREFIX):
        topic = get_curriculum().topics[rec.generator_id[len(BANK_PREFIX):]]
        item = dict(bank_items(topic))[int(rec.variant)]
        return exercise_from_bank(topic.uid, int(rec.variant), item, rec.seed)
    return generate(rec.generator_id, rec.level, rec.seed, rec.variant)


def issue(s: Session, user_id: int, topic: Topic, level: int, mode: str, stage: str | None = None,
          assessment_id: int | None = None, prefer: tuple[str, str | None] | None = None,
          followup: bool = False) -> tuple[IssuedExercise, Exercise]:
    recent = s.scalars(select(IssuedExercise.variant).where(IssuedExercise.user_id == user_id,
                                                            IssuedExercise.topic_uid == topic.uid)
                       .order_by(IssuedExercise.created_at.desc()).limit(4)).all()
    rng = random.Random()
    ex = build_exercise(topic, level, rng, prefer=prefer, avoid=set(recent))
    rec = IssuedExercise(id=str(uuid.uuid4()), user_id=user_id, topic_uid=topic.uid, generator_id=ex.generator_id,
                         version=ex.version, seed=ex.seed, level=ex.level, variant=ex.variant, mode=mode, stage=stage,
                         assessment_id=assessment_id, followup_required=followup)
    s.add(rec)
    s.flush()
    return rec, ex


# ---------------------------------------------------------- serialización ---


def spec_public(spec: AnswerSpec) -> dict[str, Any]:
    """La forma de la respuesta SIN el valor correcto."""
    return {
        "kind": spec.kind, "form": spec.form, "unit": spec.unit, "placeholder": spec.placeholder,
        "choices": [{"id": c.id, "label": c.label} for c in spec.choices],
        "fields": [{"key": k, "label": lab, "kind": sub.kind, "unit": sub.unit} for k, lab, sub in spec.fields],
        "ordered": spec.ordered,
    }


def public_view(rec: IssuedExercise, ex: Exercise, topic: Topic) -> dict[str, Any]:
    ws = to_jsonable(ex.workspace) if ex.workspace else None
    if ws and ws.get("type") in ("column", "division"):
        # La pizarra recibe los operandos; el resultado se oculta hasta corregir.
        ws = {k: v for k, v in ws.items() if k not in ("result", "quotient", "remainder", "partials")}
    return {
        "id": rec.id, "topic_uid": topic.uid, "topic_title": topic.title, "topic_number": topic.number,
        "level": ex.level, "mode": rec.mode, "stage": rec.stage, "prompt": ex.prompt, "answer": spec_public(ex.answer),
        "exercise_name": ex.exercise_name, "hints_available": len(ex.hints) + len(ex.solution), "workspace": ws,
        "help_level": rec.help_level, "assessment_id": rec.assessment_id,
    }


def solution_view(ex: Exercise) -> dict[str, Any]:
    return {
        "steps": [{"title": st.title, "explanation": st.explanation, "why": st.why, "procedure": st.procedure,
                   "property": st.property} for st in ex.solution],
        "final": ex.final_answer_text, "exercise_name": ex.exercise_name, "procedure_name": ex.procedure_name,
        "properties": list(ex.properties), "workspace": to_jsonable(ex.workspace) if ex.workspace else None,
    }


# --------------------------------------------------------------- corrección ---


@dataclass
class GradeOutcome:
    correct: bool
    parsed: bool
    payload: dict[str, Any]
    attempt: Attempt | None


def _raw_text(answer: Any) -> str:
    import json

    return answer if isinstance(answer, str) else json.dumps(answer, ensure_ascii=False)


def grade(s: Session, rec: IssuedExercise, answer: Any, time_ms: int | None) -> GradeOutcome:
    ex = rebuild(rec)
    if is_help_request(answer):
        return GradeOutcome(False, False, {"help_requested": True}, None)
    res = validate_exercise(ex, answer)
    if not res.parsed:
        # Formato no reconocido: no cuenta como intento, se explica cómo escribirlo.
        return GradeOutcome(False, False, {"parsed": False, "message": res.message}, None)
    assisted = rec.help_level > 0
    att = Attempt(user_id=rec.user_id, exercise_id=rec.id, topic_uid=rec.topic_uid, generator_id=rec.generator_id,
                  level=rec.level, variant=rec.variant, mode=rec.mode, stage=rec.stage, answer_raw=_raw_text(answer),
                  correct=res.correct, error_code=res.diagnosis.code if res.diagnosis else (None if res.correct else "desconocido"),
                  error_title=res.diagnosis.title if res.diagnosis else None, assisted=assisted, time_ms=time_ms)
    s.add(att)
    rec.answered = True
    rec.correct = res.correct
    payload: dict[str, Any] = {
        "parsed": True, "correct": res.correct, "message": res.message, "assisted": assisted,
        "diagnosis": to_jsonable(res.diagnosis) if res.diagnosis else None, "format_issue": res.format_issue,
        "field_results": res.field_results, "correct_answer": ex.final_answer_text,
        "solution": solution_view(ex),
    }
    if rec.followup_required and res.correct:
        payload["followup"] = procedure_question(ex, rec.seed)
    return GradeOutcome(res.correct, True, payload, att)


# --------------------------------------------------------------- modo ayuda ---


def help_rung(rec: IssuedExercise) -> dict[str, Any]:
    """Siguiente peldaño de la escalera de ayuda (Fase E).

    0 → recordatorio del concepto (pistas)
    1..n → se revela el paso k y, si el paso k+1 es interactivo, se pide al
           estudiante que lo haga él
    n+1 → solución completa
    (+ sugerencia de un ejercicio más sencillo)
    """
    ex = rebuild(rec)
    rec.help_level += 1
    lvl = rec.help_level
    steps = ex.solution
    if lvl == 1:
        return {"kind": "concept", "help_level": lvl, "hints": list(ex.hints) or ["Repasa la definición del tema en la lección."],
                "exercise_name": ex.exercise_name, "procedure_name": ex.procedure_name,
                "message": "Vamos por partes. Primero recordemos la idea clave."}
    k = lvl - 2  # índice del paso que se revela
    if k < len(steps):
        shown = [{"title": st.title, "explanation": st.explanation, "why": st.why, "procedure": st.procedure, "property": st.property}
                 for st in steps[: k + 1]]
        nxt = None
        for j in range(k + 1, len(steps)):
            if steps[j].answer is not None and steps[j].prompt:
                nxt = {"step_index": j, "title": steps[j].title, "prompt": steps[j].prompt, "answer": spec_public(steps[j].answer)}
                break
        return {"kind": "step", "help_level": lvl, "revealed": shown, "your_turn": nxt, "total_steps": len(steps),
                "message": "Te muestro este paso y te explico por qué. Intenta tú el siguiente." if nxt else "Este es el último paso."}
    return {"kind": "solution", "help_level": lvl, "solution": solution_view(ex),
            "simpler": {"generator": ex.simpler[0], "level": ex.simpler[1]} if ex.simpler else None,
            "message": "Aquí tienes la solución completa. Después te propondré un ejercicio parecido y más sencillo."}


def check_step(s: Session, rec: IssuedExercise, step_index: int, answer: Any) -> dict[str, Any]:
    ex = rebuild(rec)
    if not 0 <= step_index < len(ex.solution) or ex.solution[step_index].answer is None:
        raise ValueError("Paso no interactivo")
    res = validate_step(ex, step_index, answer)
    s.add(StepAttempt(exercise_id=rec.id, step_index=step_index, answer_raw=_raw_text(answer), correct=res.correct))
    st = ex.solution[step_index]
    return {"parsed": res.parsed, "correct": res.correct, "message": res.message if res.parsed else res.message,
            "step": {"title": st.title, "explanation": st.explanation, "why": st.why} if res.correct else None,
            "expected": canonical_input(st.answer) if (res.parsed and not res.correct) else None}


# -------------------------------------------------- pregunta de procedimiento ---


@lru_cache(maxsize=1)
def _procedure_pool() -> tuple[str, ...]:
    names = set()
    for gid in REGISTRY:
        try:
            names.add(generate(gid, 1, 0).procedure_name)
        except Exception:  # noqa: BLE001
            continue
    return tuple(sorted(names))


def procedure_question(ex: Exercise, seed: int) -> dict[str, Any]:
    """«¿Qué procedimiento usaste?» — demuestra comprensión, no sólo el resultado."""
    rng = random.Random(f"proc:{ex.generator_id}:{seed}")
    pool = [p for p in _procedure_pool() if p != ex.procedure_name and p.split()[0] != ex.procedure_name.split()[0]]
    options = [ex.procedure_name, *rng.sample(pool, 3)]
    rng.shuffle(options)
    return {"question": "¿Qué procedimiento utilizaste para resolver este ejercicio?", "options": options}


def check_followup(rec: IssuedExercise, option: str) -> dict[str, Any]:
    ex = rebuild(rec)
    ok = option == ex.procedure_name
    rec.followup_correct = ok
    return {"correct": ok, "procedure_name": ex.procedure_name,
            "message": "Correcto: sabes nombrar lo que hiciste." if ok else f"El procedimiento era: «{ex.procedure_name}»."}


def validate_raw(spec: AnswerSpec, raw: Any) -> bool:
    return validate(spec, raw).correct
