"""Teoría de números: divisores, primos, MCD, MCM, bases."""

from __future__ import annotations

from collections import Counter
from math import gcd, isqrt


def divisors(n: int) -> list[int]:
    small, large = [], []
    for d in range(1, isqrt(n) + 1):
        if n % d == 0:
            small.append(d)
            if d != n // d:
                large.append(n // d)
    return small + large[::-1]


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    return all(n % p for p in range(2, isqrt(n) + 1))


def primes_up_to(n: int) -> list[int]:
    return sieve(n)[0]


def sieve(n: int) -> tuple[list[int], list[tuple[int, list[int]]]]:
    """Criba de Eratóstenes con traza: (primo, múltiplos tachados)."""
    alive = [True] * (n + 1)
    alive[0:2] = [False, False][: n + 1]
    trace = []
    p = 2
    while p * p <= n:
        if alive[p]:
            crossed = [m for m in range(p * p, n + 1, p) if alive[m]]
            for m in crossed:
                alive[m] = False
            trace.append((p, crossed))
        p += 1
    return [i for i in range(2, n + 1) if alive[i]], trace


def factorize(n: int) -> Counter[int]:
    f: Counter[int] = Counter()
    d = 2
    while d * d <= n:
        while n % d == 0:
            f[d] += 1
            n //= d
        d += 1
    if n > 1:
        f[n] += 1
    return f


def factor_ladder(n: int) -> list[tuple[int, int]]:
    """Tabla de divisiones sucesivas: (número, primo por el que se divide)."""
    rows = []
    d = 2
    while n > 1:
        while n % d == 0:
            rows.append((n, d))
            n //= d
        d += 1
    return rows


def fact_text(f: Counter[int]) -> str:
    return "·".join(f"{p}^{e}" if e > 1 else str(p) for p, e in sorted(f.items()))


def fact_tex(f: Counter[int]) -> str:
    return " \\cdot ".join(f"{p}^{{{e}}}" if e > 1 else str(p) for p, e in sorted(f.items()))


def euclid_trace(a: int, b: int) -> list[tuple[int, int, int, int]]:
    """(a, b, cociente, residuo) hasta residuo 0."""
    out = []
    while b:
        q, r = divmod(a, b)
        out.append((a, b, q, r))
        a, b = b, r
    return out


def lcm(a: int, b: int) -> int:
    return a * b // gcd(a, b)


DIGITS = "0123456789ABCDEF"


def to_base(n: int, base: int) -> str:
    if n == 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, base)
        out.append(DIGITS[r])
    return "".join(reversed(out))


def to_base_trace(n: int, base: int) -> list[tuple[int, int, int]]:
    """Divisiones sucesivas: (número, cociente, residuo)."""
    out = []
    while n:
        q, r = divmod(n, base)
        out.append((n, q, r))
        n = q
    return out


def from_base(s: str, base: int) -> int:
    return int(s, base)
