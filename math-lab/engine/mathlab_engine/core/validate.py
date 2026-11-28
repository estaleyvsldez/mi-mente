"""Validación determinista de respuestas.

Recibe lo que escribió el estudiante (texto, o dict para casillas múltiples) y
el `AnswerSpec` esperado. Devuelve un `ValidationResult` con diagnóstico.
Ninguna IA interviene aquí: sólo aritmética exacta.
"""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
from typing import Any

from ..numbers.parse import (
    ParseError,
    is_simplified_fraction_text,
    normalize_token,
    normalize_words,
    parse_factorization,
    parse_list,
    parse_number,
)
from .types import AnswerSpec, Diagnosis, Exercise, Misconception, ValidationResult

HELP_WORDS = {"no se", "ayuda", "no entiendo", "me trabe", "me trabé", "nose", "help"}


def is_help_request(text: Any) -> bool:
    return isinstance(text, str) and normalize_words(text) in {normalize_words(w) for w in HELP_WORDS}


def parse_value(spec: AnswerSpec, raw: Any) -> Any:
    """Convierte la respuesta cruda al tipo de `spec.value`. Lanza ParseError."""
    k = spec.kind
    if k == "fields":
        if not isinstance(raw, dict):
            raise ParseError("Completa todas las casillas.")
        return {key: parse_value(sub, raw.get(key, "")) for key, _l, sub in spec.fields}
    if not isinstance(raw, str):
        if isinstance(raw, list) and k == "multichoice":
            return frozenset(str(x) for x in raw)
        raw = "" if raw is None else str(raw)
    if k in ("integer", "number"):
        value, form = parse_number(raw)
        if k == "integer" and value.denominator != 1:
            raise ParseError("Se espera un número entero.")
        return value
    if k == "choice":
        ids = {c.id for c in spec.choices}
        if raw not in ids:
            raise ParseError("Elige una de las opciones.")
        return raw
    if k == "multichoice":
        parts = frozenset(p for p in raw.split(",") if p)
        if not parts <= {c.id for c in spec.choices}:
            raise ParseError("Opción desconocida.")
        return parts
    if k == "token":
        t = normalize_token(raw)
        if not t:
            raise ParseError("La respuesta está vacía.")
        return t
    if k == "words":
        w = normalize_words(raw)
        if not w:
            raise ParseError("Escribe el número con palabras.")
        return w
    if k == "list":
        ints = all(Fraction(v).denominator == 1 for v in spec.value)
        return [*parse_list(raw, integers_only=ints)]
    if k == "factorization":
        return parse_factorization(raw)
    raise ParseError(f"Tipo de respuesta desconocido: {k}")


def values_equal(spec: AnswerSpec, got: Any) -> bool:
    k = spec.kind
    exp = spec.value
    if k in ("integer", "number"):
        if spec.tolerance is not None:
            return abs(Fraction(got) - Fraction(exp)) <= spec.tolerance
        return Fraction(got) == Fraction(exp)
    if k == "words":
        options = {normalize_words(exp), *(normalize_words(a) for a in spec.accepted)}
        return got in options
    if k == "token":
        options = {normalize_token(str(exp)), *(normalize_token(a) for a in spec.accepted)}
        return got in options
    if k == "multichoice":
        return frozenset(got) == frozenset(exp)
    if k == "list":
        e = [Fraction(v) for v in exp]
        return got == e if spec.ordered else sorted(got) == sorted(e)
    if k == "factorization":
        return Counter(got) == Counter(exp)
    if k == "fields":
        return all(values_equal(sub, got[key]) for key, _l, sub in spec.fields)
    return got == exp


def _format_issue(spec: AnswerSpec, raw: Any) -> str | None:
    """Respuesta con el valor correcto pero en una forma no pedida."""
    if spec.kind != "number" or not isinstance(raw, str):
        return None
    try:
        _v, form = parse_number(raw)
    except ParseError:
        return None
    if spec.form == "simplified" and not is_simplified_fraction_text(raw):
        return "El valor es correcto, pero la fracción no está simplificada (mínima expresión)."
    if spec.form == "decimal" and form in ("fraction", "mixed"):
        return "El valor es correcto, pero se pide la respuesta en forma decimal."
    if spec.form == "integer" and form != "integer":
        return "Se pide un número entero."
    return None


def match_misconception(misconceptions: tuple[Misconception, ...], spec: AnswerSpec, got: Any) -> Misconception | None:
    for m in misconceptions:
        try:
            probe = AnswerSpec(kind=spec.kind, value=m.value, fields=spec.fields, ordered=spec.ordered,
                               choices=spec.choices, accepted=())
            if values_equal(probe, got):
                return m
        except Exception:  # noqa: BLE001 — un error mal definido nunca debe romper la validación
            continue
    return None


def validate(spec: AnswerSpec, raw: Any, misconceptions: tuple[Misconception, ...] = ()) -> ValidationResult:
    try:
        got = parse_value(spec, raw)
    except ParseError as e:
        return ValidationResult(correct=False, parsed=False, message=str(e))

    field_results: dict[str, bool] = {}
    if spec.kind == "fields":
        field_results = {key: values_equal(sub, got[key]) for key, _l, sub in spec.fields}

    if values_equal(spec, got):
        issue = _format_issue(spec, raw)
        if issue:
            return ValidationResult(correct=False, parsed=True, message=issue, format_issue=issue,
                                    diagnosis=Diagnosis("formato", "Forma de la respuesta", issue))
        return ValidationResult(correct=True, parsed=True, message="¡Correcto!", field_results=field_results)

    m = match_misconception(misconceptions, spec, got)
    if m:
        return ValidationResult(
            correct=False, parsed=True,
            message=f"Incorrecto. {m.title}.",
            diagnosis=Diagnosis(m.code, m.title, m.explanation, m.step_index),
            field_results=field_results,
        )
    return ValidationResult(correct=False, parsed=True,
                            message="Incorrecto. Revisa la solución paso a paso para localizar el error.",
                            field_results=field_results)


def canonical_input(spec: AnswerSpec) -> Any:
    """Lo que escribiría un estudiante que responde EXACTAMENTE bien.

    Se usa en las pruebas (cada respuesta generada debe validarse como correcta
    a través del mismo camino que usa el estudiante) y para mostrar la solución.
    """
    from ..algorithms.numtheory import fact_text
    from ..numbers.fmt import decimal_str, is_terminating

    k, v = spec.kind, spec.value
    if k in ("integer", "number"):
        q = Fraction(v)
        if q.denominator == 1:
            return str(q.numerator)
        if spec.form == "simplified" or not is_terminating(q):
            return f"{q.numerator}/{q.denominator}"
        return decimal_str(q)
    if k == "choice":
        return v
    if k == "multichoice":
        return sorted(v)
    if k in ("token", "words"):
        return str(v)
    if k == "list":
        return "; ".join(canonical_input(AnswerSpec(kind="number", value=x)) for x in v)
    if k == "factorization":
        return fact_text(Counter(v))
    if k == "fields":
        return {key: canonical_input(sub) for key, _l, sub in spec.fields}
    raise ValueError(k)


def validate_exercise(ex: Exercise, raw: Any) -> ValidationResult:
    return validate(ex.answer, raw, ex.misconceptions)


def validate_step(ex: Exercise, step_index: int, raw: Any) -> ValidationResult:
    step = ex.solution[step_index]
    if step.answer is None:
        raise ValueError("Este paso no es interactivo")
    return validate(step.answer, raw)
