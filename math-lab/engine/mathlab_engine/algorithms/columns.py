"""Algoritmos escolares en columna, con TRAZA de cada paso.

La traza permite: (1) explicar cada columna, (2) validar la pizarra casilla por
casilla, (3) programar errores típicos (sumar sin llevar, etc.).
"""

from __future__ import annotations

from dataclasses import dataclass

PLACE = ["unidades", "decenas", "centenas", "unidades de millar", "decenas de millar",
         "centenas de millar", "unidades de millón", "decenas de millón", "centenas de millón"]


def place_name(i: int, count: int | None = None) -> str:
    """Nombre del orden i (0 = unidades). Con count == 1 se usa el singular."""
    name = PLACE[i] if i < len(PLACE) else f"posición {i + 1}"
    if count == 1:
        head, _, rest = name.partition(" ")
        head = head[:-1] if head.endswith("s") else head
        head = "unidad" if head == "unidade" else head
        name = f"{head} {rest}".strip()
    return name


def digits_rev(n: int) -> list[int]:
    return [int(c) for c in reversed(str(n))]


@dataclass(frozen=True)
class AddColumn:
    index: int
    digits: tuple[int, ...]
    carry_in: int
    total: int
    write: int
    carry_out: int


def column_add(nums: list[int]) -> tuple[int, list[AddColumn]]:
    width = max(len(str(n)) for n in nums)
    cols: list[AddColumn] = []
    carry = 0
    for i in range(width):
        ds = tuple(digits_rev(n)[i] if i < len(str(n)) else 0 for n in nums)
        total = sum(ds) + carry
        cols.append(AddColumn(i, ds, carry, total, total % 10, total // 10))
        carry = total // 10
    return sum(nums), cols


def add_without_carry(nums: list[int]) -> int:
    """Error típico: escribir sólo la última cifra de cada columna y no llevar."""
    width = max(len(str(n)) for n in nums)
    out = 0
    for i in range(width):
        s = sum(digits_rev(n)[i] if i < len(str(n)) else 0 for n in nums)
        out += (s % 10) * 10**i
    return out


def add_concat_columns(nums: list[int]) -> int:
    """Error típico: escribir la suma completa de cada columna sin llevar (8+7 → 15)."""
    width = max(len(str(n)) for n in nums)
    parts = []
    for i in range(width):
        parts.append(str(sum(digits_rev(n)[i] if i < len(str(n)) else 0 for n in nums)))
    return int("".join(reversed(parts)))


@dataclass(frozen=True)
class SubColumn:
    index: int
    top: int  # cifra del minuendo tras desagrupaciones previas
    bottom: int
    borrowed: bool  # ¿se pidió prestada una unidad de la columna siguiente?
    effective_top: int  # top (+10 si se desagrupó)
    write: int


def column_sub(a: int, b: int) -> tuple[int, list[SubColumn]]:
    assert a >= b >= 0
    da, db = digits_rev(a), digits_rev(b)
    da = da[:]  # mutable
    cols: list[SubColumn] = []
    for i in range(len(da)):
        bot = db[i] if i < len(db) else 0
        top = da[i]
        borrowed = top < bot
        eff = top + 10 if borrowed else top
        if borrowed:
            j = i + 1
            while da[j] == 0:
                da[j] = 9
                j += 1
            da[j] -= 1
        cols.append(SubColumn(i, top, bot, borrowed, eff, eff - bot))
    return a - b, cols


def sub_smaller_from_larger(a: int, b: int) -> int:
    """Error típico: en cada columna restar la cifra menor de la mayor."""
    da, db = digits_rev(a), digits_rev(b)
    out = 0
    for i in range(len(da)):
        bot = db[i] if i < len(db) else 0
        out += abs(da[i] - bot) * 10**i
    return out


def sub_borrow_not_reduced(a: int, b: int) -> int:
    """Error típico: desagrupa (+10) pero no resta 1 a la columna siguiente."""
    da, db = digits_rev(a), digits_rev(b)
    out = 0
    for i in range(len(da)):
        bot = db[i] if i < len(db) else 0
        top = da[i] + 10 if da[i] < bot else da[i]
        out += ((top - bot) % 10) * 10**i
    return out


@dataclass(frozen=True)
class MulRow:
    digit: int
    place: int
    partial: int  # producto parcial ya desplazado


def long_multiplication(a: int, b: int) -> tuple[int, list[MulRow]]:
    rows = [MulRow(d, i, a * d * 10**i) for i, d in enumerate(digits_rev(b))]
    return a * b, rows


def mul_no_shift(a: int, b: int) -> int:
    """Error típico: no desplazar los productos parciales."""
    return sum(a * d for d in digits_rev(b))


def mul_one_digit_trace(a: int, d: int) -> list[tuple[int, int, int, int, int]]:
    """(posición, cifra, llevada_entrada, producto, llevada_salida)."""
    out = []
    carry = 0
    for i, x in enumerate(digits_rev(a)):
        p = x * d + carry
        out.append((i, x, carry, p, p // 10))
        carry = p // 10
    return out


def mul_one_digit_no_carry(a: int, d: int) -> int:
    out = 0
    for i, x in enumerate(digits_rev(a)):
        out += ((x * d) % 10) * 10**i
    return out


@dataclass(frozen=True)
class DivStep:
    partial: int  # dividendo parcial
    q_digit: int
    product: int
    remainder: int
    brought_down: int | None  # cifra que se baja después (None al final)


def long_division(dividend: int, divisor: int) -> tuple[int, int, list[DivStep]]:
    """División larga cifra a cifra (como en el cuaderno)."""
    assert divisor > 0 and dividend >= 0
    s = str(dividend)
    steps: list[DivStep] = []
    # primer dividendo parcial: menor prefijo >= divisor (o todo si no alcanza)
    k = 1
    while k < len(s) and int(s[:k]) < divisor:
        k += 1
    partial = int(s[:k])
    q_digits = []
    idx = k
    while True:
        q = partial // divisor
        prod = q * divisor
        rem = partial - prod
        q_digits.append(str(q))
        nxt = int(s[idx]) if idx < len(s) else None
        steps.append(DivStep(partial, q, prod, rem, nxt))
        if nxt is None:
            break
        partial = rem * 10 + nxt
        idx += 1
    return dividend // divisor, dividend % divisor, steps
