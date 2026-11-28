"""Cómo se MUESTRAN los números (formato español, coma decimal)."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction


def is_terminating(q: Fraction) -> bool:
    d = q.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    return d == 1


def decimal_str(q: Fraction | int, max_places: int = 12) -> str:
    """Decimal exacto con coma (sólo si el decimal es finito)."""
    q = Fraction(q)
    if q.denominator == 1:
        return str(q.numerator)
    if not is_terminating(q):
        raise ValueError(f"{q} no tiene expresión decimal finita")
    sign = "-" if q < 0 else ""
    q = abs(q)
    whole, rem = divmod(q.numerator, q.denominator)
    digits = []
    while rem and len(digits) < max_places:
        rem *= 10
        d, rem = divmod(rem, q.denominator)
        digits.append(str(d))
    return f"{sign}{whole}," + "".join(digits)


def round_half_up(q: Fraction, places: int) -> Fraction:
    """Redondeo escolar: 5 o más sube (2,345 → 2,35)."""
    dq = Decimal(q.numerator) / Decimal(q.denominator)
    exp = Decimal(1).scaleb(-places)
    return Fraction(dq.quantize(exp, rounding=ROUND_HALF_UP))


def fixed_str(q: Fraction, places: int) -> str:
    """Muestra exactamente `places` decimales (2,50)."""
    r = round_half_up(q, places)
    if places == 0:
        return str(int(r))
    s = decimal_str(r) if r.denominator != 1 else str(r.numerator)
    if "," not in s:
        s += ","
    whole, frac = s.split(",")
    return f"{whole},{frac.ljust(places, '0')}"


def num(q: Fraction | int) -> str:
    """Texto natural: entero, decimal finito o fracción a/b."""
    q = Fraction(q)
    if q.denominator == 1:
        return str(q.numerator)
    if is_terminating(q) and len(decimal_str(q)) <= 10:
        return decimal_str(q)
    return f"{q.numerator}/{q.denominator}"


def frac_text(q: Fraction) -> str:
    return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"


def tex(q: Fraction | int, as_fraction: bool = False) -> str:
    """LaTeX: 0{,}75 o \\frac{3}{4}."""
    q = Fraction(q)
    if q.denominator == 1:
        return str(q.numerator)
    if as_fraction or not is_terminating(q):
        sign = "-" if q < 0 else ""
        return f"{sign}\\frac{{{abs(q.numerator)}}}{{{q.denominator}}}"
    return decimal_str(q).replace(",", "{,}")


def tex_frac(n: int, d: int) -> str:
    return f"\\frac{{{n}}}{{{d}}}"


def signed_tex(n: int | Fraction) -> str:
    """Entero negativo entre paréntesis: (-5)."""
    s = tex(n)
    return f"({s})" if Fraction(n) < 0 else s
