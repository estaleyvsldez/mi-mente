"""Bloques 08 (propiedades), 09 (jerarquía), 10 (múltiplos/divisores),
11 (primos), 12 (MCD) y 13 (MCM)."""

from __future__ import annotations

from collections import Counter
from math import gcd

from ..algorithms.expr import ExprError, evaluate_left_to_right, evaluate_steps, tokenize
from ..algorithms.numtheory import (
    divisors,
    euclid_trace,
    fact_tex,
    fact_text,
    factor_ladder,
    factorize,
    is_prime,
    lcm,
    sieve,
)
from ..core.registry import Ctx, generator, mc
from ..core.types import AnswerSpec
from ..numbers.fmt import signed_tex
from ._common import NAMES, A_choice_fixed, A_int, A_list, A_multi

# ===================================================== PROPIEDADES (B08) ===

_PROP_BANK = [
    ("Conmutativa", "{a} + {b} = {b} + {a}", "suma"), ("Conmutativa", "{a} \\times {b} = {b} \\times {a}", "multiplicación"),
    ("Asociativa", "({a} + {b}) + {c} = {a} + ({b} + {c})", "suma"),
    ("Asociativa", "({a} \\times {b}) \\times {c} = {a} \\times ({b} \\times {c})", "multiplicación"),
    ("Distributiva", "{a} \\times ({b} + {c}) = {a} \\times {b} + {a} \\times {c}", "multiplicación sobre la suma"),
    ("Distributiva", "{a} \\times ({b} - {c}) = {a} \\times {b} - {a} \\times {c}", "multiplicación sobre la resta"),
    ("Elemento neutro", "{a} + 0 = {a}", "suma"), ("Elemento neutro", "{a} \\times 1 = {a}", "multiplicación"),
    ("Elemento inverso", "{a} + (-{a}) = 0", "suma (opuesto)"),
    ("Elemento inverso", "{a} \\times \\frac{{1}}{{{a}}} = 1", "multiplicación (recíproco)"),
]


@generator("b08.identificar_propiedad", "Identificación de propiedades", {1: ["numerica"], 2: ["numerica", "general"], 3: ["general"]})
def identificar_propiedad(c: Ctx):
    name, tpl, op = c.choice(_PROP_BANK)
    if c.variant == "numerica":
        x, y, z = c.sample(range(2, 16), 3)
        expr = tpl.format(a=x, b=y, c=z)
    else:
        expr = tpl.format(a="a", b="b", c="c")
    ans = mc(c, name, ["Conmutativa", "Asociativa", "Distributiva", "Elemento neutro", "Elemento inverso"])
    c.step("Observar qué cambia en la igualdad", {
        "Conmutativa": "Cambia el ORDEN de los términos.", "Asociativa": "Cambia la forma de AGRUPAR.",
        "Distributiva": "Un factor se reparte sobre cada término de la suma o resta.",
        "Elemento neutro": "Operar con ese número no cambia nada.", "Elemento inverso": "Se obtiene el elemento neutro."}[name],
        procedure="Identificación de propiedades", prop=f"{name} ({op})")
    return c.build(name="Identificación de propiedades", procedure="Reconocimiento de la estructura de una igualdad",
                   prompt=f"¿Qué propiedad expresa la igualdad ${expr}$?", answer=ans, final=name, properties=(name,))


@generator("b08.neutro_inverso", "Elemento neutro e inverso", {1: ["neutro"], 2: ["opuesto", "neutro"], 3: ["reciproco", "opuesto"]})
def neutro_inverso(c: Ctx):
    a = c.randint(2, 30) * c.choice([1, -1])
    if c.variant == "neutro":
        op = c.choice(["+", "×"])
        val = 0 if op == "+" else 1
        c.step("Recordar el neutro", "En la suma el neutro es 0; en la multiplicación es 1.", procedure="Elemento neutro", prop="Elemento neutro")
        return c.build(name="Elemento neutro", procedure="Elemento neutro", prompt=f"Completa: ${signed_tex(a)} {'+' if op == '+' else '\\times'} \\square = {a}$",
                       answer=A_int(val), final=str(val))
    if c.variant == "opuesto":
        c.step("Opuesto aditivo", f"El opuesto de {a} es {-a} porque ${signed_tex(a)} + {signed_tex(-a)} = 0$.", procedure="Inverso aditivo", prop="Elemento inverso")
        c.mistake("mismo", "Diste el mismo número", "El opuesto cambia el signo.", a, 0)
        return c.build(name="Inverso aditivo (opuesto)", procedure="Elemento inverso de la suma", prompt=f"¿Qué número sumado a ${a}$ da 0?",
                       answer=A_int(-a), final=str(-a))
    from fractions import Fraction

    c.step("Recíproco", f"El inverso multiplicativo de {a} es $\\frac{{1}}{{{a}}}$ porque su producto es 1.", procedure="Inverso multiplicativo", prop="Elemento inverso")
    c.mistake("opuesto", "Diste el opuesto, no el recíproco", "El inverso de la multiplicación es 1/a.", Fraction(-a), 0)
    return c.build(name="Inverso multiplicativo (recíproco)", procedure="Elemento inverso de la multiplicación",
                   prompt=f"¿Por qué número hay que multiplicar ${a}$ para obtener 1? (puedes escribir una fracción)",
                   answer=AnswerSpec(kind="number", value=Fraction(1, a)), final=f"1/{a}")


_OPS_PROPS = [
    ("suma", "conmutativa", True), ("suma", "asociativa", True), ("resta", "conmutativa", False), ("resta", "asociativa", False),
    ("multiplicación", "conmutativa", True), ("multiplicación", "asociativa", True), ("división", "conmutativa", False),
    ("división", "asociativa", False), ("suma", "elemento neutro (0)", True), ("resta", "elemento neutro (0) a ambos lados", False),
    ("división", "elemento neutro (1) a la derecha", True),
]


@generator("b08.propiedades_operaciones", "¿Qué operaciones cumplen cada propiedad?", {1: ["vf"], 2: ["vf", "contraejemplo"], 3: ["contraejemplo"]})
def propiedades_operaciones(c: Ctx):
    op, prop, holds = c.choice(_OPS_PROPS)
    if c.variant == "contraejemplo":
        op = c.choice(["resta", "división"])
        if op == "resta":
            a, b = c.randint(10, 50), c.randint(1, 9)
            c.step("Probar el orden", f"${a} - {b} = {a - b}$ pero ${b} - {a} = {b - a}$", procedure="Contraejemplo")
            c.step("Conclusión", "Como los resultados difieren, la resta NO es conmutativa.")
            return c.build(name="Contraejemplo", procedure="Refutación mediante contraejemplo",
                           prompt=f"Calcula ${b} - {a}$ para comprobar que la resta no es conmutativa (compárala con ${a} - {b} = {a - b}$).",
                           answer=A_int(b - a), final=str(b - a))
        a, b = c.randint(2, 6), c.randint(2, 6)
        prod = a * b * b
        c.step("Probar la agrupación", f"$({prod} \\div {b}) \\div {b} = {a}$ pero ${prod} \\div ({b} \\div {b}) = {prod}$", procedure="Contraejemplo")
        return c.build(name="Contraejemplo", procedure="Refutación mediante contraejemplo",
                       prompt=f"Calcula ${prod} \\div ({b} \\div {b})$ y compáralo con $({prod} \\div {b}) \\div {b} = {a}$. ¿Qué da?",
                       answer=A_int(prod), final=str(prod))
    c.step("Pensar un ejemplo", "Si encontramos UN caso donde falla, la propiedad no se cumple.", procedure="Razonamiento con ejemplos y contraejemplos")
    return c.build(name="Propiedades de las operaciones", procedure="Verificación de propiedades",
                   prompt=f"¿Verdadero o falso? **La {op} cumple la propiedad {prop}.**",
                   answer=A_choice_fixed(["Verdadero", "Falso"], "Verdadero" if holds else "Falso"), final="Verdadero" if holds else "Falso")


@generator("b08.aplicar_propiedades", "Aplicaciones de las propiedades", {1: ["asociar_decenas"], 2: ["factor_comun"], 3: ["factor_comun", "asociar_decenas"]})
def aplicar_propiedades(c: Ctx):
    if c.variant == "asociar_decenas":
        a = c.randint(11, 89)
        b = (10 - a % 10) % 10 + 10 * c.randint(0, 5)
        if b == 0:
            c.retry()
        k = c.randint(11, 99)
        c.step("Reordenar", f"${a} + {k} + {b} = ({a} + {b}) + {k}$", procedure="Cálculo mental con propiedades", prop="Conmutativa y asociativa")
        c.step("Sumar el par redondo", f"${a} + {b} = {a + b}$", prompt=f"¿{a} + {b}?", answer=A_int(a + b))
        c.step("Terminar", f"${a + b} + {k} = {a + b + k}$")
        return c.build(name="Cálculo mental con propiedades", procedure="Reagrupar para formar decenas", prompt=f"Calcula de forma inteligente: ${a} + {k} + {b}$",
                       answer=A_int(a + b + k), final=str(a + b + k), properties=("Conmutativa", "Asociativa"))
    f = c.randint(3, 25)
    x = c.randint(10, 60)
    y = 100 - x if c.rng.random() < 0.5 else 10 * c.randint(2, 9) - x
    if y <= 0:
        c.retry()
    c.step("Sacar factor común", f"${f} \\times {x} + {f} \\times {y} = {f} \\times ({x} + {y})$", procedure="Factor común", prop="Distributiva (al revés)")
    c.step("Sumar el paréntesis", f"${x} + {y} = {x + y}$", prompt="¿Cuánto da el paréntesis?", answer=A_int(x + y))
    c.step("Multiplicar", f"${f} \\times {x + y} = {f * (x + y)}$")
    return c.build(name="Factor común", procedure="Aplicación inversa de la propiedad distributiva",
                   prompt=f"Calcula sacando factor común: ${f} \\times {x} + {f} \\times {y}$", answer=A_int(f * (x + y)), final=str(f * (x + y)),
                   properties=("Distributiva",))


# ======================================================= JERARQUÍA (B09) ===

_TEMPLATES = {
    "basico": ["$a + $b × $c", "$a - $b × $c", "$a × $b + $c", "$a + $b ÷ $c", "$a ÷ $b + $c × $d", "$a × $b - $c ÷ $d"],
    "parentesis": ["($a + $b) × $c", "$a × ($b - $c)", "($a + $b) ÷ $c", "$a - ($b + $c) ÷ $d", "($a - $b) × ($c + $d)"],
    "corchetes": ["[$a + ($b - $c) × $d] ÷ $e", "$a × [$b + $c × ($d - $e)]", "[$a - $b ÷ ($c - $d)] × $e"],
    "llaves": ["{$a + [$b × ($c + $d) - $e]} ÷ $f", "$a × {[$b + $c] ÷ $d + $e}", "{$a - [$b + ($c × $d)]} + $e"],
    "potencias": ["$a + $b^2 × $c", "($a + $b)^2 - $c", "$a^2 - $b × $c", "$a × $b^3 + $c", "2^$p + $a × $b"],
    "raices": ["√$sq + $a × $b", "$a × √$sq - $b", "√($sqa + $sqb) × $a", "∛$cu + $a^2"],
    "combinadas": ["{$a + [$b^2 - ($c + $d)]} ÷ $e", "[√$sq + $a × ($b - $c)] - $d^2", "$a^2 - [$b × √$sq - $c] + $d"],
}


def _fill(c: Ctx, tpl: str) -> str:
    sq = c.choice([4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144])
    # pitágoras para √(a+b) exacta
    sqa, sqb = c.choice([(9, 16), (36, 64), (16, 9), (25, 144), (64, 36), (144, 25)])  # sumas que son cuadrados
    vals: dict[str, int] = {k: c.randint(1, 12) for k in "abcdef"}
    vals.update(sq=sq, sqa=sqa, sqb=sqb, cu=c.choice([8, 27, 64, 125]), p=c.randint(2, 5))
    import re

    return re.sub(r"\$(sqa|sqb|sq|cu|[a-f]|p)", lambda m: str(vals[m.group(1)]), tpl)


def _make_expression(c: Ctx, kinds: list[str]) -> tuple[str, object, list]:
    for _ in range(400):
        expr = _fill(c, c.choice(_TEMPLATES[c.choice(kinds)]))
        try:
            val, steps = evaluate_steps(expr)
        except (ExprError, ZeroDivisionError, AssertionError):
            continue
        if val.denominator != 1 or val < 0 or val > 2000:
            continue
        if any(s.value.denominator != 1 or s.value < 0 for s in steps):
            continue
        return expr, val, steps
    c.retry()
    raise AssertionError


@generator("b09.operaciones_combinadas", "Operaciones combinadas",
           {1: ["basico"], 2: ["parentesis", "corchetes"], 3: ["llaves", "potencias", "raices", "combinadas"]}, version=1)
def operaciones_combinadas(c: Ctx):
    expr, val, steps = _make_expression(c, [c.variant])
    from ..algorithms.expr import render

    c.step("Observar la expresión", f"${render(tokenize(expr))}$. Buscamos primero los signos de agrupación; después potencias y raíces; "
           "luego multiplicaciones y divisiones; al final sumas y restas.", procedure="Jerarquía de operaciones")
    for s in steps:
        c.step(f"Calcular ${s.operation.split('=')[0].strip()}$", f"${s.operation}$. Queda: ${s.after}$", why=s.rule,
               prompt=f"¿Cuánto es ${s.operation.split('=')[0].strip()}$?", answer=A_int(int(s.value)))
    try:
        ltr = evaluate_left_to_right(expr)
        if ltr.denominator == 1:
            c.mistake("izquierda_derecha", "Operaste de izquierda a derecha sin respetar la jerarquía",
                      "Las multiplicaciones, divisiones y potencias se resuelven ANTES que las sumas y restas.", int(ltr), 1)
    except (ExprError, ZeroDivisionError):
        pass
    if "^" in expr:
        alt = expr
        import re

        m = re.search(r"(\d+)\^(\d+)", alt)
        if m:
            alt2 = alt[: m.start()] + str(int(m.group(1)) * int(m.group(2))) + alt[m.end():]
            try:
                wrong, _ = evaluate_steps(alt2)
                c.mistake("potencia_como_producto", "Calculaste la potencia como una multiplicación (base × exponente)",
                          f"${m.group(1)}^{{{m.group(2)}}}$ significa multiplicar {m.group(1)} por sí mismo {m.group(2)} veces.", wrong, 1)
            except (ExprError, ZeroDivisionError):
                pass
    return c.build(name="Operaciones combinadas", procedure="Jerarquía de operaciones (orden de resolución)",
                   prompt=f"Resuelve paso a paso: ${render(tokenize(expr))}$", answer=A_int(int(val)), final=str(val),
                   hints=("1º agrupaciones (de dentro hacia fuera) · 2º potencias y raíces · 3º × y ÷ · 4º + y −.",))


@generator("b09.orden_operaciones", "¿Qué operación va primero?", {1: ["basico"], 2: ["parentesis"], 3: ["potencias", "corchetes"]})
def orden_operaciones(c: Ctx):
    expr, val, steps = _make_expression(c, [c.variant])
    from ..algorithms.expr import render

    first = steps[0].operation.split("=")[0].strip()
    others = list({s.operation.split("=")[0].strip() for s in steps[1:]})
    if not others:
        c.retry()
    ans = mc(c, f"${first}$", [f"${o}$" for o in others][:3])
    c.step("Aplicar la jerarquía", steps[0].rule or "Primero agrupaciones, luego potencias/raíces, luego × ÷, luego + −.",
           procedure="Jerarquía de operaciones")
    return c.build(name="Orden de las operaciones", procedure="Jerarquía de operaciones",
                   prompt=f"En ${render(tokenize(expr))}$, ¿qué operación se resuelve **primero**?", answer=ans, final=f"${first}$")


# ============================================ MÚLTIPLOS Y DIVISORES (B10) ==


@generator("b10.es_multiplo", "Concepto de múltiplo y divisor", {1: ["multiplo"], 2: ["divisor", "multiplo"], 3: ["divisor"]})
def es_multiplo(c: Ctx):
    b = c.randint(2, c.by_level(10, 15, 25))
    yes = c.rng.random() < 0.5
    a = b * c.randint(2, 30) + (0 if yes else c.randint(1, b - 1))
    q, r = divmod(a, b)
    c.step("Dividir", f"${a} \\div {b}$ = {q}, residuo {r}.", procedure="Criterio de la división exacta", prompt="¿Residuo?", answer=A_int(r))
    c.step("Concluir", f"Residuo {'0 → sí' if yes else 'distinto de 0 → no'}. " + (f"${a} = {b} \\times {q}$." if yes else ""),
           why="a es múltiplo de b (y b divisor de a) si la división a ÷ b es exacta.")
    question = (f"¿Es **{a}** múltiplo de **{b}**?" if c.variant == "multiplo" else f"¿Es **{b}** divisor de **{a}**?")
    return c.build(name="Múltiplo o divisor", procedure="Comprobación mediante división exacta", prompt=question,
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if yes else "No"), final="Sí" if yes else "No")


@generator("b10.listar_multiplos", "Múltiplos de un número", {1: ["primeros"], 2: ["primeros", "entre"], 3: ["entre"]})
def listar_multiplos(c: Ctx):
    n = c.randint(2, c.by_level(9, 15, 30))
    if c.variant == "primeros":
        k = 5
        ms = [n * i for i in range(1, k + 1)]
        c.step("Multiplicar por 1, 2, 3…", " , ".join(f"{n}×{i}={n * i}" for i in range(1, k + 1)), procedure="Generación de múltiplos")
        c.mistake("desde_cero", "Empezaste en 0", "Pedimos los primeros múltiplos no nulos (desde n × 1).", [0, *ms[:-1]], 0)
        return c.build(name="Múltiplos de un número", procedure="Generación de múltiplos", prompt=f"Escribe los **5 primeros múltiplos** (no nulos) de {n}.",
                       answer=A_list(ms), final="; ".join(map(str, ms)))
    lo = c.randint(20, 100)
    hi = lo + n * c.randint(3, 5)
    ms = [m for m in range(lo, hi + 1) if m % n == 0]
    c.step("Primer múltiplo ≥ " + str(lo), f"{ms[0]}", procedure="Generación de múltiplos")
    c.step("Ir sumando " + str(n), "; ".join(map(str, ms)))
    return c.build(name="Múltiplos en un intervalo", procedure="Generación de múltiplos", prompt=f"Escribe todos los múltiplos de {n} entre {lo} y {hi} (incluidos).",
                   answer=A_list(ms), final="; ".join(map(str, ms)))


@generator("b10.listar_divisores", "Divisores de un número", {1: ["pequeno"], 2: ["mediano"], 3: ["grande"]})
def listar_divisores(c: Ctx):
    n = c.by_level(c.randint(6, 30), c.randint(30, 100), c.randint(100, 360))
    ds = divisors(n)
    pairs = [(d, n // d) for d in ds if d * d <= n]
    c.step("Buscar parejas", "Probamos 1, 2, 3… hasta que el número al cuadrado supere a n; cada divisor trae su pareja.",
           procedure="Búsqueda de divisores por parejas", why="Si d·e = n, ambos d y e son divisores.")
    c.step("Parejas encontradas", ", ".join(f"{a}×{b}" for a, b in pairs))
    c.step("Ordenar", "; ".join(map(str, ds)), prompt="¿Cuántos divisores tiene?", answer=A_int(len(ds)))
    c.mistake("sin_extremos", "Olvidaste el 1 o el propio número", "Todo número es divisible entre 1 y entre sí mismo.", ds[1:-1], 0)
    return c.build(name="Divisores de un número", procedure="Búsqueda de divisores por parejas",
                   prompt=f"Escribe **todos** los divisores de {n} (en cualquier orden).", answer=A_list(ds, ordered=False), final="; ".join(map(str, ds)))


_CRITERIA = {
    2: "termina en cifra par (0, 2, 4, 6, 8)", 3: "la suma de sus cifras es múltiplo de 3", 4: "sus dos últimas cifras forman un múltiplo de 4",
    5: "termina en 0 o 5", 6: "es divisible entre 2 y entre 3", 8: "sus tres últimas cifras forman un múltiplo de 8",
    9: "la suma de sus cifras es múltiplo de 9", 10: "termina en 0", 11: "la diferencia entre la suma de cifras en posición impar y par es múltiplo de 11",
}


@generator("b10.criterios_divisibilidad", "Criterios de divisibilidad", {1: ["uno"], 2: ["varios"], 3: ["varios"]})
def criterios_divisibilidad(c: Ctx):
    n = c.randint(c.by_level(100, 1000, 10000), c.by_level(999, 9999, 99999))
    if c.variant == "uno":
        k = c.choice([2, 3, 5, 10, 9])
        yes = n % k == 0
        digit_sum = sum(map(int, str(n)))
        detail = f"La suma de cifras es {digit_sum}." if k in (3, 9) else f"Termina en {str(n)[-1]}."
        c.step(f"Criterio del {k}", f"Un número es divisible entre {k} si {_CRITERIA[k]}.", procedure=f"Criterio de divisibilidad del {k}")
        c.step("Aplicar", detail + (" Cumple." if yes else " No cumple."))
        return c.build(name=f"Divisibilidad entre {k}", procedure=f"Criterio de divisibilidad del {k}", prompt=f"¿Es {n} divisible entre {k}? (usa el criterio, sin dividir)",
                       answer=A_choice_fixed(["Sí", "No"], "Sí" if yes else "No"), final="Sí" if yes else "No")
    opts = [2, 3, 4, 5, 6, 8, 9, 10]
    good = [str(k) for k in opts if n % k == 0]
    c.step("Revisar cada criterio", "; ".join(f"{k}: {'sí' if n % k == 0 else 'no'}" for k in opts), procedure="Criterios de divisibilidad")
    c.step("Suma de cifras", f"{' + '.join(str(n))} = {sum(map(int, str(n)))}", prompt="¿Cuánto suman sus cifras?", answer=A_int(sum(map(int, str(n)))))
    return c.build(name="Criterios de divisibilidad", procedure="Aplicación de varios criterios",
                   prompt=f"Marca todos los números entre los que **{n}** es divisible.", answer=A_multi([str(k) for k in opts], good),
                   final=", ".join(good) or "ninguno")


@generator("b10.relacion_multiplos_divisores", "Relación entre múltiplos y divisores", {1: ["vf"], 2: ["vf"], 3: ["vf"]})
def relacion_md(c: Ctx):
    a, k = c.randint(2, 12), c.randint(2, 12)
    b = a * k
    forms = [(f"Si {b} es múltiplo de {a}, entonces {a} es divisor de {b}.", True),
             (f"{a} es múltiplo de {b}.", False), (f"{b} es divisible entre {a}.", True), (f"{a} divide a {b}.", True),
             (f"{b} es divisor de {a}.", False), ("Todo número es múltiplo de sí mismo.", True), ("El 0 es divisor de todos los números.", False),
             ("El 1 es divisor de todos los números.", True), ("Un número tiene infinitos divisores.", False), ("Un número tiene infinitos múltiplos.", True)]
    text, truth = c.choice(forms)
    c.step("Recordar la relación", f"${b} = {a} \\times {k}$: {b} es múltiplo de {a} y {a} es divisor de {b}.", procedure="Relación múltiplo–divisor")
    return c.build(name="Relación entre múltiplos y divisores", procedure="Razonamiento sobre divisibilidad", prompt=f"¿Verdadero o falso? **{text}**",
                   answer=A_choice_fixed(["Verdadero", "Falso"], "Verdadero" if truth else "Falso"), final="Verdadero" if truth else "Falso")


@generator("b10.problemas_divisibilidad", "Aplicaciones de múltiplos y divisores", {1: ["filas"], 2: ["filas"], 3: ["filas"]})
def problemas_divisibilidad(c: Ctx):
    n = c.choice([12, 18, 20, 24, 30, 36, 40, 48])
    ds = [d for d in divisors(n) if 1 < d < n]
    c.step("Pensar en divisores", f"Las filas deben ser iguales: el número de filas divide a {n}.", procedure="Aplicación de divisores")
    c.step("Contar", f"Divisores de {n} distintos de 1 y {n}: {', '.join(map(str, ds))}", prompt="¿Cuántas opciones hay?", answer=A_int(len(ds)))
    return c.build(name="Problema de divisores", procedure="Búsqueda de divisores", prompt=f"Se quieren ordenar {n} sillas en filas iguales, con más de una fila y más de una silla por fila. ¿De cuántas maneras se puede hacer?",
                   answer=A_int(len(ds)), final=str(len(ds)))


# ============================================================ PRIMOS (B11) ==


@generator("b11.primo_compuesto", "Números primos y compuestos", {1: ["pequeno"], 2: ["mediano"], 3: ["grande"]})
def primo_compuesto(c: Ctx):
    n = c.by_level(c.randint(2, 30), c.randint(30, 120), c.randint(120, 400))
    if c.level >= 2 and c.rng.random() < 0.5:
        # números "trampa": impares compuestos que parecen primos
        n = c.choice([p * q for p in (7, 11, 13, 17) for q in (7, 11, 13, 17, 19) if c.by_level(2, 30, 120) <= p * q <= c.by_level(30, 120, 400)] or [n])
    prime = is_prime(n)
    from math import isqrt

    c.step("Probar divisores primos hasta √n", f"$\\sqrt{{{n}}} \\approx {isqrt(n)}$: basta probar 2, 3, 5, 7… hasta {isqrt(n)}.",
           procedure="Prueba de primalidad por división", why="Si n = a·b con a ≤ b, entonces a ≤ √n.")
    if prime:
        c.step("Ninguno divide", f"{n} no es divisible por ninguno: es **primo** (sólo tiene dos divisores: 1 y {n}).")
    else:
        p = next(p for p in range(2, n) if n % p == 0)
        c.step("Encontramos un divisor", f"${n} = {p} \\times {n // p}$: es **compuesto**.",
               prompt=f"¿Cuál es el menor divisor de {n} mayor que 1?", answer=A_int(p))
    return c.build(name="Primo o compuesto", procedure="Prueba de primalidad", prompt=f"¿El número **{n}** es primo o compuesto?",
                   answer=A_choice_fixed(["Primo", "Compuesto"], "Primo" if prime else "Compuesto"), final="Primo" if prime else "Compuesto")


@generator("b11.cero_uno", "El número 1 y el número 0", {1: ["vf"], 2: ["vf"], 3: ["vf"]})
def cero_uno(c: Ctx):
    bank = [("El 1 es un número primo.", False, "Un primo tiene exactamente DOS divisores; el 1 sólo tiene uno."),
            ("El 1 es un número compuesto.", False, "El 1 no es primo ni compuesto."),
            ("El 0 es un número primo.", False, "El 0 tiene infinitos divisores; no es primo ni compuesto."),
            ("El 0 es múltiplo de todos los números.", True, "0 = n × 0."),
            ("El 2 es el único número primo par.", True, "Cualquier otro par es divisible entre 2."),
            ("Todos los números primos son impares.", False, "El 2 es primo y par."),
            ("El 1 es divisor de todos los números.", True, "n = 1 × n.")]
    text, truth, why = c.choice(bank)
    c.step("Recordar la definición", why, procedure="Definición de número primo")
    return c.build(name="Casos especiales: 0 y 1", procedure="Aplicación de la definición", prompt=f"¿Verdadero o falso? **{text}**",
                   answer=A_choice_fixed(["Verdadero", "Falso"], "Verdadero" if truth else "Falso"), final="Verdadero" if truth else "Falso")


@generator("b11.criba", "Criba de Eratóstenes", {1: ["hasta_30"], 2: ["hasta_50"], 3: ["hasta_100"]})
def criba(c: Ctx):
    n = {"hasta_30": 30, "hasta_50": 50, "hasta_100": 100}[c.variant]
    lo = c.choice([1, n // 2])
    primes, trace = sieve(n)
    wanted = [p for p in primes if p > lo]
    c.step("Escribir los números del 2 al " + str(n), "Empezamos con todos sin tachar.", procedure="Criba de Eratóstenes")
    for p, crossed in trace:
        c.step(f"Tachar múltiplos de {p}", f"Desde {p * p}: {', '.join(map(str, crossed[:8]))}{'…' if len(crossed) > 8 else ''}",
               why=f"Los múltiplos menores de {p * p} ya fueron tachados por primos más pequeños.")
    c.step("Los que quedan son primos", ", ".join(map(str, primes)), prompt=f"¿Cuántos primos hay entre {lo} y {n}?", answer=A_int(len(wanted)))
    return c.build(name="Criba de Eratóstenes", procedure="Criba de Eratóstenes",
                   prompt=f"Usa la criba de Eratóstenes y escribe todos los números primos mayores que {lo} y menores o iguales que {n}.",
                   answer=A_list(wanted), final="; ".join(map(str, wanted)), workspace={"type": "sieve", "n": n})


@generator("b11.factorizacion", "Descomposición en factores primos", {1: ["pequeno"], 2: ["mediano"], 3: ["grande"]})
def factorizacion(c: Ctx):
    n = c.by_level(c.randint(12, 60), c.randint(60, 400), c.randint(400, 5000))
    if is_prime(n):
        c.retry()
    f = factorize(n)
    rows = factor_ladder(n)
    c.step("Dividir entre el menor primo posible", "Usamos la tabla de divisiones sucesivas (columna de primos).", procedure="Factorización prima por divisiones sucesivas")
    for num_, p in rows:
        c.step(f"{num_} ÷ {p}", f"${num_} \\div {p} = {num_ // p}$")
    c.step("Agrupar en potencias", f"${n} = {fact_tex(f)}$", why="Teorema fundamental de la aritmética: la factorización prima es única.")
    return c.build(name="Factorización prima", procedure="Descomposición en factores primos",
                   prompt=f"Descompón **{n}** en factores primos. Escribe por ejemplo `2^3·3` o `2·2·2·3`.",
                   answer=AnswerSpec(kind="factorization", value=f, placeholder="2^3·3"), final=fact_text(f),
                   workspace={"type": "ladder", "n": n})


@generator("b11.aplicaciones_factorizacion", "Aplicaciones de la factorización", {1: ["numero_desde_factores"], 2: ["contar_divisores"], 3: ["contar_divisores"]})
def aplicaciones_factorizacion(c: Ctx):
    primes = c.sample([2, 3, 5, 7], c.randint(2, 3))
    f = Counter({p: c.randint(1, 3) for p in primes})
    n = 1
    for p, e in f.items():
        n *= p**e
    if c.variant == "numero_desde_factores":
        c.step("Multiplicar", f"${fact_tex(f)} = {n}$", procedure="Recomposición desde la factorización")
        return c.build(name="Número a partir de su factorización", procedure="Recomposición", prompt=f"¿Qué número tiene la factorización ${fact_tex(f)}$?",
                       answer=A_int(n), final=str(n))
    count = 1
    for e in f.values():
        count *= e + 1
    c.step("Usar los exponentes", f"Nº de divisores = producto de (exponente + 1): " + " × ".join(f"({e}+1)" for e in f.values()) + f" = {count}",
           procedure="Conteo de divisores por factorización", why="Cada divisor elige un exponente de 0 a e para cada primo.")
    return c.build(name="Número de divisores", procedure="Conteo de divisores mediante factorización", prompt=f"¿Cuántos divisores tiene ${n} = {fact_tex(f)}$?",
                   answer=A_int(count), final=str(count))


# =============================================================== MCD (B12) ==


def _pair_with_gcd(c: Ctx, lo: int, hi: int) -> tuple[int, int]:
    g = c.randint(2, c.by_level(6, 12, 25))
    for _ in range(300):
        a, b = g * c.randint(2, hi // g), g * c.randint(2, hi // g)
        if a != b and lo <= a and lo <= b and gcd(a, b) == g:
            return a, b
    c.retry()
    return 0, 0


@generator("b12.mcd_listado", "MCD por listado de divisores", {1: ["base"], 2: ["base"], 3: ["base"]})
def mcd_listado(c: Ctx):
    a, b = _pair_with_gcd(c, 8, c.by_level(40, 80, 150))
    da, db = divisors(a), divisors(b)
    common = [d for d in da if d in db]
    c.step(f"Divisores de {a}", "; ".join(map(str, da)), procedure="Cálculo del MCD por listado de divisores")
    c.step(f"Divisores de {b}", "; ".join(map(str, db)))
    c.step("Divisores comunes", "; ".join(map(str, common)), prompt="¿Cuántos divisores comunes hay?", answer=A_int(len(common)))
    c.step("Elegir el mayor", f"MCD({a}, {b}) = {common[-1]}")
    c.mistake("producto", "Multiplicaste los números", "El MCD es un divisor, no puede ser mayor que los números.", a * b, 3)
    c.mistake("mcm", "Calculaste el MCM", "MCD = el MAYOR de los divisores COMUNES.", lcm(a, b), 3)
    return c.build(name="Máximo común divisor", procedure="Listado de divisores", prompt=f"Calcula el **MCD({a}, {b})** listando sus divisores.",
                   answer=A_int(common[-1]), final=str(common[-1]))


@generator("b12.mcd_factorizacion", "MCD por factorización prima", {1: ["dos"], 2: ["dos"], 3: ["tres"]})
def mcd_factorizacion(c: Ctx):
    k = 2 if c.variant == "dos" else 3
    g = c.choice([2, 3, 4, 6, 8, 9, 12, 18])
    nums = sorted({g * c.choice([1, 2, 3, 5, 7]) * c.choice([1, 2, 3, 5]) for _ in range(k + 2)})[:k]
    if len(nums) < k:
        c.retry()
    from functools import reduce

    G = reduce(gcd, nums)
    fs = [factorize(n) for n in nums]
    for n, f in zip(nums, fs):
        c.step(f"Factorizar {n}", f"${n} = {fact_tex(f)}$", procedure="Factorización prima")
    common = Counter({p: min(f[p] for f in fs) for p in fs[0] if all(p in f for f in fs)})
    c.step("Factores comunes con el menor exponente", f"${fact_tex(common) if common else '1'} = {G}$", procedure="Cálculo del MCD por factorización",
           why="El MCD debe dividir a todos: sólo puede usar primos comunes y como máximo el exponente más pequeño.",
           prompt="¿Cuánto vale el MCD?", answer=A_int(G))
    L = reduce(lcm, nums)
    c.mistake("mayor_exponente", "Tomaste los exponentes mayores (eso es el MCM)", "Para el MCD: primos comunes con el MENOR exponente.", L, len(nums))
    return c.build(name="MCD por factorización", procedure="Factorización prima (comunes con menor exponente)",
                   prompt="Calcula el MCD de " + ", ".join(map(str, nums)) + " usando factorización prima.", answer=A_int(G), final=str(G))


@generator("b12.euclides", "Algoritmo de Euclides", {1: ["base"], 2: ["base"], 3: ["grande"]})
def euclides(c: Ctx):
    a, b = _pair_with_gcd(c, 20, c.by_level(100, 400, 3000))
    a, b = max(a, b), min(a, b)
    tr = euclid_trace(a, b)
    c.step("Idea", "MCD(a, b) = MCD(b, residuo de a ÷ b). Repetimos hasta que el residuo sea 0.", procedure="Algoritmo de Euclides",
           why="Todo divisor común de a y b divide también al residuo a − q·b.")
    for x, y, q, r in tr:
        c.step(f"Dividir {x} entre {y}", f"${x} = {y} \\times {q} + {r}$", prompt=f"¿Residuo de {x} ÷ {y}?", answer=A_int(r))
    G = tr[-1][1]
    c.step("El último divisor es el MCD", f"MCD = {G}")
    return c.build(name="Algoritmo de Euclides", procedure="Divisiones sucesivas de Euclides", prompt=f"Calcula MCD({a}, {b}) con el algoritmo de Euclides.",
                   answer=A_int(G), final=str(G))


@generator("b12.problemas_mcd", "Problemas de reparto y agrupación (MCD)", {1: ["grupos"], 2: ["cuadrados"], 3: ["grupos", "cuadrados"]})
def problemas_mcd(c: Ctx):
    a, b = _pair_with_gcd(c, 12, c.by_level(60, 120, 300))
    G = gcd(a, b)
    if c.variant == "grupos":
        story = f"Hay {a} manzanas y {b} naranjas. Se quieren hacer cestas iguales, con el mayor número de cestas posible y sin que sobre fruta. ¿Cuántas cestas se hacen?"
        unit = "cestas"
    else:
        story = f"Un terreno rectangular mide {a} m por {b} m. Se quiere dividir en parcelas cuadradas iguales, lo más grandes posible. ¿Cuánto mide el lado de cada parcela?"
        unit = "m"
    c.step("Reconocer el MCD", "«El mayor tamaño/número que divide exactamente a ambos» → MCD.", procedure="Identificación del MCD en problemas")
    c.step("Calcular", f"MCD({a}, {b}) = {G}", prompt="¿MCD?", answer=A_int(G))
    c.step("Interpretar", f"Respuesta: {G} {unit}.")
    c.mistake("mcm", "Usaste el MCM", "Repartir sin que sobre en partes lo más grandes posible → MCD.", lcm(a, b), 0)
    return c.build(name="Problema de MCD", procedure="Resolución de problemas con MCD", prompt=story, answer=A_int(G, unit), final=f"{G} {unit}")


@generator("b12.divisores_comunes", "Divisores comunes", {1: ["base"], 2: ["base"], 3: ["base"]})
def divisores_comunes(c: Ctx):
    a, b = _pair_with_gcd(c, 8, c.by_level(36, 72, 120))
    common = [d for d in divisors(a) if b % d == 0]
    c.step("Divisores de cada uno", f"D({a}) = {divisors(a)}; D({b}) = {divisors(b)}", procedure="Intersección de conjuntos de divisores")
    c.step("Comunes", "; ".join(map(str, common)), why="Los divisores comunes son exactamente los divisores del MCD.")
    return c.build(name="Divisores comunes", procedure="Intersección de divisores", prompt=f"Escribe todos los divisores comunes de {a} y {b}.",
                   answer=A_list(common, ordered=False), final="; ".join(map(str, common)))


# =============================================================== MCM (B13) ==


@generator("b13.mcm_listado", "MCM por listado de múltiplos", {1: ["base"], 2: ["base"], 3: ["base"]})
def mcm_listado(c: Ctx):
    a, b = c.randint(2, c.by_level(10, 15, 25)), c.randint(2, c.by_level(10, 15, 25))
    if a == b:
        c.retry()
    L = lcm(a, b)
    if L > 200:
        c.retry()
    ma = [a * i for i in range(1, L // a + 1)]
    mb = [b * i for i in range(1, L // b + 1)]
    c.step(f"Múltiplos de {a}", "; ".join(map(str, ma)), procedure="Cálculo del MCM por listado de múltiplos")
    c.step(f"Múltiplos de {b}", "; ".join(map(str, mb)))
    c.step("Primer múltiplo común", f"MCM({a}, {b}) = {L}", prompt="¿Primer múltiplo común (sin contar el 0)?", answer=A_int(L))
    c.mistake("producto", "Multiplicaste directamente", "a·b es múltiplo común, pero no siempre el MÍNIMO.", a * b, 2)
    c.mistake("mcd", "Calculaste el MCD", "El MCM es un múltiplo: es ≥ que ambos números.", gcd(a, b), 2)
    return c.build(name="Mínimo común múltiplo", procedure="Listado de múltiplos", prompt=f"Calcula el **MCM({a}, {b})** listando múltiplos.",
                   answer=A_int(L), final=str(L))


@generator("b13.mcm_factorizacion", "MCM por factorización prima", {1: ["dos"], 2: ["dos", "tres"], 3: ["tres"]})
def mcm_factorizacion(c: Ctx):
    from functools import reduce

    k = 2 if c.variant == "dos" else 3
    nums = sorted(set(c.choice([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 28, 30, 36]) for _ in range(k + 2)))[:k]
    if len(nums) < k:
        c.retry()
    L = reduce(lcm, nums)
    fs = [factorize(n) for n in nums]
    for n, f in zip(nums, fs):
        c.step(f"Factorizar {n}", f"${n} = {fact_tex(f)}$", procedure="Factorización prima")
    allp = Counter({p: max(f.get(p, 0) for f in fs) for f in fs for p in f})
    c.step("Todos los primos con el mayor exponente", f"${fact_tex(allp)} = {L}$", procedure="Cálculo del MCM por factorización",
           why="El MCM debe contener a cada número: necesita cada primo con su mayor exponente.", prompt="¿Cuánto vale el MCM?", answer=A_int(L))
    c.mistake("menor_exponente", "Tomaste los menores exponentes (eso es el MCD)", "MCM: todos los primos con el MAYOR exponente.", reduce(gcd, nums), len(nums))
    c.mistake("producto", "Multiplicaste los números", "El producto es múltiplo común pero puede no ser el mínimo.", reduce(lambda x, y: x * y, nums), len(nums))
    return c.build(name="MCM por factorización", procedure="Factorización prima (todos, con mayor exponente)",
                   prompt="Calcula el MCM de " + ", ".join(map(str, nums)) + " usando factorización prima.", answer=A_int(L), final=str(L))


@generator("b13.relacion_mcd_mcm", "Relación entre MCD y MCM", {1: ["base"], 2: ["base"], 3: ["base"]})
def relacion_mcd_mcm(c: Ctx):
    a, b = _pair_with_gcd(c, 6, c.by_level(40, 90, 200))
    G, L = gcd(a, b), lcm(a, b)
    c.step("Usar la propiedad", f"MCD(a, b) × MCM(a, b) = a × b", procedure="Relación MCD–MCM",
           why="Cada primo aparece con su menor exponente en el MCD y con el mayor en el MCM: juntos suman los exponentes de a y b.")
    c.step("Despejar", f"MCM = ${a} \\times {b} \\div {G} = {a * b} \\div {G} = {L}$", prompt="¿MCM?", answer=A_int(L))
    return c.build(name="Relación MCD–MCM", procedure="MCM = a·b ÷ MCD", prompt=f"Sabiendo que MCD({a}, {b}) = {G}, calcula MCM({a}, {b}) sin listar múltiplos.",
                   answer=A_int(L), final=str(L))


@generator("b13.multiplos_comunes", "Múltiplos comunes", {1: ["base"], 2: ["base"], 3: ["base"]})
def multiplos_comunes(c: Ctx):
    a, b = c.randint(2, 9), c.randint(2, 9)
    if a == b:
        c.retry()
    L = lcm(a, b)
    ms = [L * i for i in range(1, 4)]
    c.step("Hallar el MCM", f"MCM({a}, {b}) = {L}", procedure="Múltiplos comunes")
    c.step("Múltiplos del MCM", "; ".join(map(str, ms)), why="Los múltiplos comunes son exactamente los múltiplos del MCM.")
    return c.build(name="Múltiplos comunes", procedure="Múltiplos del MCM", prompt=f"Escribe los **tres primeros** múltiplos comunes (no nulos) de {a} y {b}.",
                   answer=A_list(ms), final="; ".join(map(str, ms)))


@generator("b13.problemas_mcm", "Problemas de coincidencia y periodicidad (MCM)", {1: ["coincidencia"], 2: ["coincidencia", "hora"], 3: ["tres"]})
def problemas_mcm(c: Ctx):
    from functools import reduce

    if c.variant == "tres":
        ps = sorted(c.sample([2, 3, 4, 5, 6, 8, 10, 12], 3))
        L = reduce(lcm, ps)
        story = f"Tres faros se encienden cada {ps[0]}, {ps[1]} y {ps[2]} segundos. Si acaban de encenderse juntos, ¿dentro de cuántos segundos volverán a coincidir?"
        unit = "segundos"
    else:
        a, b = c.sample([4, 5, 6, 8, 9, 10, 12, 15, 18, 20], 2)
        L = lcm(a, b)
        if c.variant == "hora":
            h = c.randint(6, 9)
            story = f"Un autobús sale cada {a} minutos y otro cada {b} minutos. Salieron juntos a las {h}:00. ¿Cuántos minutos después volverán a salir juntos?"
        else:
            story = f"{c.choice(NAMES)} va a nadar cada {a} días y a correr cada {b} días. Hoy hizo ambas cosas. ¿Dentro de cuántos días volverá a coincidir?"
        unit = "minutos" if c.variant == "hora" else "días"
        ps = [a, b]
    c.step("Reconocer el MCM", "«Volver a coincidir» → primer múltiplo común → MCM.", procedure="Identificación del MCM en problemas")
    c.step("Calcular", f"MCM({', '.join(map(str, ps))}) = {L}", prompt="¿MCM?", answer=A_int(L))
    c.mistake("mcd", "Usaste el MCD", "Coincidencias periódicas → MCM.", reduce(gcd, ps), 0)
    c.mistake("producto", "Multiplicaste los periodos", "El producto es un múltiplo común pero no necesariamente el primero.", reduce(lambda x, y: x * y, ps), 1)
    return c.build(name="Problema de MCM", procedure="Resolución de problemas con MCM", prompt=story, answer=A_int(L, unit), final=f"{L} {unit}")
