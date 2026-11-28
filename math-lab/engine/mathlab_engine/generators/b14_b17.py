"""Bloques 14–15 (fracciones) y 16–17 (decimales)."""

from __future__ import annotations

from fractions import Fraction
from math import gcd

from ..algorithms.numtheory import lcm
from ..core.registry import Ctx, generator, mc
from ..core.types import AnswerSpec
from ..numbers.fmt import decimal_str, fixed_str, is_terminating, num, round_half_up, tex, tex_frac
from ..numbers.words import decimal_to_words
from ._common import NAMES, A_choice_fixed, A_fields, A_int, A_list

F = Fraction


def A_frac(q: Fraction, form: str = "simplified") -> AnswerSpec:
    return AnswerSpec(kind="number", value=F(q), form=form, placeholder="ej.: 3/4")  # type: ignore[arg-type]


def ftex(q: Fraction) -> str:
    return tex(q, as_fraction=True)


def _proper(c: Ctx, max_den: int = 12) -> Fraction:
    d = c.randint(2, max_den)
    return F(c.randint(1, d - 1), d)


# ============================================ FUNDAMENTOS FRACCIONES (B14) ==


@generator("b14.concepto_fraccion", "Qué es una fracción", {1: ["partes"], 2: ["de_cantidad"], 3: ["de_cantidad"]})
def concepto_fraccion(c: Ctx):
    d = c.randint(2, 10)
    n = c.randint(1, d - 1)
    if c.variant == "partes":
        c.step("Contar partes", f"El entero está dividido en {d} partes iguales (denominador) y se toman {n} (numerador).",
               procedure="Lectura de una fracción")
        return c.build(name="Concepto de fracción", procedure="Fracción como parte de un todo",
                       prompt=f"Una pizza se corta en {d} porciones iguales y se comen {n}. ¿Qué fracción de la pizza se comió?",
                       answer=AnswerSpec(kind="number", value=F(n, d), placeholder="ej.: 3/8"), final=f"{n}/{d}",
                       workspace={"type": "fraction_bar", "num": n, "den": d})
    total = d * c.randint(2, 12)
    c.step("Dividir entre el denominador", f"${total} \\div {d} = {total // d}$ (una parte)", procedure="Fracción de una cantidad",
           prompt=f"¿Cuánto es 1/{d} de {total}?", answer=A_int(total // d))
    c.step("Multiplicar por el numerador", f"${total // d} \\times {n} = {total // d * n}$", prompt="¿Resultado?", answer=A_int(total // d * n))
    c.mistake("al_reves", "Multiplicaste por el denominador", "Se divide entre el denominador y se multiplica por el numerador.", total * d // n if (total * d) % n == 0 else -1, 0)
    return c.build(name="Fracción de una cantidad", procedure="Fracción de una cantidad (÷ denominador, × numerador)",
                   prompt=f"¿Cuánto es ${tex_frac(n, d)}$ de {total}?", answer=A_int(total // d * n), final=str(total // d * n))


@generator("b14.numerador_denominador", "Numerador y denominador", {1: ["base"], 2: ["base"], 3: ["base"]})
def numerador_denominador(c: Ctx):
    n, d = c.randint(1, 20), c.randint(2, 20)
    role = c.choice(["numerador", "denominador"])
    c.step("Recordar", "Numerador (arriba): partes que se toman. Denominador (abajo): partes iguales en que se divide el entero.",
           procedure="Terminología de fracciones")
    return c.build(name="Términos de una fracción", procedure="Identificación de términos", prompt=f"En ${tex_frac(n, d)}$, ¿cuál es el **{role}**?",
                   answer=A_int(n if role == "numerador" else d), final=str(n if role == "numerador" else d))


@generator("b14.representacion_grafica", "Representación gráfica", {1: ["leer"], 2: ["leer"], 3: ["leer"]})
def representacion_grafica(c: Ctx):
    d = c.randint(2, 12)
    n = c.randint(1, d)
    c.step("Contar", f"La barra tiene {d} partes iguales y hay {n} sombreadas: ${tex_frac(n, d)}$.", procedure="Lectura de una representación gráfica")
    return c.build(name="Representación gráfica", procedure="Lectura de una barra de fracciones",
                   prompt="¿Qué fracción representa la parte sombreada de la barra?", answer=AnswerSpec(kind="number", value=F(n, d)),
                   final=f"{n}/{d}", workspace={"type": "fraction_bar", "num": n, "den": d, "show": True})


@generator("b14.clasificar_fracciones", "Fracciones propias, impropias y aparentes", {1: ["base"], 2: ["base"], 3: ["base"]})
def clasificar_fracciones(c: Ctx):
    d = c.randint(2, 12)
    kind = c.choice(["Propia", "Impropia", "Aparente"])
    if kind == "Propia":
        n = c.randint(1, d - 1)
    elif kind == "Aparente":
        n = d * c.randint(1, 5)
    else:
        n = d * c.randint(1, 3) + c.randint(1, d - 1)
    c.step("Comparar numerador y denominador", f"{n} {'<' if n < d else '>' if n > d else '='} {d}", procedure="Clasificación de fracciones")
    c.step("Clasificar", {"Propia": "Numerador menor → propia (menor que 1).",
                          "Impropia": "Numerador mayor y no múltiplo del denominador → impropia (mayor que 1, no entera).",
                          "Aparente": f"El numerador es múltiplo del denominador → aparente (= {n // d}, un entero)."}[kind])
    return c.build(name="Clasificación de fracciones", procedure="Clasificación según numerador y denominador", prompt=f"¿Cómo se clasifica ${tex_frac(n, d)}$?",
                   answer=A_choice_fixed(["Propia", "Impropia", "Aparente"], kind), final=kind)


@generator("b14.mixtos", "Números mixtos", {1: ["a_impropia"], 2: ["a_mixto", "a_impropia"], 3: ["a_mixto"]})
def mixtos(c: Ctx):
    d = c.randint(2, 12)
    w = c.randint(1, c.by_level(5, 9, 20))
    r = c.randint(1, d - 1)
    n = w * d + r
    if c.variant == "a_impropia":
        c.step("Multiplicar el entero por el denominador", f"${w} \\times {d} = {w * d}$", procedure="Conversión de número mixto a fracción impropia",
               prompt=f"¿{w} × {d}?", answer=A_int(w * d))
        c.step("Sumar el numerador", f"${w * d} + {r} = {n}$", prompt="¿Nuevo numerador?", answer=A_int(n))
        c.step("Mantener el denominador", f"$= {tex_frac(n, d)}$", why=f"{w} enteros son {w * d} partes de tamaño 1/{d}.")
        c.mistake("sin_multiplicar", "Sumaste el entero sin multiplicarlo", "El entero se convierte primero en partes: entero × denominador.",
                  F(w + r, d), 0)
        return c.build(name="Mixto a impropia", procedure="Conversión de número mixto a fracción impropia",
                       prompt=f"Convierte el número mixto ${w}\\,{tex_frac(r, d)}$ en fracción impropia.", answer=A_frac(F(n, d), "any"),
                       final=f"{n}/{d}")
    c.step("Dividir numerador entre denominador", f"${n} \\div {d} = {w}$, residuo {r}", procedure="Conversión de fracción impropia a número mixto",
           prompt=f"¿Cociente de {n} ÷ {d}?", answer=A_int(w))
    c.step("Escribir el mixto", f"Entero = cociente ({w}); fracción = residuo/denominador (${tex_frac(r, d)}$).")
    return c.build(name="Impropia a mixto", procedure="Conversión de fracción impropia a número mixto",
                   prompt=f"Escribe ${tex_frac(n, d)}$ como número mixto.",
                   answer=A_fields(("entero", "Parte entera", A_int(w)), ("num", "Numerador", A_int(r)), ("den", "Denominador", A_int(d))),
                   final=f"{w} {r}/{d}")


@generator("b14.equivalentes", "Fracciones equivalentes", {1: ["completar"], 2: ["completar", "verificar"], 3: ["verificar"]})
def equivalentes(c: Ctx):
    q = _proper(c, 9)
    k = c.randint(2, c.by_level(5, 9, 12))
    if c.variant == "completar":
        which = c.choice(["num", "den"])
        c.step("Encontrar el factor", f"{'El denominador' if which == 'num' else 'El numerador'} se multiplicó por {k}.", procedure="Amplificación")
        c.step("Aplicar el mismo factor", f"${ftex(q)} = {tex_frac(q.numerator * k, q.denominator * k)}$",
               why="Multiplicar numerador y denominador por el mismo número no cambia el valor.")
        if which == "num":
            prompt, ans = f"${ftex(q)} = \\frac{{\\square}}{{{q.denominator * k}}}$", q.numerator * k
        else:
            prompt, ans = f"${ftex(q)} = \\frac{{{q.numerator * k}}}{{\\square}}$", q.denominator * k
        c.mistake("suma", "Sumaste en lugar de multiplicar", "Las fracciones equivalentes se obtienen multiplicando (o dividiendo) ambos términos.",
                  (q.numerator + (q.denominator * k - q.denominator)) if which == "num" else (q.denominator + (q.numerator * k - q.numerator)), 1)
        return c.build(name="Fracciones equivalentes", procedure="Amplificación de fracciones", prompt=f"Completa: {prompt}", answer=A_int(ans), final=str(ans))
    a, b = q.numerator * k, q.denominator * k
    eq = c.rng.random() < 0.5
    d_ = b if eq else b + c.choice([-1, 1])
    c.step("Productos cruzados", f"${q.numerator} \\times {d_} = {q.numerator * d_}$ y ${q.denominator} \\times {a} = {q.denominator * a}$",
           procedure="Prueba de productos cruzados", why="a/b = c/d ⇔ a·d = b·c.")
    return c.build(name="¿Son equivalentes?", procedure="Productos cruzados", prompt=f"¿Son equivalentes ${ftex(q)}$ y ${tex_frac(a, d_)}$?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if eq else "No"), final="Sí" if eq else "No")


@generator("b14.simplificar", "Simplificación de fracciones", {1: ["un_paso"], 2: ["varios_pasos"], 3: ["grande"]})
def simplificar(c: Ctx):
    q = _proper(c, c.by_level(9, 15, 25)) if c.rng.random() < 0.8 else F(c.randint(13, 40), c.randint(2, 12))
    k = c.by_level(c.choice([2, 3, 5]), c.choice([4, 6, 8, 9, 12]), c.choice([12, 18, 24, 36]))
    n, d = q.numerator * k, q.denominator * k
    g = gcd(n, d)
    c.step("Calcular el MCD", f"MCD({n}, {d}) = {g}", procedure="Simplificación por el MCD", prompt="¿MCD?", answer=A_int(g))
    c.step("Dividir ambos términos", f"$\\frac{{{n} \\div {g}}}{{{d} \\div {g}}} = {ftex(q)}$", why="Dividir ambos términos por el mismo número da una fracción equivalente.")
    c.step("Comprobar", "Ya no hay divisores comunes (fracción irreducible).")
    return c.build(name="Simplificación de fracciones", procedure="Simplificación (dividir por el MCD)", prompt=f"Simplifica hasta la fracción irreducible: ${tex_frac(n, d)}$",
                   answer=A_frac(q), final=f"{q.numerator}/{q.denominator}")


@generator("b14.amplificar", "Amplificación de fracciones", {1: ["factor"], 2: ["denominador"], 3: ["denominador"]})
def amplificar(c: Ctx):
    q = _proper(c, 9)
    k = c.randint(2, 10)
    if c.variant == "factor":
        c.step("Multiplicar ambos términos", f"$\\frac{{{q.numerator} \\times {k}}}{{{q.denominator} \\times {k}}} = {tex_frac(q.numerator * k, q.denominator * k)}$",
               procedure="Amplificación")
        return c.build(name="Amplificación", procedure="Amplificación de fracciones", prompt=f"Amplifica ${ftex(q)}$ por {k}. ¿Qué numerador queda?",
                       answer=A_int(q.numerator * k), final=f"{q.numerator * k}/{q.denominator * k}")
    D = q.denominator * k
    c.step("Hallar el factor", f"${D} \\div {q.denominator} = {k}$", procedure="Amplificación a un denominador dado", prompt="¿Factor?", answer=A_int(k))
    c.step("Multiplicar el numerador", f"${q.numerator} \\times {k} = {q.numerator * k}$")
    return c.build(name="Amplificación a denominador dado", procedure="Amplificación", prompt=f"Escribe ${ftex(q)}$ con denominador {D}. ¿Cuál es el numerador?",
                   answer=A_int(q.numerator * k), final=f"{q.numerator * k}/{D}")


@generator("b14.comparar_fracciones", "Comparación y orden de fracciones", {1: ["igual_den"], 2: ["distinto_den"], 3: ["ordenar"]})
def comparar_fracciones(c: Ctx):
    if c.variant == "ordenar":
        vals: list[Fraction] = []
        while len(vals) < 4:
            v = _proper(c, 12)
            if v not in vals:
                vals.append(v)
        L = 1
        for v in vals:
            L = lcm(L, v.denominator)
        c.step("Común denominador", f"MCM de los denominadores = {L}", procedure="Reducción a común denominador")
        c.step("Convertir", ", ".join(f"${ftex(v)} = {tex_frac(int(v * L), L)}$" for v in vals))
        c.step("Ordenar por numerador", " < ".join(f"${ftex(v)}$" for v in sorted(vals)))
        return c.build(name="Ordenar fracciones", procedure="Común denominador", prompt="Ordena de menor a mayor (separa con ;): " +
                       ", ".join(f"${ftex(v)}$" for v in vals), answer=AnswerSpec(kind="list", value=sorted(vals), placeholder="1/4; 1/3; 1/2"),
                       final="; ".join(f"{v.numerator}/{v.denominator}" for v in sorted(vals)))
    if c.variant == "igual_den":
        d = c.randint(3, 15)
        a, b = c.sample(range(1, 2 * d), 2)
        x, y = F(a, d), F(b, d)
        c.step("Mismo denominador", "Es mayor la que tiene mayor numerador.", procedure="Comparación con igual denominador")
    else:
        x, y = _proper(c, 12), _proper(c, 12)
        if x == y:
            c.retry()
        c.step("Productos cruzados", f"${x.numerator} \\times {y.denominator} = {x.numerator * y.denominator}$ vs "
               f"${y.numerator} \\times {x.denominator} = {y.numerator * x.denominator}$", procedure="Comparación por productos cruzados")
    sym = "<" if x < y else (">" if x > y else "=")
    ans = A_choice_fixed(["<", "=", ">"], sym)
    if x.numerator != y.numerator and x.denominator != y.denominator:
        wrong = "<" if x.denominator < y.denominator else ">"
        if wrong != sym:
            from ._common import cid

            c.mistake("compara_denominadores", "Comparaste sólo los denominadores", "Un denominador mayor significa partes MÁS PEQUEÑAS.", cid(ans, wrong), 0)
    return c.build(name="Comparación de fracciones", procedure="Comparación de fracciones", prompt=f"Elige el símbolo: ${ftex(x)} \\;\\square\\; {ftex(y)}$",
                   answer=ans, final=sym)


# ============================================ OPERACIONES FRACCIONES (B15) ==


def _two(c: Ctx, same: bool) -> tuple[tuple[int, int], tuple[int, int]]:
    """Dos fracciones como (numerador, denominador) SIN simplificar, tal como se muestran."""
    if same:
        d = c.randint(3, 15)
        return (c.randint(1, d - 1), d), (c.randint(1, d - 1), d)
    for _ in range(100):
        x, y = _proper(c, 12), _proper(c, 12)
        if x.denominator != y.denominator:
            return (x.numerator, x.denominator), (y.numerator, y.denominator)
    c.retry()
    return (0, 1), (0, 1)


def rtex(t: tuple[int, int]) -> str:
    return tex_frac(t[0], t[1])


def _sum_steps(c: Ctx, xt: tuple[int, int], yt: tuple[int, int], op: str) -> Fraction:
    x, y = F(*xt), F(*yt)
    res = x + y if op == "+" else x - y
    verb = "Suma" if op == "+" else "Resta"
    if xt[1] == yt[1]:
        d = xt[1]
        n = xt[0] + yt[0] if op == "+" else xt[0] - yt[0]
        c.step("Mismo denominador", f"Se {'suman' if op == '+' else 'restan'} los numeradores y se conserva el denominador.",
               procedure=f"{verb} de fracciones con igual denominador")
        c.step("Operar numeradores", f"${xt[0]} {op} {yt[0]} = {n}$", prompt="¿Nuevo numerador?", answer=A_int(n))
        c.step("Simplificar si se puede", f"${tex_frac(n, d)} = {ftex(res)}$")
        c.mistake("opera_denominadores", f"{'Sumaste' if op == '+' else 'Restaste'} también los denominadores",
                  "Con igual denominador, el denominador se conserva.", F(n, 2 * d) if op == "+" else F(-999), 1)
    else:
        L = lcm(xt[1], yt[1])
        xa, ya = xt[0] * (L // xt[1]), yt[0] * (L // yt[1])
        n = xa + ya if op == "+" else xa - ya
        c.step("Común denominador", f"MCM({xt[1]}, {yt[1]}) = {L}", procedure=f"{verb} de fracciones con distinto denominador",
               why="Sólo se pueden sumar o restar partes del mismo tamaño.", prompt="¿Común denominador (MCM)?", answer=A_int(L))
        c.step("Fracciones equivalentes", f"${rtex(xt)} = {tex_frac(xa, L)}$, ${rtex(yt)} = {tex_frac(ya, L)}$", procedure="Amplificación")
        c.step("Operar numeradores", f"$\\frac{{{xa} {op} {ya}}}{{{L}}} = {tex_frac(n, L)}$", prompt="¿Numerador resultante?", answer=A_int(n))
        c.step("Simplificar", f"$= {ftex(res)}$")
        if op == "+":
            c.mistake("suma_directa", "Sumaste numeradores y denominadores por separado",
                      "Primero hay que llevar las fracciones a un común denominador; los denominadores NO se suman.",
                      F(xt[0] + yt[0], xt[1] + yt[1]), 1)
        elif xt[1] != yt[1] and xt[0] - yt[0] >= 0:
            c.mistake("resta_directa", "Restaste numeradores y denominadores por separado",
                      "Primero hay que llevar las fracciones a un común denominador.", F(xt[0] - yt[0], abs(xt[1] - yt[1])), 1)
    return res


def ftxt(q: Fraction) -> str:
    return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"


@generator("b15.suma_igual_den", "Suma de fracciones con igual denominador", {1: ["base"], 2: ["impropia"], 3: ["tres"]})
def suma_igual_den(c: Ctx):
    xt, yt = _two(c, True)
    d = xt[1]
    if c.variant == "tres":
        z = c.randint(1, d - 1)
        n = xt[0] + yt[0] + z
        res = F(n, d)
        c.step("Mismo denominador", f"Las tres fracciones tienen denominador {d}: se suman los numeradores.", procedure="Suma de fracciones con igual denominador")
        c.step("Sumar numeradores", f"${xt[0]} + {yt[0]} + {z} = {n}$", prompt="¿Suma de numeradores?", answer=A_int(n))
        c.step("Simplificar", f"${tex_frac(n, d)} = {ftex(res)}$")
        return c.build(name="Suma de tres fracciones", procedure="Suma con igual denominador",
                       prompt=f"Calcula y simplifica: ${rtex(xt)} + {rtex(yt)} + {tex_frac(z, d)}$", answer=A_frac(res), final=ftxt(res))
    if c.variant == "impropia" and xt[0] + yt[0] < d:
        c.retry()
    res = _sum_steps(c, xt, yt, "+")
    return c.build(name="Suma con igual denominador", procedure="Suma de fracciones homogéneas", prompt=f"Calcula y simplifica: ${rtex(xt)} + {rtex(yt)}$",
                   answer=A_frac(res), final=ftxt(res))


@generator("b15.suma_distinto_den", "Suma de fracciones con distinto denominador", {1: ["multiplo"], 2: ["base"], 3: ["tres"]})
def suma_distinto_den(c: Ctx):
    if c.variant == "multiplo":
        d = c.randint(2, 6)
        k = c.randint(2, 4)
        xt, yt = (c.randint(1, d - 1), d), (c.randint(1, d * k - 1), d * k)
    else:
        xt, yt = _two(c, False)
    if c.variant == "tres":
        zt = (c.randint(1, 4), c.choice([2, 3, 4, 5, 6]))
        L = lcm(lcm(xt[1], yt[1]), zt[1])
        res = F(*xt) + F(*yt) + F(*zt)
        parts = [t[0] * (L // t[1]) for t in (xt, yt, zt)]
        c.step("Común denominador", f"MCM({xt[1]}, {yt[1]}, {zt[1]}) = {L}", procedure="Suma de fracciones con distinto denominador",
               prompt="¿Común denominador?", answer=A_int(L))
        c.step("Amplificar", ", ".join(f"${rtex(t)} = {tex_frac(p_, L)}$" for t, p_ in zip((xt, yt, zt), parts)))
        c.step("Sumar numeradores", f"${' + '.join(map(str, parts))} = {sum(parts)}$", prompt="¿Numerador?", answer=A_int(sum(parts)))
        c.step("Simplificar", f"${tex_frac(sum(parts), L)} = {ftex(res)}$")
        return c.build(name="Suma de tres fracciones", procedure="Suma con común denominador",
                       prompt=f"Calcula y simplifica: ${rtex(xt)} + {rtex(yt)} + {rtex(zt)}$", answer=A_frac(res), final=ftxt(res))
    res = _sum_steps(c, xt, yt, "+")
    return c.build(name="Suma con distinto denominador", procedure="Suma de fracciones heterogéneas (común denominador)",
                   prompt=f"Calcula y simplifica: ${rtex(xt)} + {rtex(yt)}$", answer=A_frac(res), final=ftxt(res))


@generator("b15.resta_fracciones", "Resta de fracciones", {1: ["igual_den"], 2: ["distinto_den"], 3: ["entero_menos"]})
def resta_fracciones(c: Ctx):
    if c.variant == "entero_menos":
        w = c.randint(1, 4)
        y = _proper(c, 12)
        res = w - y
        c.step("Escribir el entero como fracción", f"${w} = {tex_frac(w * y.denominator, y.denominator)}$", procedure="Resta de un entero menos una fracción")
        c.step("Restar numeradores", f"$\\frac{{{w * y.denominator} - {y.numerator}}}{{{y.denominator}}} = {ftex(res)}$", prompt="¿Numerador?",
               answer=A_int(w * y.denominator - y.numerator))
        if w > y.numerator:
            c.mistake("resta_num", "Restaste el entero directamente del numerador",
                      f"{w} no es {w}/{y.denominator}: hay que escribirlo con el mismo denominador.", F(w - y.numerator, y.denominator), 0)
        return c.build(name="Entero menos fracción", procedure="Resta de fracciones", prompt=f"Calcula: ${w} - {ftex(y)}$", answer=A_frac(res), final=ftxt(res))
    xt, yt = _two(c, c.variant == "igual_den")
    if F(*xt) <= F(*yt):
        xt, yt = yt, xt
    if F(*xt) == F(*yt):
        c.retry()
    res = _sum_steps(c, xt, yt, "-")
    return c.build(name="Resta de fracciones", procedure="Resta de fracciones", prompt=f"Calcula y simplifica: ${rtex(xt)} - {rtex(yt)}$", answer=A_frac(res), final=ftxt(res))


@generator("b15.multiplicacion_fracciones", "Multiplicación de fracciones", {1: ["base"], 2: ["por_entero", "base"], 3: ["simplificar_antes"]})
def multiplicacion_fracciones(c: Ctx):
    if c.variant == "por_entero":
        x = _proper(c, 12)
        k = c.randint(2, 15)
        res = x * k
        c.step("El entero es k/1", f"${k} \\times {ftex(x)} = \\frac{{{k} \\times {x.numerator}}}{{{x.denominator}}}$", procedure="Multiplicación de fracción por entero",
               prompt="¿Nuevo numerador?", answer=A_int(k * x.numerator))
        c.step("Simplificar", f"$= {ftex(res)}$")
        c.mistake("ambos", "Multiplicaste también el denominador", "El entero sólo multiplica al numerador (k = k/1).", x, 0)
        return c.build(name="Fracción por entero", procedure="Multiplicación de fracciones", prompt=f"Calcula: ${k} \\times {ftex(x)}$", answer=A_frac(res),
                       final=f"{res.numerator}/{res.denominator}" if res.denominator > 1 else str(res))
    x, y = _proper(c, 12), _proper(c, 12)
    if c.variant == "simplificar_antes":
        x, y = F(c.randint(2, 9) * 3, c.randint(2, 9) * 4), F(c.randint(2, 9) * 4, c.randint(2, 9) * 3)
    res = x * y
    c.step("Numerador por numerador", f"${x.numerator} \\times {y.numerator} = {x.numerator * y.numerator}$", procedure="Multiplicación de fracciones",
           prompt="¿Producto de numeradores?", answer=A_int(x.numerator * y.numerator))
    c.step("Denominador por denominador", f"${x.denominator} \\times {y.denominator} = {x.denominator * y.denominator}$",
           prompt="¿Producto de denominadores?", answer=A_int(x.denominator * y.denominator))
    c.step("Simplificar", f"$\\frac{{{x.numerator * y.numerator}}}{{{x.denominator * y.denominator}}} = {ftex(res)}$",
           why="También se puede simplificar en cruz antes de multiplicar.")
    c.mistake("comun_denominador", "Buscaste común denominador (eso es para sumar)", "En la multiplicación se multiplica en línea: numeradores entre sí y denominadores entre sí.",
              F(x.numerator * y.numerator, lcm(x.denominator, y.denominator)), 0)
    return c.build(name="Multiplicación de fracciones", procedure="Producto de numeradores y de denominadores", prompt=f"Calcula y simplifica: ${ftex(x)} \\times {ftex(y)}$",
                   answer=A_frac(res), final=f"{res.numerator}/{res.denominator}" if res.denominator > 1 else str(res))


@generator("b15.division_fracciones", "División de fracciones", {1: ["base"], 2: ["base", "entero"], 3: ["mixtos"]})
def division_fracciones(c: Ctx):
    x, y = _proper(c, 12), _proper(c, 12)
    if c.variant == "entero":
        y = F(c.randint(2, 9))
    if c.variant == "mixtos":
        x += c.randint(1, 3)
    res = x / y
    inv = 1 / y
    c.step("Multiplicar por el inverso", f"${ftex(x)} \\div {ftex(y)} = {ftex(x)} \\times {ftex(inv)}$", procedure="División de fracciones (multiplicar por el recíproco)",
           why="Dividir entre un número es multiplicar por su inverso multiplicativo.", prompt="¿Cuál es el inverso del divisor?", answer=A_frac(inv, "any"))
    c.step("Multiplicar", f"$= {ftex(res)}$", prompt="¿Resultado simplificado?", answer=A_frac(res))
    c.mistake("sin_invertir", "No invertiste el divisor", "Se multiplica por el INVERSO (se da vuelta la segunda fracción).", x * y, 0)
    c.mistake("invierte_primera", "Invertiste la primera fracción", "Sólo se invierte el divisor (la segunda).", (1 / x) * y, 0)
    return c.build(name="División de fracciones", procedure="Multiplicación por el inverso", prompt=f"Calcula y simplifica: ${ftex(x)} \\div {ftex(y)}$",
                   answer=A_frac(res), final=f"{res.numerator}/{res.denominator}" if res.denominator > 1 else str(res))


@generator("b15.combinadas_fracciones", "Operaciones combinadas con fracciones", {1: ["dos_ops"], 2: ["parentesis"], 3: ["tres_ops"]})
def combinadas_fracciones(c: Ctx):
    x, y, z = _proper(c, 8), _proper(c, 8), _proper(c, 8)
    if c.variant == "dos_ops":
        r1 = y * z
        res = x + r1
        c.step("Primero la multiplicación", f"${ftex(y)} \\times {ftex(z)} = {ftex(r1)}$", procedure="Jerarquía con fracciones", prompt="¿Producto?", answer=A_frac(r1))
        c.step("Luego la suma", f"${ftex(x)} + {ftex(r1)} = {ftex(res)}$", prompt="¿Resultado?", answer=A_frac(res))
        c.mistake("izq_der", "Sumaste antes de multiplicar", "La multiplicación va antes que la suma.", (x + y) * z, 0)
        expr = f"{ftex(x)} + {ftex(y)} \\times {ftex(z)}"
    elif c.variant == "parentesis":
        r1 = x + y
        res = r1 * z
        c.step("Primero el paréntesis", f"${ftex(x)} + {ftex(y)} = {ftex(r1)}$", procedure="Jerarquía con fracciones", prompt="¿Paréntesis?", answer=A_frac(r1))
        c.step("Luego multiplicar", f"${ftex(r1)} \\times {ftex(z)} = {ftex(res)}$", prompt="¿Resultado?", answer=A_frac(res))
        expr = f"\\left({ftex(x)} + {ftex(y)}\\right) \\times {ftex(z)}"
    else:
        w = _proper(c, 8)
        r1, r2 = x * y, z / w
        res = r1 + r2
        c.step("Multiplicación", f"${ftex(x)} \\times {ftex(y)} = {ftex(r1)}$", procedure="Jerarquía con fracciones", prompt="¿Producto?", answer=A_frac(r1))
        c.step("División", f"${ftex(z)} \\div {ftex(w)} = {ftex(r2)}$", prompt="¿Cociente?", answer=A_frac(r2))
        c.step("Suma", f"${ftex(r1)} + {ftex(r2)} = {ftex(res)}$", prompt="¿Resultado?", answer=A_frac(res))
        expr = f"{ftex(x)} \\times {ftex(y)} + {ftex(z)} \\div {ftex(w)}"
    return c.build(name="Operaciones combinadas con fracciones", procedure="Jerarquía de operaciones con fracciones", prompt=f"Calcula y simplifica: ${expr}$",
                   answer=A_frac(res), final=f"{res.numerator}/{res.denominator}" if res.denominator > 1 else str(res))


@generator("b15.problemas_fracciones", "Problemas con fracciones", {1: ["parte"], 2: ["resto"], 3: ["dos_pasos"]})
def problemas_fracciones(c: Ctx):
    n = c.choice(NAMES)
    if c.variant == "parte":
        q = _proper(c, 8)
        total = q.denominator * c.randint(2, 15)
        ans = int(total * q)
        c.step("Fracción de una cantidad", f"${ftex(q)}$ de {total} = ${total} \\div {q.denominator} \\times {q.numerator} = {ans}$", procedure="Fracción de una cantidad",
               prompt="¿Resultado?", answer=A_int(ans))
        return c.build(name="Problema: fracción de una cantidad", procedure="Fracción de una cantidad",
                       prompt=f"{n} tiene {total} pesos y gasta ${ftex(q)}$ de su dinero. ¿Cuántos pesos gasta?", answer=A_int(ans, "pesos"), final=f"{ans} pesos")
    if c.variant == "resto":
        q = _proper(c, 8)
        total = q.denominator * c.randint(2, 15)
        ans = int(total * (1 - q))
        c.step("Fracción que queda", f"$1 - {ftex(q)} = {ftex(1 - q)}$", procedure="Fracción complementaria", prompt="¿Qué fracción queda?", answer=A_frac(1 - q))
        c.step("Aplicar a la cantidad", f"${ftex(1 - q)}$ de {total} = {ans}")
        c.mistake("parte_gastada", "Calculaste lo gastado, no lo que queda", "Se pregunta lo que QUEDA.", int(total * q), 0)
        return c.build(name="Problema: lo que queda", procedure="Fracción complementaria", prompt=f"Un depósito de {total} litros está lleno y se gastan ${ftex(q)}$. ¿Cuántos litros quedan?",
                       answer=A_int(ans, "litros"), final=f"{ans} litros")
    q1, q2 = F(1, c.choice([2, 3, 4])), F(1, c.choice([2, 3, 4, 5]))
    rest1 = 1 - q1
    second = rest1 * q2
    left = rest1 - second
    total = left.denominator * c.randint(2, 10)
    total = int(total) if (total * left).denominator == 1 and (total * q1).denominator == 1 and (total * second).denominator == 1 else c.retry()
    c.step("Primera parte", f"Se gasta ${ftex(q1)}$: queda ${ftex(rest1)}$.", procedure="Problema de fracciones de varios pasos", prompt="¿Fracción que queda?", answer=A_frac(rest1))
    c.step("Segunda parte (del resto)", f"${ftex(q2)}$ de ${ftex(rest1)}$ = ${ftex(second)}$. Queda ${ftex(rest1)} - {ftex(second)} = {ftex(left)}$.",
           why="«Del resto» significa que la fracción se aplica a lo que quedó, no al total.", prompt="¿Fracción final que queda?", answer=A_frac(left))
    c.step("Aplicar al total", f"${ftex(left)} \\times {total} = {int(left * total)}$")
    c.mistake("del_total", "Aplicaste la segunda fracción al total", "«Del resto» se refiere a lo que quedó.", int(total * (1 - q1 - q2)) if (total * (1 - q1 - q2)).denominator == 1 else -1, 1)
    return c.build(name="Problema de fracciones de varios pasos", procedure="Fracción de una fracción",
                   prompt=f"{n} tiene {total} pesos. Gasta ${ftex(q1)}$ en un libro y ${ftex(q2)}$ **del resto** en comida. ¿Cuánto dinero le queda?",
                   answer=A_int(int(left * total), "pesos"), final=f"{int(left * total)} pesos")


# ============================================ FUNDAMENTOS DECIMALES (B16) ==

_DEC_PLACES = {1: "décimas", 2: "centésimas", 3: "milésimas"}


def _rand_dec(c: Ctx, places: int, whole_max: int = 99) -> Fraction:
    while True:
        v = F(c.randint(0, whole_max * 10**places + 10**places - 1), 10**places)
        if v.denominator == 10**places and v > 0:
            return v


@generator("b16.valor_posicional_decimal", "Valor posicional decimal", {1: ["decimas"], 2: ["centesimas"], 3: ["milesimas"]})
def valor_posicional_decimal(c: Ctx):
    places = {"decimas": 1, "centesimas": 2, "milesimas": 3}[c.variant]
    v = _rand_dec(c, 3 if c.level == 3 else max(places, 2))
    s = decimal_str(v)
    frac = s.split(",")[1].ljust(3, "0")
    pos = c.randint(1, len(s.split(",")[1]))
    digit = int(frac[pos - 1])
    if digit == 0:
        c.retry()
    value = F(digit, 10**pos)
    c.step("Localizar la cifra", f"Después de la coma: 1ª posición = décimas, 2ª = centésimas, 3ª = milésimas. La cifra {digit} está en las **{_DEC_PLACES[pos]}**.",
           procedure="Valor posicional decimal")
    c.step("Calcular su valor", f"${digit} \\times {tex(F(1, 10**pos))} = {tex(value)}$", why="Cada posición a la derecha vale 10 veces menos.")
    c.mistake("entero", "Diste la cifra como si fuera entera", "Las cifras tras la coma valen décimas, centésimas…", F(digit), 1)
    return c.build(name="Valor posicional decimal", procedure="Valor posicional decimal",
                   prompt=f"En el número **{s}**, ¿cuánto vale la cifra que ocupa el lugar de las **{_DEC_PLACES[pos]}**? (escríbelo como decimal)",
                   answer=AnswerSpec(kind="number", value=value, form="decimal"), final=decimal_str(value))


@generator("b16.partes_decimal", "Parte entera y parte decimal", {1: ["base"], 2: ["base"], 3: ["base"]})
def partes_decimal(c: Ctx):
    v = _rand_dec(c, c.randint(1, 3), 999)
    s = decimal_str(v)
    w, f = s.split(",")
    which = c.choice(["entera", "decimal"])
    c.step("Separar por la coma", f"A la izquierda de la coma: parte entera ({w}). A la derecha: parte decimal ({f}).", procedure="Identificación de partes")
    return c.build(name="Partes de un número decimal", procedure="Lectura de decimales", prompt=f"En **{s}**, ¿cuál es la **parte {which}**? (escribe sólo las cifras)",
                   answer=AnswerSpec(kind="token", value=w if which == "entera" else f), final=w if which == "entera" else f)


@generator("b16.unidades_decimales", "Décimas, centésimas y milésimas", {1: ["equivalencias"], 2: ["contar"], 3: ["contar"]})
def unidades_decimales(c: Ctx):
    if c.variant == "equivalencias":
        k = c.choice([("unidad", "décimas", 10), ("décima", "centésimas", 10), ("centésima", "milésimas", 10), ("unidad", "centésimas", 100),
                      ("unidad", "milésimas", 1000), ("décima", "milésimas", 100)])
        a, b, n = k
        c.step("Cada orden vale 10 del siguiente", f"1 {a} = {n} {b}", procedure="Equivalencias decimales")
        return c.build(name="Equivalencias entre órdenes decimales", procedure="Equivalencias decimales", prompt=f"¿Cuántas {b} hay en 1 {a}?",
                       answer=A_int(n), final=str(n))
    places = c.choice([1, 2, 3])
    v = _rand_dec(c, places, 9)
    n = int(v * 10**places)
    c.step("Escribir sin coma", f"{decimal_str(v)} = {n} {_DEC_PLACES[places]}", procedure="Conversión a la unidad decimal más pequeña")
    return c.build(name="Contar unidades decimales", procedure="Valor posicional decimal", prompt=f"¿Cuántas **{_DEC_PLACES[places]}** hay en {decimal_str(v)}?",
                   answer=A_int(n), final=str(n))


@generator("b16.lectura_decimales", "Lectura y escritura de decimales", {1: ["leer"], 2: ["leer", "escribir"], 3: ["escribir"]})
def lectura_decimales(c: Ctx):
    places = c.randint(1, 3)
    v = _rand_dec(c, places, c.by_level(9, 99, 999))
    s = decimal_str(v)
    w, f = s.split(",")
    words = decimal_to_words(int(w), f)
    c.step("Leer la parte entera", f"Se lee la parte entera ({w}) seguida de «entero(s)».", procedure="Lectura de decimales")
    c.step("Leer la parte decimal", f"Se lee {f} como número y se añade el nombre de la última posición ({_DEC_PLACES[len(f)]}): «{words}».",
           why="La última cifra decimal indica en qué unidades se cuenta la parte decimal.")
    alt = f"{w} coma {f}"
    if c.variant == "escribir":
        return c.build(name="Escritura de decimales", procedure="Escritura de decimales", prompt=f"Escribe con cifras: **{words}**",
                       answer=AnswerSpec(kind="number", value=v, form="decimal"), final=s)
    return c.build(name="Lectura de decimales", procedure="Lectura de decimales", prompt=f"Escribe con palabras: **{s}** (usa «enteros» y el nombre de la última posición)",
                   answer=AnswerSpec(kind="words", value=words, accepted=(words.replace("un entero", "uno entero"),)), final=words)


@generator("b16.comparar_decimales", "Comparación y orden de decimales", {1: ["comparar"], 2: ["comparar", "ordenar"], 3: ["ordenar"]})
def comparar_decimales(c: Ctx):
    if c.variant == "comparar":
        w = c.randint(0, 20)
        a = w + _rand_dec(c, c.randint(1, 3), 0) % 1
        b = w + _rand_dec(c, c.randint(1, 3), 0) % 1
        if a == b:
            c.retry()
        sym = "<" if a < b else ">"
        c.step("Igualar cifras decimales", f"{fixed_str(a, 3)} y {fixed_str(b, 3)}", procedure="Comparación de decimales",
               why="Añadir ceros a la derecha de la parte decimal no cambia el valor.")
        c.step("Comparar cifra a cifra", f"{decimal_str(a)} {sym} {decimal_str(b)}")
        ans = A_choice_fixed(["<", "=", ">"], sym)
        la, lb = len(decimal_str(a).split(",")[1]), len(decimal_str(b).split(",")[1])
        if (la > lb) != (a > b) and la != lb:
            from ._common import cid

            c.mistake("mas_cifras", "Creíste que más cifras decimales significa mayor", "0,5 > 0,45: hay que comparar cifra a cifra desde las décimas.",
                      cid(ans, ">" if la > lb else "<"), 1)
        return c.build(name="Comparación de decimales", procedure="Comparación cifra a cifra", prompt=f"Elige el símbolo: ${tex(a)} \\;\\square\\; {tex(b)}$",
                       answer=ans, final=sym)
    vals: list[Fraction] = []
    while len(vals) < 4:
        v = c.randint(0, 3) + _rand_dec(c, c.randint(1, 3), 0) % 1
        if v not in vals:
            vals.append(v)
    c.step("Igualar cifras", ", ".join(fixed_str(v, 3) for v in vals), procedure="Ordenación de decimales")
    c.step("Ordenar", " < ".join(decimal_str(v) for v in sorted(vals)))
    return c.build(name="Ordenar decimales", procedure="Ordenación de decimales", prompt="Ordena de menor a mayor (separa con ;): " + "  ·  ".join(decimal_str(v) for v in vals),
                   answer=AnswerSpec(kind="list", value=sorted(vals), placeholder="0,5; 0,75; 1,2"), final="; ".join(decimal_str(v) for v in sorted(vals)))


@generator("b16.fraccion_decimal", "Conversión entre fracciones y decimales", {1: ["a_decimal"], 2: ["a_fraccion", "a_decimal"], 3: ["periodico"]})
def fraccion_decimal(c: Ctx):
    if c.variant == "a_decimal":
        d = c.choice([2, 4, 5, 8, 10, 20, 25, 50])
        n = c.randint(1, d * 2)
        q = F(n, d)
        c.step("Dividir", f"${n} \\div {d} = {tex(q)}$", procedure="Conversión de fracción a decimal", why="La fracción es una división.")
        return c.build(name="Fracción a decimal", procedure="División del numerador entre el denominador", prompt=f"Convierte ${tex_frac(n, d)}$ a decimal.",
                       answer=AnswerSpec(kind="number", value=q, form="decimal"), final=decimal_str(q))
    if c.variant == "a_fraccion":
        places = c.randint(1, 3)
        v = _rand_dec(c, places, 5)
        n = int(v * 10**places)
        c.step("Fracción decimal", f"${tex(v)} = \\frac{{{n}}}{{{10**places}}}$", procedure="Conversión de decimal a fracción")
        c.step("Simplificar", f"$= {ftex(v)}$", prompt="¿Fracción simplificada?", answer=A_frac(v))
        return c.build(name="Decimal a fracción", procedure="Fracción decimal y simplificación", prompt=f"Convierte ${tex(v)}$ en fracción irreducible.",
                       answer=A_frac(v), final=f"{v.numerator}/{v.denominator}")
    d = c.choice([3, 6, 9, 11, 7])
    n = c.randint(1, d - 1)
    q = F(n, d)
    places = 2
    c.step("Dividir", f"${n} \\div {d} = {float(q):.6f}…$".replace(".", "{,}"), procedure="Decimal periódico",
           why="Si el denominador (simplificado) tiene factores distintos de 2 y 5, el decimal es periódico.")
    c.step("Redondear a centésimas", f"≈ {fixed_str(q, places)}")
    return c.build(name="Fracción con decimal periódico", procedure="División y redondeo", prompt=f"Convierte ${tex_frac(n, d)}$ a decimal redondeado a las **centésimas**.",
                   answer=AnswerSpec(kind="number", value=round_half_up(q, places)), final=fixed_str(q, places))


@generator("b16.concepto_decimal", "Qué son los números decimales", {1: ["dinero"], 2: ["fraccion_decimal"], 3: ["fraccion_decimal"]})
def concepto_decimal(c: Ctx):
    if c.variant == "dinero":
        p, ce = c.randint(1, 50), c.randint(1, 99)
        v = p + F(ce, 100)
        c.step("Centavos son centésimas", f"{ce} centavos = {ce}/100 de peso = {decimal_str(F(ce, 100))}", procedure="Decimales en contextos de dinero")
        return c.build(name="Decimales y dinero", procedure="Decimales en contextos cotidianos", prompt=f"Escribe como decimal: **{p} pesos y {ce} centavos** (en pesos).",
                       answer=AnswerSpec(kind="number", value=v, form="decimal"), final=decimal_str(v))
    pl = c.randint(1, 3)
    n = c.randint(1, 10**pl - 1)
    q = F(n, 10**pl)
    c.step("Fracción decimal", f"Una fracción con denominador 10, 100, 1000… se escribe con coma: ${tex_frac(n, 10**pl)} = {decimal_str(q).replace(',', '{,}')}$",
           procedure="Fracción decimal")
    return c.build(name="Fracción decimal", procedure="Escritura de fracciones decimales", prompt=f"Escribe ${tex_frac(n, 10**pl)}$ como número decimal.",
                   answer=AnswerSpec(kind="number", value=q, form="decimal"), final=decimal_str(q))


# ============================================ OPERACIONES DECIMALES (B17) ==


@generator("b17.suma_resta_decimales", "Suma y resta de decimales", {1: ["suma"], 2: ["resta", "suma"], 3: ["resta_rellenar"]})
def suma_resta_decimales(c: Ctx):
    a = _rand_dec(c, c.randint(1, 2), c.by_level(20, 99, 999))
    b = _rand_dec(c, c.randint(1, 3), c.by_level(20, 99, 99))
    op = "+" if c.variant == "suma" else "-"
    if op == "-" and a < b:
        a, b = b, a
    if c.variant == "resta_rellenar":
        a = F(c.randint(2, 50))
        b = _rand_dec(c, c.randint(2, 3), 1)
    res = a + b if op == "+" else a - b
    c.step("Alinear las comas", "Coma debajo de coma: así quedan décimas con décimas, centésimas con centésimas.", procedure=f"{'Suma' if op == '+' else 'Resta'} de decimales",
           why="Sólo se pueden operar cifras del mismo orden.")
    c.step("Rellenar con ceros", f"{fixed_str(a, 3)} {op} {fixed_str(b, 3)}", why="Añadir ceros al final de la parte decimal no cambia el valor.")
    c.step("Operar como con naturales", f"$= {tex(res)}$", prompt="¿Resultado?", answer=AnswerSpec(kind="number", value=res))
    sa, sb = decimal_str(a), decimal_str(b)
    if "," in sa and "," in sb and len(sa.split(",")[1]) != len(sb.split(",")[1]):
        # error: alinear por la derecha (como enteros)
        ia, ib = int(sa.replace(",", "")), int(sb.replace(",", ""))
        pl = max(len(sa.split(",")[1]), len(sb.split(",")[1]))
        wrong = F(ia + ib if op == "+" else abs(ia - ib), 10**pl)
        c.mistake("alinear_derecha", "Alineaste por la derecha en vez de por la coma", "La coma debe ir debajo de la coma.", wrong, 0)
    return c.build(name=f"{'Suma' if op == '+' else 'Resta'} de decimales", procedure="Alineación de la coma", prompt=f"Calcula: ${tex(a)} {op} {tex(b)}$",
                   answer=AnswerSpec(kind="number", value=res), final=decimal_str(res), workspace={"type": "column", "op": op, "operands": [sa, sb], "result": decimal_str(res)})


@generator("b17.multiplicacion_decimales", "Multiplicación de decimales", {1: ["por_entero"], 2: ["decimal_por_decimal"], 3: ["por_potencia_10", "decimal_por_decimal"]})
def multiplicacion_decimales(c: Ctx):
    if c.variant == "por_potencia_10":
        a = _rand_dec(c, c.randint(1, 3), 99)
        p = c.choice([10, 100, 1000])
        res = a * p
        c.step("Correr la coma", f"Multiplicar por {p} corre la coma {len(str(p)) - 1} lugar(es) a la derecha: {decimal_str(res)}", procedure="Multiplicación por potencias de 10")
        return c.build(name="Decimal por potencia de 10", procedure="Desplazamiento de la coma", prompt=f"Calcula: ${tex(a)} \\times {p}$",
                       answer=AnswerSpec(kind="number", value=res), final=decimal_str(res))
    a = _rand_dec(c, c.randint(1, 2), c.by_level(20, 20, 99))
    b = F(c.randint(2, 9)) if c.variant == "por_entero" else _rand_dec(c, c.randint(1, 2), 9)
    res = a * b
    pa = len(decimal_str(a).split(",")[1]) if "," in decimal_str(a) else 0
    pb = len(decimal_str(b).split(",")[1]) if "," in decimal_str(b) else 0
    ia, ib = int(a * 10**pa), int(b * 10**pb)
    c.step("Multiplicar sin comas", f"${ia} \\times {ib} = {ia * ib}$", procedure="Multiplicación de decimales", prompt="¿Producto sin comas?", answer=A_int(ia * ib))
    c.step("Contar cifras decimales", f"{pa} + {pb} = {pa + pb} cifras decimales", why="(1/10^a)·(1/10^b) = 1/10^(a+b).", prompt="¿Cuántas cifras decimales lleva el resultado?",
           answer=A_int(pa + pb))
    c.step("Colocar la coma", f"Resultado: {decimal_str(res)}")
    if pa + pb >= 1:
        c.mistake("coma_mal", "Colocaste mal la coma", "El producto lleva tantas cifras decimales como ambos factores juntos.", F(ia * ib, 10 ** max(pa, pb)), 1)
    return c.build(name="Multiplicación de decimales", procedure="Multiplicar como naturales y colocar la coma", prompt=f"Calcula: ${tex(a)} \\times {tex(b)}$",
                   answer=AnswerSpec(kind="number", value=res), final=decimal_str(res))


@generator("b17.division_decimales", "División de decimales", {1: ["decimal_entre_entero"], 2: ["entre_decimal"], 3: ["entre_decimal", "por_potencia_10"]})
def division_decimales(c: Ctx):
    if c.variant == "por_potencia_10":
        a = _rand_dec(c, c.randint(0, 2), 999) if c.rng.random() < 0.5 else F(c.randint(1, 9999))
        p = c.choice([10, 100, 1000])
        res = a / p
        c.step("Correr la coma a la izquierda", f"Dividir por {p} corre la coma {len(str(p)) - 1} lugar(es) a la izquierda: {decimal_str(res)}", procedure="División por potencias de 10")
        return c.build(name="División por potencia de 10", procedure="Desplazamiento de la coma", prompt=f"Calcula: ${tex(a)} \\div {p}$",
                       answer=AnswerSpec(kind="number", value=res), final=decimal_str(res))
    if c.variant == "decimal_entre_entero":
        d = c.randint(2, 9)
        q = _rand_dec(c, c.randint(1, 2), 30)
        D = q * d
        c.step("Dividir como naturales", "Al pasar la coma del dividendo se pone la coma en el cociente.", procedure="División de decimal entre entero")
        c.step("Resultado", f"${tex(D)} \\div {d} = {tex(q)}$", prompt="¿Cociente?", answer=AnswerSpec(kind="number", value=q))
        return c.build(name="Decimal entre entero", procedure="División de decimales", prompt=f"Calcula: ${tex(D)} \\div {d}$", answer=AnswerSpec(kind="number", value=q),
                       final=decimal_str(q))
    d = _rand_dec(c, c.randint(1, 2), 9)
    q = _rand_dec(c, c.randint(0, 1), 50) if c.rng.random() < 0.5 else F(c.randint(2, 50))
    D = d * q
    pl = len(decimal_str(d).split(",")[1])
    c.step("Hacer entero el divisor", f"Multiplicamos dividendo y divisor por {10**pl}: ${tex(D * 10**pl)} \\div {tex(d * 10**pl)}$", procedure="División entre un decimal",
           why="Multiplicar dividendo y divisor por el mismo número no cambia el cociente.", prompt="¿Nuevo divisor (entero)?", answer=A_int(int(d * 10**pl)))
    c.step("Dividir", f"$= {tex(q)}$", prompt="¿Cociente?", answer=AnswerSpec(kind="number", value=q))
    c.mistake("solo_divisor", "Corriste la coma sólo en el divisor", "Hay que multiplicar AMBOS por la misma potencia de 10.", D / (d * 10**pl), 0)
    return c.build(name="División entre un decimal", procedure="Transformar el divisor en entero", prompt=f"Calcula: ${tex(D)} \\div {tex(d)}$",
                   answer=AnswerSpec(kind="number", value=q), final=decimal_str(q))


@generator("b17.redondeo", "Redondeo de decimales", {1: ["entero"], 2: ["decimas", "centesimas"], 3: ["centesimas", "nueves"]})
def redondeo(c: Ctx):
    places = {"entero": 0, "decimas": 1, "centesimas": 2, "nueves": c.choice([1, 2])}[c.variant]
    v = _rand_dec(c, places + c.randint(1, 2), 99)
    if c.variant == "nueves":
        v = F(int(f"{c.randint(1, 30)}{'9' * (places)}{c.randint(5, 9)}"), 10 ** (places + 1))
    r = round_half_up(v, places)
    names = {0: "las unidades", 1: "las décimas", 2: "las centésimas"}
    s = decimal_str(v)
    nxt = (s.split(",")[1] + "000")[places]
    c.step("Mirar la cifra siguiente", f"La cifra a la derecha de {names[places]} es **{nxt}**.", procedure="Redondeo", prompt="¿Qué cifra miras?", answer=A_int(int(nxt)))
    c.step("Decidir", f"{nxt} {'≥ 5 → se suma 1' if int(nxt) >= 5 else '< 5 → se deja igual'}. Resultado: **{fixed_str(v, places)}**",
           why="Así el resultado es el valor más cercano con esa precisión.")
    c.mistake("truncar", "Truncaste en vez de redondear", "Si la cifra siguiente es 5 o más, la última cifra conservada aumenta en 1.",
              F(int(v * 10**places), 10**places), 1)
    return c.build(name="Redondeo", procedure="Redondeo de decimales", prompt=f"Redondea **{s}** a {names[places]}.",
                   answer=AnswerSpec(kind="number", value=r), final=fixed_str(v, places))


@generator("b17.aproximacion_decimales", "Aproximación", {1: ["estimar_suma"], 2: ["estimar_producto"], 3: ["estimar_producto"]})
def aproximacion_decimales(c: Ctx):
    a, b = _rand_dec(c, 2, 50), _rand_dec(c, 2, 50 if c.variant == "estimar_suma" else 20)
    ra, rb = round_half_up(a, 0), round_half_up(b, 0)
    est = ra + rb if c.variant == "estimar_suma" else ra * rb
    op = "+" if c.variant == "estimar_suma" else "\\times"
    c.step("Redondear cada número a las unidades", f"{decimal_str(a)} ≈ {ra}; {decimal_str(b)} ≈ {rb}", procedure="Estimación por redondeo")
    c.step("Operar con los redondeados", f"${ra} {op} {rb} = {est}$", prompt="¿Estimación?", answer=A_int(int(est)))
    return c.build(name="Aproximación de operaciones", procedure="Estimación por redondeo a las unidades",
                   prompt=f"Estima ${tex(a)} {op} {tex(b)}$ redondeando cada número a las unidades.", answer=A_int(int(est)), final=str(est))


@generator("b17.combinadas_decimales", "Operaciones combinadas con decimales", {1: ["dos_ops"], 2: ["parentesis"], 3: ["parentesis"]})
def combinadas_decimales(c: Ctx):
    a, b, k = _rand_dec(c, 1, 20), _rand_dec(c, 1, 10), F(c.randint(2, 9))
    if c.variant == "dos_ops":
        r1 = b * k
        res = a + r1
        c.step("Multiplicación primero", f"${tex(b)} \\times {k} = {tex(r1)}$", procedure="Jerarquía con decimales", prompt="¿Producto?", answer=AnswerSpec(kind="number", value=r1))
        c.step("Suma", f"${tex(a)} + {tex(r1)} = {tex(res)}$")
        c.mistake("izq_der", "Sumaste antes de multiplicar", "La multiplicación va primero.", (a + b) * k, 0)
        expr = f"{tex(a)} + {tex(b)} \\times {k}"
    else:
        r1 = a + b
        res = r1 * k
        c.step("Paréntesis", f"${tex(a)} + {tex(b)} = {tex(r1)}$", procedure="Jerarquía con decimales", prompt="¿Paréntesis?", answer=AnswerSpec(kind="number", value=r1))
        c.step("Multiplicación", f"${tex(r1)} \\times {k} = {tex(res)}$")
        expr = f"({tex(a)} + {tex(b)}) \\times {k}"
    return c.build(name="Operaciones combinadas con decimales", procedure="Jerarquía de operaciones", prompt=f"Calcula: ${expr}$", answer=AnswerSpec(kind="number", value=res),
                   final=decimal_str(res))


@generator("b17.problemas_decimales", "Problemas con decimales", {1: ["compra"], 2: ["cambio"], 3: ["precio_unitario"]})
def problemas_decimales(c: Ctx):
    n = c.choice(NAMES)
    p = _rand_dec(c, 2, 30)
    q = c.randint(2, 8)
    if c.variant == "compra":
        tot = p * q
        c.step("Multiplicar precio por cantidad", f"${tex(p)} \\times {q} = {tex(tot)}$", procedure="Problema de decimales", prompt="¿Total?", answer=AnswerSpec(kind="number", value=tot))
        return c.build(name="Problema de compra", procedure="Multiplicación de decimales", prompt=f"Un cuaderno cuesta {decimal_str(p)} pesos. ¿Cuánto cuestan {q} cuadernos?",
                       answer=AnswerSpec(kind="number", value=tot, unit="pesos"), final=f"{fixed_str(tot, 2)} pesos")
    if c.variant == "cambio":
        tot = p * q
        pay = (int(tot) // 50 + 1) * 50
        ch = pay - tot
        c.step("Total", f"${tex(p)} \\times {q} = {tex(tot)}$", procedure="Problema de varios pasos", prompt="¿Total?", answer=AnswerSpec(kind="number", value=tot))
        c.step("Cambio", f"${pay} - {tex(tot)} = {tex(ch)}$", prompt="¿Cambio?", answer=AnswerSpec(kind="number", value=ch))
        return c.build(name="Problema del cambio", procedure="Multiplicación y resta de decimales",
                       prompt=f"{n} compra {q} jugos a {decimal_str(p)} pesos cada uno y paga con un billete de {pay}. ¿Cuánto le devuelven?",
                       answer=AnswerSpec(kind="number", value=ch, unit="pesos"), final=f"{fixed_str(ch, 2)} pesos")
    kg = _rand_dec(c, 1, 5)
    unit = _rand_dec(c, 1, 20)
    tot = kg * unit
    c.step("Precio por kilo = total ÷ kilos", f"${tex(tot)} \\div {tex(kg)} = {tex(unit)}$", procedure="División de decimales", prompt="¿Precio por kilo?",
           answer=AnswerSpec(kind="number", value=unit))
    return c.build(name="Precio unitario", procedure="División de decimales", prompt=f"Por {decimal_str(kg)} kg de manzanas se pagaron {decimal_str(tot)} pesos. ¿Cuál es el precio por kilo?",
                   answer=AnswerSpec(kind="number", value=unit, unit="pesos/kg"), final=f"{decimal_str(unit)} pesos/kg")
