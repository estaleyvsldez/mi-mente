"""Utilidades compartidas por los generadores."""

from __future__ import annotations

from collections.abc import Sequence
from fractions import Fraction
from typing import Any

from ..core.types import AnswerSpec, Choice

NAMES = ["Ana", "Luis", "Sofía", "Carlos", "Valentina", "Mateo", "Lucía", "Diego", "Camila",
         "Andrés", "Elena", "Jorge", "Paula", "Tomás", "Irene", "Samuel"]


def A_int(v: int, unit: str = "") -> AnswerSpec:
    return AnswerSpec(kind="integer", value=Fraction(v), unit=unit)


def A_num(v: Fraction | int, form: str = "any", unit: str = "", tolerance: Fraction | None = None) -> AnswerSpec:
    return AnswerSpec(kind="number", value=Fraction(v), form=form, unit=unit, tolerance=tolerance)  # type: ignore[arg-type]


def A_fields(*fields: tuple[str, str, AnswerSpec]) -> AnswerSpec:
    return AnswerSpec(kind="fields", value={k: s.value for k, _l, s in fields}, fields=tuple(fields))


def A_choice_fixed(options: Sequence[str], correct: str) -> AnswerSpec:
    """Opciones en orden fijo (p. ej. Verdadero/Falso, <,=,>)."""
    choices = tuple(Choice(chr(97 + i), o) for i, o in enumerate(options))
    cid = next(c.id for c in choices if c.label == correct)
    return AnswerSpec(kind="choice", value=cid, choices=choices)


def A_multi(options: Sequence[str], correct: Sequence[str]) -> AnswerSpec:
    choices = tuple(Choice(chr(97 + i), o) for i, o in enumerate(options))
    ids = frozenset(c.id for c in choices if c.label in set(correct))
    return AnswerSpec(kind="multichoice", value=ids, choices=choices)


def A_list(values: Sequence[Any], ordered: bool = True) -> AnswerSpec:
    return AnswerSpec(kind="list", value=[Fraction(v) for v in values], ordered=ordered,
                      placeholder="Separa con punto y coma: 2; 4; 6")


def cid(spec: AnswerSpec, label: str) -> str:
    return next(c.id for c in spec.choices if c.label == label)


def comp_symbol(a: Fraction | int, b: Fraction | int) -> str:
    return "<" if a < b else (">" if a > b else "=")


def plural(n: int | Fraction, one: str, many: str) -> str:
    return one if n == 1 else many


def gt(x: Any) -> str:
    """Texto en matemáticas inline."""
    return f"${x}$"
