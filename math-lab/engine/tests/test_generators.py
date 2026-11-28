"""Pruebas de PROPIEDAD de todos los generadores.

Para cada generador, nivel y variante, y para muchas semillas:
1. El ejercicio se genera sin errores y de forma reproducible.
2. La respuesta correcta, escrita como la escribiría el estudiante, se valida
   como correcta (mismo camino de código que en producción).
3. Cada paso interactivo de la solución también se valida.
4. Ningún error típico (misconception) coincide con la respuesta correcta.
5. Las opciones de elección múltiple son únicas y la correcta está presente.
"""

from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from mathlab_engine import REGISTRY, generate, validate_exercise
from mathlab_engine.core.registry import _ensure_loaded
from mathlab_engine.core.validate import canonical_input, validate, values_equal

_ensure_loaded()

CASES = [(gid, lvl, v) for gid, info in sorted(REGISTRY.items()) for lvl, vs in info.variants.items() for v in vs]


def _check(ex):
    assert ex.prompt.strip(), "enunciado vacío"
    assert ex.solution, "sin pasos de solución"
    assert ex.exercise_name and ex.procedure_name
    r = validate_exercise(ex, canonical_input(ex.answer))
    assert r.correct, f"la respuesta correcta no valida: {r.message} · {ex.prompt}"
    for st_ in ex.solution:
        if st_.answer is not None:
            assert validate(st_.answer, canonical_input(st_.answer)).correct, st_.title
    for m in ex.misconceptions:
        assert not values_equal(ex.answer, m.value), f"misconception {m.code} igual a la respuesta"
    if ex.answer.kind in ("choice", "multichoice"):
        labels = [c.label for c in ex.answer.choices]
        assert len(labels) == len(set(labels)), f"opciones duplicadas: {labels}"
        assert len(labels) >= 2


@pytest.mark.parametrize(("gid", "level", "variant"), CASES)
def test_generator_many_seeds(gid, level, variant):
    for seed in range(60):
        _check(generate(gid, level, seed, variant))


@pytest.mark.parametrize(("gid", "level", "variant"), CASES[::7])
def test_reproducible(gid, level, variant):
    a = generate(gid, level, 1234, variant)
    b = generate(gid, level, 1234, variant)
    assert a == b


@settings(max_examples=300, deadline=None)
@given(st.sampled_from(CASES), st.integers(min_value=0, max_value=10**9))
def test_random_seeds(case, seed):
    gid, level, variant = case
    _check(generate(gid, level, seed, variant))


def test_registry_size():
    # Si este número baja, alguien eliminó generadores sin querer.
    assert len(REGISTRY) >= 217
