"""Pruebas de extremo a extremo del sistema de enseñanza (API + servicios)."""

from __future__ import annotations

from datetime import timedelta

from mathlab_engine.core.validate import canonical_input
from sqlalchemy import select

from app.db import session as dbs
from app.db.models import IssuedExercise, ReviewSchedule, now
from app.services import exercises as exs

T1, T2 = "mat01.b01.t01", "mat01.b01.t02"


def _correct_answer(ex_id: str):
    with dbs._SessionLocal() as s:  # type: ignore[misc]
        rec = s.get(IssuedExercise, ex_id)
        return canonical_input(exs.rebuild(rec).answer)


def _answer(client, ex, correct=True):
    ans = _correct_answer(ex["id"]) if correct else _wrong(ex)
    return client.post(f"/api/exercises/{ex['id']}/answer", json={"answer": ans, "time_ms": 1500}).json()


def _wrong(ex):
    kind = ex["answer"]["kind"]
    if kind == "choice":
        good = _correct_answer(ex["id"])
        return next(c["id"] for c in ex["answer"]["choices"] if c["id"] != good)
    if kind == "fields":
        return {f["key"]: "999999" for f in ex["answer"]["fields"]}
    return "999999"


def _do_assessment(client, kind, scope, correct=True):
    a = client.post("/api/assessments", json={"kind": kind, "scope": scope})
    assert a.status_code == 200, a.text
    a = a.json()
    result = None
    for _ in range(a["total"]):
        ex = client.post(f"/api/assessments/{a['id']}/next").json()
        r = _answer(client, ex, correct)
        if r.get("followup"):
            with dbs._SessionLocal() as s:  # type: ignore[misc]
                proc = exs.rebuild(s.get(IssuedExercise, ex["id"])).procedure_name
            r = client.post(f"/api/exercises/{ex['id']}/followup", json={"option": proc}).json()
        result = r["assessment"]["result"] or result
    assert result is not None
    return result


def _through_content(client, uid, n_sections):
    for i in range(n_sections):
        assert client.post(f"/api/topics/{uid}/sections/{i}/check", json={"option": 0}).json()["correct"]
    for st in ("intro", "teoria", "ejemplo"):
        r = client.post(f"/api/topics/{uid}/complete-stage", json={"stage": st})
        assert r.status_code == 200, r.text


def _practice_until(client, uid, stage_wanted, max_n=80):
    for _ in range(max_n):
        flow = client.get(f"/api/topics/{uid}").json()["flow"]
        if flow["stage"] == stage_wanted or flow.get("ready_for_assessment"):
            return flow
        ex = client.post("/api/exercises/next", json={"topic_uid": uid, "mode": "academia"}).json()
        _answer(client, ex, True)
    raise AssertionError("no se alcanzó la etapa")


def test_health_and_map(client):
    assert client.get("/api/health").json()["topics"] == 2
    m = client.get("/api/curriculum").json()
    topics = m["blocks"][0]["topics"]
    assert topics[0]["unlocked"] and not topics[1]["unlocked"]


def test_locked_topic_rejects_practice(client):
    r = client.post("/api/exercises/next", json={"topic_uid": T2, "mode": "practica"})
    assert r.status_code == 403


def test_teoria_requires_all_section_checks(client):
    client.post(f"/api/topics/{T2}/complete-stage", json={"stage": "diagnostico"})
    client.put("/api/settings", json={"explorer": True})
    client.post(f"/api/topics/{T2}/complete-stage", json={"stage": "diagnostico"})
    client.post(f"/api/topics/{T2}/complete-stage", json={"stage": "intro"})
    r = client.post(f"/api/topics/{T2}/complete-stage", json={"stage": "teoria"})
    assert r.status_code == 409  # sin comprobaciones aprobadas no se avanza
    assert not client.post(f"/api/topics/{T2}/sections/0/check", json={"option": 1}).json()["correct"]


def test_full_flow_to_consolidated(client):
    # Fase: diagnóstico (se salta), contenido, guiada, independiente…
    client.post(f"/api/topics/{T1}/complete-stage", json={"stage": "diagnostico"})
    _through_content(client, T1, 1)
    flow = _practice_until(client, T1, "independiente")
    assert flow["stage"] in ("independiente",)
    flow = _practice_until(client, T1, "intermedia")
    assert flow["ready_for_assessment"], flow["requirements"]
    # no se puede adelantar el examen final
    assert client.post("/api/assessments", json={"kind": "examen", "scope": T1}).status_code == 409
    assert _do_assessment(client, "intermedia", T1)["passed"]
    assert _do_assessment(client, "desafio", T1)["passed"]
    res = _do_assessment(client, "examen", T1)
    assert res["passed"]
    flow = client.get(f"/api/topics/{T1}").json()["flow"]
    assert flow["state"] == "dominado" and not flow["consolidation_available"]
    # El siguiente tema queda desbloqueado
    assert client.get("/api/curriculum").json()["blocks"][0]["topics"][1]["unlocked"]
    # El repaso de consolidación exige esperar
    assert client.post("/api/assessments", json={"kind": "consolidacion", "scope": T1}).status_code == 409
    with dbs._SessionLocal() as s:  # type: ignore[misc]
        rs = s.scalar(select(ReviewSchedule).where(ReviewSchedule.topic_uid == T1))
        rs.due_at = now() - timedelta(minutes=1)
        s.commit()
    assert _do_assessment(client, "consolidacion", T1)["passed"]
    flow = client.get(f"/api/topics/{T1}").json()["flow"]
    assert flow["state"] == "consolidado" and flow["mastery"] == 100.0
    dash = client.get("/api/dashboard").json()
    assert dash["consolidated"] == 1 and dash["xp"] > 0
    codes = {a["code"] for a in client.get("/api/achievements").json() if a["unlocked_at"]}
    assert {"primer_paso", "primer_dominio", "consolidado"} <= codes


def test_failed_exam_returns_to_practice(client):
    client.post(f"/api/topics/{T1}/complete-stage", json={"stage": "diagnostico"})
    _through_content(client, T1, 1)
    _practice_until(client, T1, "independiente")
    _practice_until(client, T1, "intermedia")
    res = _do_assessment(client, "intermedia", T1, correct=False)
    assert not res["passed"]
    assert client.get(f"/api/topics/{T1}").json()["flow"]["stage"] == "independiente"


def test_help_mode_and_assisted_attempts(client):
    client.put("/api/settings", json={"explorer": True})
    ex = client.post("/api/exercises/next", json={"topic_uid": T2, "mode": "practica", "level": 2}).json()
    # Escribir «no sé» activa la ayuda en vez de contar como error
    r = client.post(f"/api/exercises/{ex['id']}/answer", json={"answer": "NO SÉ"}).json()
    assert r["help"]["kind"] == "concept"
    r = client.post(f"/api/exercises/{ex['id']}/help").json()
    assert r["kind"] == "step" and r["revealed"]
    if r["your_turn"]:
        with dbs._SessionLocal() as s:  # type: ignore[misc]
            e = exs.rebuild(s.get(IssuedExercise, ex["id"]))
        j = r["your_turn"]["step_index"]
        ok = client.post(f"/api/exercises/{ex['id']}/step", json={"step_index": j, "answer": canonical_input(e.solution[j].answer)}).json()
        assert ok["correct"]
    r = _answer(client, ex, True)
    assert r["correct"] and r["assisted"]


def test_misconception_diagnosis(client):
    client.put("/api/settings", json={"explorer": True})
    for _ in range(20):
        ex = client.post("/api/exercises/next", json={"topic_uid": T2, "mode": "practica", "level": 1}).json()
        with dbs._SessionLocal() as s:  # type: ignore[misc]
            e = exs.rebuild(s.get(IssuedExercise, ex["id"]))
        m = next((m for m in e.misconceptions if m.code == "sin_llevar"), None)
        if m:
            r = client.post(f"/api/exercises/{ex['id']}/answer", json={"answer": str(m.value)}).json()
            assert not r["correct"] and r["diagnosis"]["code"] == "sin_llevar"
            assert r["solution"]["steps"]
            errs = client.get("/api/errors").json()
            assert errs["frequent"][0]["code"] == "sin_llevar"
            return
    raise AssertionError("no apareció el error típico")


def test_unparseable_answer_is_not_an_attempt(client):
    client.put("/api/settings", json={"explorer": True})
    ex = client.post("/api/exercises/next", json={"topic_uid": T2, "mode": "practica"}).json()
    r = client.post(f"/api/exercises/{ex['id']}/answer", json={"answer": "hola"}).json()
    assert r["parsed"] is False
    assert client.get("/api/dashboard").json()["attempts"] == 0


def test_no_help_during_assessment(client):
    a = client.post("/api/assessments", json={"kind": "diagnostico", "scope": T1}).json()
    ex = client.post(f"/api/assessments/{a['id']}/next").json()
    assert client.post(f"/api/exercises/{ex['id']}/help").status_code == 409


def test_perfect_diagnostic_fast_tracks_but_still_requires_exams(client):
    res = _do_assessment(client, "diagnostico", T1)
    assert res["passed"]
    flow = client.get(f"/api/topics/{T1}").json()["flow"]
    assert flow["stage"] == "intermedia" and flow["state"] != "dominado"


def test_block_exam_and_review(client):
    res = _do_assessment(client, "bloque", "mat01.b01")
    assert res["total"] == 15
    assert client.get("/api/stats").json()["assessments"]
