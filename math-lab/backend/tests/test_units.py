"""Pruebas unitarias de dominio, repetición espaciada y gamificación."""

from __future__ import annotations

from datetime import datetime

from app.db.models import Attempt, ReviewSchedule
from app.services import mastery, srs
from app.services.gamification import level_for_xp


def _att(correct, level=1, variant="a", assisted=False, code=None):
    return Attempt(user_id=1, exercise_id="x", topic_uid="t", generator_id="g", level=level, variant=variant, mode="academia",
                   answer_raw="", correct=correct, error_code=code, error_title=code, assisted=assisted)


def test_mastery_requires_90_and_variety():
    atts = [_att(True, variant="a") for _ in range(12)]
    rep = mastery.compute(atts)
    ok, reasons = rep.ready(1, {1: 2})
    assert rep.accuracy == 1.0 and not ok  # sólo una variante → no basta
    atts += [_att(True, variant="b")]
    assert mastery.compute(atts).ready(1, {1: 2})[0]


def test_assisted_attempts_do_not_count():
    atts = [_att(True, assisted=True) for _ in range(20)]
    rep = mastery.compute(atts)
    assert rep.unassisted == 0 and not rep.ready(1, {1: 1})[0]


def test_repeated_error_blocks_mastery():
    atts = [_att(True, variant=v) for v in "abcdefghij"] + [_att(False, code="sin_llevar") for _ in range(3)]
    rep = mastery.compute(atts)
    ok, reasons = rep.ready(1, {1: 2})
    assert not ok and any("sin_llevar" in r for r in reasons)


def test_recent_attempts_weigh_more():
    old_bad = [_att(False) for _ in range(6)] + [_att(True, variant=str(i)) for i in range(6)]
    new_bad = [_att(True, variant=str(i)) for i in range(6)] + [_att(False) for _ in range(6)]
    assert mastery.compute(old_bad).accuracy > mastery.compute(new_bad).accuracy


def test_srs_intervals_grow_and_reset():
    rs = ReviewSchedule(user_id=1, topic_uid="t", due_at=datetime(2026, 1, 1), interval_days=1.0, ease=2.5, reps=0, lapses=0)
    t = datetime(2026, 1, 1)
    srs.update(rs, 5, t)
    assert rs.interval_days == 1
    srs.update(rs, 5, t)
    assert rs.interval_days == 3
    srs.update(rs, 5, t)
    assert rs.interval_days > 3
    srs.update(rs, 1, t)
    assert rs.interval_days == 1 and rs.lapses == 1


def test_levels_curve():
    assert level_for_xp(0)[0] == 1
    assert level_for_xp(100)[0] == 2
    assert level_for_xp(10_000)[0] > 5
