"""Lectura de números en español (escala larga: millón = 10^6, billón = 10^12)."""

from __future__ import annotations

_UNITS = [
    "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
    "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
    "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
]
_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
_HUNDREDS = [
    "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
    "seiscientos", "setecientos", "ochocientos", "novecientos",
]


def _below_100(n: int) -> str:
    if n < 30:
        return _UNITS[n]
    t, u = divmod(n, 10)
    return _TENS[t] if u == 0 else f"{_TENS[t]} y {_UNITS[u]}"


def _below_1000(n: int) -> str:
    if n == 100:
        return "cien"
    h, r = divmod(n, 100)
    parts = [_HUNDREDS[h]] if h else []
    if r:
        parts.append(_below_100(r))
    return " ".join(parts)


def _apocope(text: str) -> str:
    """'uno' → 'un' delante de 'mil'/'millones' (veintiún mil, un millón)."""
    if text.endswith("veintiuno"):
        return text[: -len("veintiuno")] + "veintiún"
    if text.endswith("uno"):
        return text[:-3] + "un"
    return text


def _below_million(n: int) -> str:
    th, r = divmod(n, 1000)
    parts = []
    if th == 1:
        parts.append("mil")
    elif th > 1:
        parts.append(f"{_apocope(_below_1000(th))} mil")
    if r:
        parts.append(_below_1000(r))
    return " ".join(parts)


def number_to_words(n: int) -> str:
    if n < 0:
        return "menos " + number_to_words(-n)
    if n == 0:
        return "cero"
    if n >= 10**18:
        raise ValueError("Número demasiado grande")
    billions, rest = divmod(n, 10**12)
    millions, rest = divmod(rest, 10**6)
    parts = []
    if billions:
        parts.append("un billón" if billions == 1 else f"{_apocope(_below_million(billions))} billones")
    if millions:
        parts.append("un millón" if millions == 1 else f"{_apocope(_below_million(millions))} millones")
    if rest:
        parts.append(_below_million(rest))
    return " ".join(parts)


_PLACE_NAMES = {1: "décima", 2: "centésima", 3: "milésima", 4: "diezmilésima", 5: "cienmilésima"}


def decimal_to_words(whole: int, frac_digits: str) -> str:
    """3,25 → 'tres enteros veinticinco centésimas'."""
    places = len(frac_digits)
    frac_val = int(frac_digits)
    w = number_to_words(whole)
    unit = "entero" if whole == 1 else "enteros"
    if whole == 1:
        w = "un"
    name = _PLACE_NAMES[places]
    f = number_to_words(frac_val)
    if frac_val == 1:
        f = "una"
        name_s = name
    else:
        if f.endswith("uno"):
            f = f[:-3] + "una"
        f = f.replace("veintiuno", "veintiuna").replace("ientos", "ientas")
        name_s = name + "s"
    return f"{w} {unit} {f} {name_s}"
