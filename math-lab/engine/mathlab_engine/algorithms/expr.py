"""Operaciones combinadas resueltas UNA operación a la vez (jerarquía).

Reglas:
1. Primero el agrupamiento más interno: ( ) dentro de [ ] dentro de { }.
2. Dentro de cada grupo: potencias y raíces; luego × y ÷ de izquierda a
   derecha; luego + y − de izquierda a derecha.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from fractions import Fraction
from math import isqrt

from ..numbers.fmt import tex

OPEN = {"(": ")", "[": "]", "{": "}"}
CLOSE = {v: k for k, v in OPEN.items()}
Token = str | Fraction


class ExprError(ValueError):
    pass


def tokenize(s: str) -> list[Token]:
    out: list[Token] = []
    for m in re.finditer(r"\d+|[+\-×÷^√∛()\[\]{}]|\S", s):
        t = m.group(0)
        if t.isdigit():
            out.append(Fraction(int(t)))
        elif t in "+-×÷^√∛()[]{}":
            out.append(t)
        else:
            raise ExprError(f"Símbolo desconocido: {t}")
    return out


def _icbrt(n: int) -> int:
    r = round(abs(n) ** (1 / 3))
    for c in (r - 1, r, r + 1):
        if c**3 == n:
            return c
    raise ExprError("raíz no exacta")


def _apply(a: Fraction, op: str, b: Fraction) -> Fraction:
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "×":
        return a * b
    if op == "÷":
        if b == 0:
            raise ExprError("división entre cero")
        return a / b
    if op == "^":
        if b.denominator != 1 or b < 0:
            raise ExprError("exponente no natural")
        return a ** int(b)
    raise ExprError(op)


OP_NAMES = {"+": "suma", "-": "resta", "×": "multiplicación", "÷": "división", "^": "potencia",
            "√": "raíz cuadrada", "∛": "raíz cúbica"}


@dataclass(frozen=True)
class ExprStep:
    before: str  # LaTeX antes
    after: str  # LaTeX después
    operation: str  # "7 × 3 = 21"
    rule: str  # por qué esta operación va primero
    value: Fraction


def _innermost(tokens: list[Token]) -> tuple[int, int] | None:
    """Índices (apertura, cierre) del primer grupo más interno."""
    stack: list[int] = []
    for i, t in enumerate(tokens):
        if isinstance(t, str) and t in OPEN:
            stack.append(i)
        elif isinstance(t, str) and t in CLOSE:
            if not stack:
                raise ExprError("paréntesis desbalanceados")
            return stack.pop(), i
    if stack:
        raise ExprError("paréntesis desbalanceados")
    return None


def _reduce_flat(seg: list[Token], left_to_right_only: bool = False) -> tuple[list[Token], str, str, Fraction]:
    """Aplica UNA operación al segmento sin agrupaciones."""
    # raíces
    if not left_to_right_only:
        for i, t in enumerate(seg):
            if t in ("√", "∛") and i + 1 < len(seg) and isinstance(seg[i + 1], Fraction):
                n = seg[i + 1]
                assert isinstance(n, Fraction)
                if t == "√":
                    r = isqrt(int(n))
                    if n.denominator != 1 or r * r != n:
                        raise ExprError("raíz no exacta")
                    val = Fraction(r)
                    desc = f"\\sqrt{{{tex(n)}}} = {tex(val)}"
                else:
                    val = Fraction(_icbrt(int(n)))
                    desc = f"\\sqrt[3]{{{tex(n)}}} = {tex(val)}"
                return seg[:i] + [val] + seg[i + 2:], desc, "Raíces antes que multiplicaciones y sumas", val
        for i, t in enumerate(seg):
            if t == "^":
                a, b = seg[i - 1], seg[i + 1]
                assert isinstance(a, Fraction) and isinstance(b, Fraction)
                val = _apply(a, "^", b)
                return (seg[: i - 1] + [val] + seg[i + 2:], f"{tex(a)}^{{{tex(b)}}} = {tex(val)}",
                        "Potencias antes que multiplicaciones y sumas", val)
        for ops, rule in ((("×", "÷"), "Multiplicaciones y divisiones antes que sumas y restas, de izquierda a derecha"),
                          (("+", "-"), "Sumas y restas al final, de izquierda a derecha")):
            for i, t in enumerate(seg):
                if t in ops and i > 0:
                    a, b = seg[i - 1], seg[i + 1]
                    assert isinstance(a, Fraction) and isinstance(b, Fraction)
                    val = _apply(a, t, b)
                    sym = {"×": "\\times", "÷": "\\div", "+": "+", "-": "-"}[t]
                    return seg[: i - 1] + [val] + seg[i + 2:], f"{tex(a)} {sym} {tex(b)} = {tex(val)}", rule, val
    else:
        # error típico: operar estrictamente de izquierda a derecha
        for i, t in enumerate(seg):
            if t in ("√", "∛") and i + 1 < len(seg) and isinstance(seg[i + 1], Fraction):
                return _reduce_flat(seg)  # las raíces de un número se calculan igual
        for i, t in enumerate(seg):
            if isinstance(t, str) and t in "+-×÷^" and 0 < i < len(seg) - 1:
                a, b = seg[i - 1], seg[i + 1]
                if isinstance(a, Fraction) and isinstance(b, Fraction):
                    val = _apply(a, t, b)
                    return seg[: i - 1] + [val] + seg[i + 2:], "", "", val
    raise ExprError("nada que reducir")


def render(tokens: list[Token]) -> str:
    out: list[str] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if isinstance(t, Fraction):
            out.append(tex(t))
        elif t == "^":
            nxt = tokens[i + 1]
            if isinstance(nxt, Fraction):
                out.append(f"^{{{tex(nxt)}}}")
                i += 1
            else:
                out.append("^")
        elif t in ("√", "∛"):
            nxt = tokens[i + 1]
            head = "\\sqrt{" if t == "√" else "\\sqrt[3]{"
            if isinstance(nxt, Fraction):
                out.append(f"{head}{tex(nxt)}}}")
                i += 1
            else:
                # raíz de un grupo: renderizamos su interior bajo la raíz
                depth, j = 0, i + 1
                while True:
                    if tokens[j] in OPEN:
                        depth += 1
                    elif tokens[j] in CLOSE:
                        depth -= 1
                        if depth == 0:
                            break
                    j += 1
                out.append(head + render(tokens[i + 2: j]) + "}")
                i = j
        else:
            out.append({"×": "\\times", "÷": "\\div", "-": "-", "+": "+",
                        "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}"}[t])
        i += 1
    s = " ".join(out)
    return s.replace(" ^", "^").replace("( ", "(").replace(" )", ")").replace("[ ", "[").replace(" ]", "]")


def _one_step(tokens: list[Token], ltr: bool = False) -> tuple[list[Token], str, str, Fraction]:
    grp = _innermost(tokens)
    if grp is None:
        return _reduce_flat(tokens, ltr)
    a, b = grp
    inner = tokens[a + 1: b]
    if len(inner) == 1:
        # quitar el agrupamiento que ya contiene un solo número
        return tokens[:a] + inner + tokens[b + 1:], "", "", inner[0]  # type: ignore[return-value]
    new_inner, desc, rule, val = _reduce_flat(inner, ltr)
    if len(new_inner) == 1 and not (a > 0 and tokens[a - 1] in ("√", "∛")):
        # el grupo quedó con un solo número: se quitan los signos de agrupación
        kind = {"(": "paréntesis", "[": "corchetes", "{": "llaves"}[tokens[a]]  # type: ignore[index]
        rule = f"Primero lo que está dentro de los {kind} más internos. {rule}" if rule else rule
        return tokens[:a] + new_inner + tokens[b + 1:], desc, rule, val
    kind = {"(": "paréntesis", "[": "corchetes", "{": "llaves"}[tokens[a]]  # type: ignore[index]
    if rule:
        rule = f"Primero lo que está dentro de los {kind} más internos. {rule}"
    return tokens[: a + 1] + new_inner + tokens[b:], desc, rule, val


def evaluate_steps(expr: str) -> tuple[Fraction, list[ExprStep]]:
    tokens = tokenize(expr)
    steps: list[ExprStep] = []
    guard = 0
    while len(tokens) > 1:
        guard += 1
        if guard > 100:
            raise ExprError("expresión demasiado larga")
        before = render(tokens)
        tokens, desc, rule, val = _one_step(tokens)
        if desc:
            steps.append(ExprStep(before, render(tokens), desc, rule, val))
    final = tokens[0]
    assert isinstance(final, Fraction)
    return final, steps


def evaluate_left_to_right(expr: str) -> Fraction:
    """Resultado del ERROR típico de ignorar la jerarquía (respeta agrupaciones)."""
    tokens = tokenize(expr)
    guard = 0
    while len(tokens) > 1 and guard < 100:
        guard += 1
        tokens, _d, _r, _v = _one_step(tokens, ltr=True)
    final = tokens[0]
    assert isinstance(final, Fraction)
    return final
