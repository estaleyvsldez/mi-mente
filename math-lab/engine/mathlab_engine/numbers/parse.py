"""Interpretación EXACTA de lo que escribe el estudiante.

Reglas (ADR-004):
* Coma decimal (``0,75``). También se acepta el punto (``0.75``).
* Sin separador de miles: ``1.000`` se interpreta como 1 (decimal), por eso
  se rechaza un punto seguido de exactamente tres cifras cuando no hay coma
  (es ambiguo) y se pide escribir ``1000``.
* Fracciones ``3/4``, ``-3/4``; números mixtos ``1 3/4``.
* Nunca se usan flotantes: todo es ``fractions.Fraction``.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from fractions import Fraction

_SUPERSCRIPTS = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")
_MINUS = str.maketrans({"−": "-", "–": "-", "—": "-"})


class ParseError(ValueError):
    """La respuesta no tiene un formato reconocible."""


def _clean(text: str) -> str:
    return text.strip().translate(_MINUS).replace(" ", " ").replace(" ", " ")


_DEC_RE = re.compile(r"^[+-]?(\d+([.,]\d+)?|[.,]\d+)$")
_FRAC_RE = re.compile(r"^([+-]?\d+)\s*/\s*(\d+)$")
_MIXED_RE = re.compile(r"^([+-]?)(\d+)\s+(\d+)\s*/\s*(\d+)$")


def parse_number(text: str) -> tuple[Fraction, str]:
    """Devuelve (valor, forma) donde forma ∈ {integer, decimal, fraction, mixed}."""
    s = _clean(text)
    if not s:
        raise ParseError("La respuesta está vacía.")
    if _DEC_RE.match(s):
        if "," not in s and re.match(r"^[+-]?\d{1,3}\.\d{3}$", s):
            raise ParseError(
                "No uses punto para separar miles. Escribe el número sin separadores "
                "(por ejemplo 1000) y usa la coma sólo para decimales (0,5)."
            )
        norm = s.replace(",", ".")
        if norm.startswith(("+.", "-.")):
            norm = norm[0] + "0" + norm[1:]
        elif norm.startswith("."):
            norm = "0" + norm
        form = "decimal" if "." in norm else "integer"
        return Fraction(norm), form
    m = _FRAC_RE.match(s)
    if m:
        den = int(m.group(2))
        if den == 0:
            raise ParseError("El denominador no puede ser 0.")
        return Fraction(int(m.group(1)), den), "fraction"
    m = _MIXED_RE.match(s)
    if m:
        sign, whole, num, den = m.groups()
        if int(den) == 0:
            raise ParseError("El denominador no puede ser 0.")
        val = int(whole) + Fraction(int(num), int(den))
        return (-val if sign == "-" else val), "mixed"
    raise ParseError(
        "No reconozco ese número. Ejemplos válidos: 75 · -12 · 0,75 · 3/4 · 1 3/4"
    )


def parse_integer(text: str) -> int:
    value, form = parse_number(text)
    if value.denominator != 1:
        raise ParseError("Se espera un número entero (sin decimales ni fracción).")
    return int(value)


def is_simplified_fraction_text(text: str) -> bool:
    """¿El texto, si es fracción, está en su mínima expresión?"""
    s = _clean(text)
    m = _FRAC_RE.match(s) or _MIXED_RE.match(s)
    if not m:
        return True
    num, den = (int(m.group(1)), int(m.group(2))) if _FRAC_RE.match(s) else (
        int(m.group(3)),
        int(m.group(4)),
    )
    from math import gcd

    return gcd(abs(num), den) == 1


def parse_list(text: str, integers_only: bool) -> list[Fraction]:
    s = _clean(text)
    if not s:
        raise ParseError("La lista está vacía.")
    # ';' siempre separa. ',' separa sólo si la lista es de enteros (no hay ambigüedad).
    if ";" in s or not integers_only:
        parts = [p for p in re.split(r"[;\n]", s) if p.strip()]
    else:
        parts = [p for p in re.split(r"[,\s]+", s) if p.strip()]
    if not integers_only and len(parts) == 1 and " " in parts[0].strip():
        parts = parts[0].split()
    return [parse_number(p)[0] for p in parts]


def parse_factorization(text: str) -> Counter[int]:
    """Acepta 2^3·3, 2^3*3, 2³ × 3, 2·2·2·3, 2 x 2 x 3."""
    s = fix_superscript_exponents(_clean(text))
    s = re.sub(r"\s+", "", s)
    if not s:
        raise ParseError("La factorización está vacía.")
    factors: Counter[int] = Counter()
    for part in re.split(r"[·*×xX.]", s):
        if not part:
            raise ParseError("Hay un signo de multiplicar de más.")
        m = re.fullmatch(r"(\d+)(?:\^(\d+))?", part)
        if not m:
            raise ParseError("Escribe la factorización así: 2^3·3 o 2·2·2·3")
        base, exp = int(m.group(1)), int(m.group(2) or 1)
        factors[base] += exp
    return factors


def normalize_words(text: str) -> str:
    """minúsculas, sin tildes, espacios simples: para comparar palabras."""
    s = unicodedata.normalize("NFD", text.lower().strip())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zñ0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize_token(text: str) -> str:
    return re.sub(r"\s+", "", text).upper()


def fix_superscript_exponents(text: str) -> str:
    """Utilidad: '2³' → '2^3', '5¹²' → '5^12'."""
    return re.sub(
        r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+", lambda m: "^" + m.group(0).translate(_SUPERSCRIPTS), text
    )
