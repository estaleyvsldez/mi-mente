"""Bloques 18 (potencias), 19 (raíces), 20 (razones y proporciones),
21 (regla de tres), 22 (porcentajes) y 23 (matemáticas financieras)."""

from __future__ import annotations

from fractions import Fraction
from math import gcd, isqrt

from ..core.registry import Ctx, generator, mc
from ..core.types import AnswerSpec
from ..numbers.fmt import decimal_str, num, round_half_up, signed_tex, tex, tex_frac
from ._common import A_choice_fixed, A_fields, A_int, A_num

F = Fraction


def ftxt(q: Fraction) -> str:
    return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"


# ====================================================== POTENCIACIÓN (B18) ==


@generator("b18.calcular_potencia", "Potencias de números naturales", {1: ["pequena"], 2: ["mediana"], 3: ["grande"]})
def calcular_potencia(c: Ctx):
    b = c.by_level(c.randint(2, 6), c.randint(2, 10), c.randint(2, 12))
    e = c.by_level(c.randint(2, 3), c.randint(2, 4), c.randint(3, 5))
    if b**e > 100000:
        c.retry()
    rep = " \\times ".join([str(b)] * e)
    c.step("Interpretar", f"${b}^{{{e}}}$ = multiplicar {b} por sí mismo {e} veces: ${rep}$", procedure="Potenciación",
           why="La potencia es una multiplicación repetida de factores iguales.")
    acc = b
    for i in range(2, e + 1):
        acc *= b
        c.step(f"Multiplicar ({i} factores)", f"$= {acc}$", prompt=f"¿{b}^{i}?", answer=A_int(acc))
    c.mistake("base_por_exponente", "Multiplicaste la base por el exponente", f"${b}^{{{e}}}$ no es {b}×{e}: es {b} multiplicado {e} veces.", b * e, 0)
    c.mistake("exponente_base", "Invertiste base y exponente", f"${e}^{{{b}}}$ es otra potencia.", e**b, 0)
    return c.build(name="Cálculo de una potencia", procedure="Potenciación como multiplicación repetida", prompt=f"Calcula: ${b}^{{{e}}}$",
                   answer=A_int(b**e), final=str(b**e))


@generator("b18.base_exponente", "Base y exponente", {1: ["identificar"], 2: ["escribir"], 3: ["escribir"]})
def base_exponente(c: Ctx):
    b, e = c.randint(2, 12), c.randint(2, 7)
    if c.variant == "identificar":
        role = c.choice(["base", "exponente"])
        c.step("Recordar", "La base es el factor que se repite; el exponente indica cuántas veces.", procedure="Terminología de potencias")
        return c.build(name="Elementos de una potencia", procedure="Identificación de base y exponente", prompt=f"En ${b}^{{{e}}}$, ¿cuál es la **{role}**?",
                       answer=A_int(b if role == "base" else e), final=str(b if role == "base" else e))
    rep = " \\times ".join([str(b)] * e)
    c.step("Contar factores", f"Hay {e} factores iguales a {b}.", procedure="Escritura en forma de potencia")
    return c.build(name="Escritura como potencia", procedure="Notación exponencial", prompt=f"Escribe ${rep}$ como potencia: indica base y exponente.",
                   answer=A_fields(("base", "Base", A_int(b)), ("exp", "Exponente", A_int(e))), final=f"{b}^{e}")


@generator("b18.potencia_enteros", "Potencias de números enteros", {1: ["par"], 2: ["impar", "par"], 3: ["parentesis"]})
def potencia_enteros(c: Ctx):
    b = c.randint(2, 6)
    e = c.choice([2, 4]) if c.variant == "par" else c.choice([3, 5]) if c.variant == "impar" else c.randint(2, 4)
    if c.variant == "parentesis":
        with_par = c.rng.random() < 0.5
        val = (-b) ** e if with_par else -(b**e)
        expr = f"(-{b})^{{{e}}}" if with_par else f"-{b}^{{{e}}}"
        c.step("¿Qué afecta el exponente?", "Con paréntesis, el exponente afecta al signo. Sin paréntesis, sólo al número: $-b^n = -(b^n)$.",
               procedure="Potencias de enteros y uso de paréntesis")
        c.step("Calcular", f"${expr} = {val}$")
        c.mistake("confusion_parentesis", "Confundiste $-b^n$ con $(-b)^n$", "Sin paréntesis el signo menos no está elevado.", -val, 0)
        return c.build(name="Potencias de enteros", procedure="Regla de los signos en potencias", prompt=f"Calcula: ${expr}$", answer=A_int(val), final=str(val))
    val = (-b) ** e
    c.step("Regla del signo", f"Base negativa con exponente {'par → resultado positivo' if e % 2 == 0 else 'impar → resultado negativo'}.",
           procedure="Potencias de base negativa", prompt="¿Signo? (1 positivo, −1 negativo)", answer=A_int(1 if val > 0 else -1))
    c.step("Valor absoluto", f"${b}^{{{e}}} = {b**e}$", prompt=f"¿{b}^{e}?", answer=A_int(b**e))
    c.mistake("signo", "Signo incorrecto", "Un número par de factores negativos da positivo.", -val, 0)
    return c.build(name="Potencia de base negativa", procedure="Potencias de enteros", prompt=f"Calcula: $(-{b})^{{{e}}}$", answer=A_int(val), final=str(val))


@generator("b18.potencias_10", "Potencias de base 10", {1: ["positiva"], 2: ["positiva", "negativa"], 3: ["negativa"]})
def potencias_10(c: Ctx):
    e = c.randint(1, 8) if c.variant == "positiva" else -c.randint(1, 5)
    v = F(10) ** e
    if e > 0:
        c.step("Contar ceros", f"$10^{{{e}}}$ es un 1 seguido de {e} ceros.", procedure="Potencias de 10")
    else:
        c.step("Exponente negativo", f"$10^{{{e}}} = \\frac{{1}}{{10^{{{-e}}}}}$: la cifra 1 está en la posición {-e} tras la coma.", procedure="Potencias de 10 con exponente negativo")
    return c.build(name="Potencias de base 10", procedure="Potencias de 10", prompt=f"Escribe ${{10}}^{{{e}}}$ como número " + ("(entero)." if e > 0 else "decimal."),
                   answer=AnswerSpec(kind="number", value=v, form="any"), final=decimal_str(v))


@generator("b18.cuadrados_cubos", "Cuadrados y cubos", {1: ["cuadrado"], 2: ["cubo", "cuadrado"], 3: ["reconocer"]})
def cuadrados_cubos(c: Ctx):
    if c.variant == "reconocer":
        n = c.randint(2, 15)
        sq = c.rng.random() < 0.5
        v = n**2 if sq else n**3
        if not sq and v > 3000:
            c.retry()
        c.step("Buscar la base", f"${v} = {n}^{{{2 if sq else 3}}}$", procedure="Reconocimiento de cuadrados y cubos perfectos")
        return c.build(name="Cuadrados y cubos perfectos", procedure="Reconocimiento", prompt=f"¿{v} es un cuadrado perfecto o un cubo perfecto? Escribe de qué número: " +
                       ("¿qué número al cuadrado da " if sq else "¿qué número al cubo da ") + f"{v}?", answer=A_int(n), final=str(n))
    n = c.randint(2, c.by_level(15, 10, 10))
    e = 2 if c.variant == "cuadrado" else 3
    c.step("Multiplicar", f"${n}^{{{e}}} = {' \\times '.join([str(n)] * e)} = {n**e}$", procedure="Cuadrado" if e == 2 else "Cubo",
           why="El cuadrado es el área de un cuadrado de lado n; el cubo, el volumen de un cubo de arista n.")
    c.mistake("doble", "Multiplicaste por 2 (o 3)", "Elevar al cuadrado es multiplicar el número por sí mismo.", n * e, 0)
    return c.build(name="Cuadrados y cubos", procedure="Potencias de exponente 2 y 3", prompt=f"Calcula ${n}^{{{e}}}$ (el {'cuadrado' if e == 2 else 'cubo'} de {n}).",
                   answer=A_int(n**e), final=str(n**e))


@generator("b18.propiedades_potencias", "Propiedades de las potencias", {1: ["producto", "cociente"], 2: ["potencia", "producto", "cociente"], 3: ["combinada"]})
def propiedades_potencias(c: Ctx):
    a = c.randint(2, 9)
    m, n = c.randint(2, 9), c.randint(2, 9)
    if c.variant == "producto":
        expr, e, rule = f"{a}^{{{m}}} \\cdot {a}^{{{n}}}", m + n, "Producto de potencias de igual base: se SUMAN los exponentes."
        wrong = m * n
    elif c.variant == "cociente":
        m, n = max(m, n) + 1, min(m, n)
        expr, e, rule = f"{a}^{{{m}}} \\div {a}^{{{n}}}", m - n, "Cociente de potencias de igual base: se RESTAN los exponentes."
        wrong = m // n if m % n == 0 else m + n
    elif c.variant == "potencia":
        expr, e, rule = f"({a}^{{{m}}})^{{{n}}}", m * n, "Potencia de una potencia: se MULTIPLICAN los exponentes."
        wrong = m + n
    else:
        k = c.randint(2, 5)
        expr = f"\\frac{{{a}^{{{m}}} \\cdot {a}^{{{n}}}}}{{({a}^{{{k}}})^{{2}}}}"
        e = m + n - 2 * k
        rule = "Primero producto (sumar exponentes), luego potencia de potencia (multiplicar) y por último cociente (restar)."
        wrong = m + n - k - 2
        if e < 0:
            c.retry()
    c.step("Identificar la propiedad", rule, procedure="Propiedades de las potencias", prop=rule.split(":")[0])
    c.step("Calcular el exponente", f"Exponente resultante: {e}", prompt="¿Exponente del resultado?", answer=A_int(e))
    spec = A_fields(("base", "Base", A_int(a)), ("exp", "Exponente", A_int(e)))
    c.mistake("regla_equivocada", "Aplicaste la regla equivocada a los exponentes", rule, {"base": a, "exp": wrong}, 1)
    return c.build(name="Propiedades de las potencias", procedure="Operaciones con potencias de igual base", prompt=f"Expresa como una sola potencia: ${expr}$",
                   answer=spec, final=f"{a}^{e}", properties=(rule.split(":")[0],))


@generator("b18.exponente_cero_uno", "Exponente cero y exponente uno", {1: ["uno"], 2: ["cero", "uno"], 3: ["cero"]})
def exponente_cero_uno(c: Ctx):
    a = c.randint(2, 999) * c.choice([1, -1]) if c.level == 3 else c.randint(2, 999)
    e = 1 if c.variant == "uno" else 0
    val = a if e == 1 else 1
    if e == 0:
        c.step("Regla", "Todo número distinto de 0 elevado a 0 da 1.", procedure="Exponente cero",
               why="Por ejemplo, $\\frac{a^{3}}{a^{3}} = a^{3-3} = a^0$ y también vale 1.")
        c.mistake("cero", "Creíste que da 0", "a⁰ = 1, no 0.", 0, 0)
        c.mistake("base", "Dejaste la base", "a⁰ = 1.", a, 0)
    else:
        c.step("Regla", "Todo número elevado a 1 es él mismo.", procedure="Exponente uno")
        c.mistake("uno", "Respondiste 1", "a¹ = a.", 1, 0)
    return c.build(name=f"Exponente {e}", procedure=f"Exponente {'cero' if e == 0 else 'uno'}", prompt=f"Calcula: ${signed_tex(a)}^{{{e}}}$", answer=A_int(val), final=str(val))


@generator("b18.exponentes_negativos", "Exponentes negativos", {1: ["simple"], 2: ["simple"], 3: ["fraccion_base"]})
def exponentes_negativos(c: Ctx):
    if c.variant == "fraccion_base":
        p, q = c.randint(1, 5), c.randint(2, 6)
        if gcd(p, q) != 1:
            c.retry()
        n = c.randint(1, 3)
        val = (F(p, q)) ** (-n)
        c.step("Invertir la base", f"$\\left({tex_frac(p, q)}\\right)^{{-{n}}} = \\left({tex_frac(q, p)}\\right)^{{{n}}}$", procedure="Exponente negativo con base fraccionaria")
        c.step("Elevar", f"$= {tex(val, True)}$")
        return c.build(name="Exponente negativo", procedure="Inverso de la base", prompt=f"Calcula: $\\left({tex_frac(p, q)}\\right)^{{-{n}}}$",
                       answer=AnswerSpec(kind="number", value=val), final=ftxt(val))
    a, n = c.randint(2, 6), c.randint(1, 3)
    val = F(1, a**n)
    c.step("Definición", f"${a}^{{-{n}}} = \\frac{{1}}{{{a}^{{{n}}}}}$", procedure="Exponente negativo", why="aⁿ · a⁻ⁿ = a⁰ = 1, así que a⁻ⁿ es el inverso de aⁿ.")
    c.step("Calcular", f"$= {tex_frac(1, a**n)}$", prompt=f"¿{a}^{n}?", answer=A_int(a**n))
    c.mistake("negativo", "Pusiste el resultado negativo", "Un exponente negativo NO hace negativo al número: lo invierte.", F(-(a**n)), 0)
    return c.build(name="Exponente negativo", procedure="Definición de exponente negativo", prompt=f"Calcula como fracción: ${a}^{{-{n}}}$",
                   answer=AnswerSpec(kind="number", value=val), final=ftxt(val))


@generator("b18.aplicaciones_potencias", "Aplicaciones de las potencias", {1: ["area"], 2: ["duplicacion"], 3: ["duplicacion"]})
def aplicaciones_potencias(c: Ctx):
    if c.variant == "area":
        l = c.randint(3, 25)
        c.step("Área del cuadrado", f"$A = l^2 = {l}^2 = {l * l}$", procedure="Cuadrado como área")
        return c.build(name="Aplicación: área", procedure="Cuadrado de un número", prompt=f"Un terreno cuadrado mide {l} m de lado. ¿Cuál es su área en m²?",
                       answer=A_int(l * l, "m²"), final=f"{l * l} m²")
    h = c.randint(3, 10)
    s = c.choice([1, 2, 5])
    c.step("Crecimiento por duplicación", f"Cada hora se duplica: ${s} \\times 2^{{{h}}}$", procedure="Crecimiento exponencial")
    c.step("Calcular", f"$2^{{{h}}} = {2**h}$, total {s * 2**h}", prompt=f"¿2^{h}?", answer=A_int(2**h))
    c.mistake("lineal", "Sumaste en vez de duplicar", "Duplicar es multiplicar por 2 cada vez.", s + 2 * h, 0)
    return c.build(name="Aplicación: crecimiento", procedure="Potencias de 2", prompt=f"Un cultivo empieza con {s} bacteria(s) y se duplica cada hora. ¿Cuántas habrá después de {h} horas?",
                   answer=A_int(s * 2**h), final=str(s * 2**h))


@generator("b18.concepto_potencia", "Concepto de potencia", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_potencia(c: Ctx):
    b, e = c.randint(2, 5), c.randint(2, 4)
    opts = [f"{' × '.join([str(b)] * e)}", f"{b} × {e}", f"{' + '.join([str(b)] * e)}", f"{' × '.join([str(e)] * b)}"]
    ans = mc(c, opts[0], opts[1:])
    c.step("Definición", "$b^n$ es el producto de n factores iguales a b.", procedure="Definición de potencia")
    return c.build(name="Concepto de potencia", procedure="Definición de potencia", prompt=f"¿Qué significa ${b}^{{{e}}}$?", answer=ans, final=opts[0])


# ======================================================== RADICACIÓN (B19) ==


def _icbrt(n: int) -> int:
    r = round(n ** (1 / 3))
    for x in (r - 1, r, r + 1):
        if x**3 == n:
            return x
    return -1


@generator("b19.raiz_cuadrada", "Raíz cuadrada exacta", {1: ["pequena"], 2: ["mediana"], 3: ["grande"]})
def raiz_cuadrada(c: Ctx):
    r = c.by_level(c.randint(2, 10), c.randint(10, 20), c.randint(20, 40))
    n = r * r
    c.step("Buscar el número que al cuadrado da " + str(n), f"${r}^2 = {n}$", procedure="Raíz cuadrada exacta",
           why="La raíz cuadrada es la operación inversa de elevar al cuadrado.")
    c.step("Resultado", f"$\\sqrt{{{n}}} = {r}$")
    c.mistake("mitad", "Dividiste entre 2", "La raíz cuadrada no es la mitad: es el número que multiplicado por sí mismo da el radicando.", n // 2 if n % 2 == 0 else -1, 0)
    return c.build(name="Raíz cuadrada exacta", procedure="Raíz cuadrada", prompt=f"Calcula: $\\sqrt{{{n}}}$", answer=A_int(r), final=str(r))


@generator("b19.raiz_cubica", "Raíz cúbica", {1: ["pequena"], 2: ["mediana"], 3: ["negativa"]})
def raiz_cubica(c: Ctx):
    r = c.by_level(c.randint(1, 5), c.randint(4, 10), -c.randint(2, 8))
    n = r**3
    c.step("Buscar el número que al cubo da " + str(n), f"${signed_tex(r)}^3 = {n}$", procedure="Raíz cúbica",
           why="La raíz cúbica de un negativo es negativa: (−a)³ = −a³." if r < 0 else "")
    c.mistake("tercio", "Dividiste entre 3", "La raíz cúbica no es la tercera parte.", n // 3 if n % 3 == 0 else -9999, 0)
    return c.build(name="Raíz cúbica", procedure="Raíz cúbica exacta", prompt=f"Calcula: $\\sqrt[3]{{{n}}}$", answer=A_int(r), final=str(r))


@generator("b19.indice_radicando", "Índice y radicando", {1: ["base"], 2: ["base"], 3: ["base"]})
def indice_radicando(c: Ctx):
    k = c.randint(2, 5)
    r = c.randint(2, 4)
    n = r**k
    role = c.choice(["índice", "radicando", "raíz"])
    val = {"índice": k, "radicando": n, "raíz": r}[role]
    c.step("Recordar", "En $\\sqrt[k]{n} = r$: k es el índice, n el radicando y r la raíz.", procedure="Terminología de radicales")
    return c.build(name="Elementos de una raíz", procedure="Identificación de elementos", prompt=f"En $\\sqrt[{k}]{{{n}}} = {r}$, ¿cuál es el **{role}**?",
                   answer=A_int(val), final=str(val))


@generator("b19.raiz_aproximada", "Raíces aproximadas", {1: ["entre"], 2: ["decima"], 3: ["decima"]})
def raiz_aproximada(c: Ctx):
    n = c.randint(5, 400)
    if isqrt(n) ** 2 == n:
        c.retry()
    lo = isqrt(n)
    if c.variant == "entre":
        c.step("Cuadrados vecinos", f"${lo}^2 = {lo * lo} < {n} < {(lo + 1) ** 2} = {lo + 1}^2$", procedure="Acotación de raíces")
        c.step("Conclusión", f"$\\sqrt{{{n}}}$ está entre {lo} y {lo + 1}.")
        return c.build(name="Acotar una raíz", procedure="Acotación entre enteros", prompt=f"$\\sqrt{{{n}}}$ está entre dos enteros consecutivos. ¿Cuál es el **menor**?",
                       answer=A_int(lo), final=str(lo))
    # redondeo a décimas: comparamos con (x,x5)^2 de forma exacta
    best = None
    for t in range(lo * 10, (lo + 1) * 10 + 1):
        if (F(t, 10)) ** 2 <= n:
            best = t
    assert best is not None
    up = F(2 * best + 1, 20)  # punto medio
    rounded = F(best, 10) if up**2 > n else F(best + 1, 10)
    c.step("Acotar entre enteros", f"${lo}^2 < {n} < {lo + 1}^2$", procedure="Aproximación de raíces por tanteo")
    c.step("Probar décimas", f"${tex(F(best, 10))}^2 = {tex(F(best, 10) ** 2)} \\le {n} < {tex(F(best + 1, 10) ** 2)} = {tex(F(best + 1, 10))}^2$")
    c.step("Redondear", f"Comparando con el punto medio ${tex(up)}^2 = {tex(up * up)}$: ≈ **{decimal_str(rounded)}**")
    return c.build(name="Raíz aproximada", procedure="Aproximación por tanteo", prompt=f"Calcula $\\sqrt{{{n}}}$ redondeada a las **décimas**.",
                   answer=AnswerSpec(kind="number", value=rounded), final=decimal_str(rounded))


@generator("b19.exactas_aproximadas", "Raíces exactas y aproximadas", {1: ["clasificar"], 2: ["clasificar"], 3: ["clasificar"]})
def exactas_aproximadas(c: Ctx):
    exact = c.rng.random() < 0.5
    n = c.randint(2, 30) ** 2 if exact else c.choice([k for k in range(2, 900) if isqrt(k) ** 2 != k])
    c.step("¿Es cuadrado perfecto?", f"${isqrt(n)}^2 = {isqrt(n) ** 2}$" + (" ✓" if exact else f", ${isqrt(n) + 1}^2 = {(isqrt(n) + 1) ** 2}$"),
           procedure="Clasificación de raíces")
    return c.build(name="Exacta o aproximada", procedure="Reconocimiento de cuadrados perfectos", prompt=f"¿$\\sqrt{{{n}}}$ es una raíz exacta o aproximada?",
                   answer=A_choice_fixed(["Exacta", "Aproximada"], "Exacta" if exact else "Aproximada"), final="Exacta" if exact else "Aproximada")


@generator("b19.relacion_potencias_raices", "Relación entre potencias y raíces", {1: ["base"], 2: ["base"], 3: ["base"]})
def relacion_potencias_raices(c: Ctx):
    k = c.choice([2, 3, 4])
    r = c.randint(2, 6 if k > 2 else 15)
    n = r**k
    form = c.choice(["raiz", "potencia"])
    if form == "raiz":
        c.step("Operación inversa", f"Si ${r}^{{{k}}} = {n}$, entonces $\\sqrt[{k}]{{{n}}} = {r}$.", procedure="Relación potencia–raíz")
        return c.build(name="Relación potencia–raíz", procedure="Operaciones inversas", prompt=f"Sabiendo que ${r}^{{{k}}} = {n}$, ¿cuánto vale $\\sqrt[{k}]{{{n}}}$?",
                       answer=A_int(r), final=str(r))
    c.step("Operación inversa", f"$\\left(\\sqrt[{k}]{{{n}}}\\right)^{{{k}}} = {n}$", procedure="Relación potencia–raíz", why="Elevar y extraer raíz del mismo índice se anulan.")
    return c.build(name="Relación potencia–raíz", procedure="Operaciones inversas", prompt=f"Calcula sin hallar la raíz: $\\left(\\sqrt[{k}]{{{n}}}\\right)^{{{k}}}$",
                   answer=A_int(n), final=str(n))


@generator("b19.propiedades_radicales", "Propiedades de los radicales", {1: ["producto"], 2: ["cociente", "producto"], 3: ["cociente"]})
def propiedades_radicales(c: Ctx):
    a, b = c.randint(2, 9), c.randint(2, 9)
    if c.variant == "producto":
        A, B = a * a, b * b
        c.step("Raíz de un producto", f"$\\sqrt{{{A} \\cdot {B}}} = \\sqrt{{{A}}} \\cdot \\sqrt{{{B}}} = {a} \\cdot {b}$", procedure="Propiedad del producto de radicales")
        c.mistake("suma", "Sumaste las raíces", "La raíz de un producto es el producto de las raíces.", a + b, 0)
        return c.build(name="Raíz de un producto", procedure="√(a·b) = √a·√b", prompt=f"Calcula usando propiedades: $\\sqrt{{{A} \\times {B}}}$", answer=A_int(a * b),
                       final=str(a * b), properties=("√(a·b) = √a·√b",))
    A = (a * b) ** 2
    B = b * b
    c.step("Raíz de un cociente", f"$\\sqrt{{\\frac{{{A}}}{{{B}}}}} = \\frac{{\\sqrt{{{A}}}}}{{\\sqrt{{{B}}}}} = \\frac{{{a * b}}}{{{b}}} = {a}$", procedure="Propiedad del cociente de radicales")
    return c.build(name="Raíz de un cociente", procedure="√(a/b) = √a/√b", prompt=f"Calcula: $\\sqrt{{\\frac{{{A}}}{{{B}}}}}$", answer=A_int(a), final=str(a),
                   properties=("√(a/b) = √a/√b",))


@generator("b19.simplificar_raices", "Simplificación de raíces", {1: ["pequena"], 2: ["mediana"], 3: ["grande"]})
def simplificar_raices(c: Ctx):
    free = c.choice([2, 3, 5, 6, 7, 10, 11])
    k = c.by_level(c.randint(2, 4), c.randint(3, 7), c.randint(5, 12))
    n = k * k * free
    c.step("Buscar el mayor cuadrado que divide", f"${n} = {k * k} \\times {free}$", procedure="Extracción de factores del radical",
           prompt=f"¿Mayor cuadrado perfecto que divide a {n}?", answer=A_int(k * k))
    c.step("Separar", f"$\\sqrt{{{n}}} = \\sqrt{{{k * k}}} \\cdot \\sqrt{{{free}}} = {k}\\sqrt{{{free}}}$", prop="√(a·b) = √a·√b")
    spec = A_fields(("coef", "Coeficiente", A_int(k)), ("rad", "Radicando", A_int(free)))
    if k % 2 == 0 and k > 2:
        c.mistake("no_maximo", "No sacaste el mayor cuadrado posible", "Busca el MAYOR cuadrado perfecto que divide al radicando.",
                  {"coef": 2, "rad": n // 4}, 0)
    return c.build(name="Simplificación de raíces", procedure="Extracción de factores", prompt=f"Simplifica $\\sqrt{{{n}}}$ en la forma $a\\sqrt{{b}}$.",
                   answer=spec, final=f"{k}√{free}")


@generator("b19.aplicaciones_raices", "Aplicaciones de las raíces", {1: ["lado"], 2: ["lado"], 3: ["arista"]})
def aplicaciones_raices(c: Ctx):
    if c.variant == "lado":
        l = c.randint(3, 30)
        c.step("Lado = √área", f"$\\sqrt{{{l * l}}} = {l}$", procedure="Raíz cuadrada en geometría")
        return c.build(name="Aplicación: lado de un cuadrado", procedure="Raíz cuadrada", prompt=f"Una plaza cuadrada tiene {l * l} m² de área. ¿Cuánto mide su lado?",
                       answer=A_int(l, "m"), final=f"{l} m")
    l = c.randint(2, 12)
    c.step("Arista = ∛volumen", f"$\\sqrt[3]{{{l**3}}} = {l}$", procedure="Raíz cúbica en geometría")
    return c.build(name="Aplicación: arista de un cubo", procedure="Raíz cúbica", prompt=f"Una caja cúbica tiene {l**3} cm³ de volumen. ¿Cuánto mide su arista?",
                   answer=A_int(l, "cm"), final=f"{l} cm")


@generator("b19.concepto_raiz", "Concepto de raíz", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_raiz(c: Ctx):
    r = c.randint(2, 12)
    opts = [f"El número que multiplicado por sí mismo da {r * r}", f"La mitad de {r * r}", f"{r * r} multiplicado por 2", f"{r * r} dividido entre 10"]
    ans = mc(c, opts[0], opts[1:])
    c.step("Definición", "$\\sqrt{n} = r$ significa $r^2 = n$ (con r ≥ 0).", procedure="Definición de raíz")
    return c.build(name="Concepto de raíz", procedure="Definición de raíz cuadrada", prompt=f"¿Qué significa $\\sqrt{{{r * r}}}$?", answer=ans, final=opts[0])


# ============================================ RAZONES Y PROPORCIONES (B20) ==


@generator("b20.razon", "Concepto de razón", {1: ["simplificar"], 2: ["simplificar", "contexto"], 3: ["contexto"]})
def razon(c: Ctx):
    g = c.randint(2, 9)
    a, b = c.randint(1, 9), c.randint(1, 9)
    if gcd(a, b) != 1 or a == b:
        c.retry()
    A, B = a * g, b * g
    if c.variant == "contexto":
        c.step("Escribir la razón", f"chicas : chicos = {A} : {B}", procedure="Razón entre dos cantidades")
        c.step("Simplificar", f"Dividimos entre MCD = {g}: {a} : {b}", prompt="¿MCD?", answer=A_int(g))
        c.mistake("invertida", "Invertiste la razón", "El orden importa: se pide chicas a chicos.", F(b, a), 0)
        return c.build(name="Razón en contexto", procedure="Razón y simplificación", prompt=f"En una clase hay {A} chicas y {B} chicos. ¿Cuál es la razón chicas : chicos simplificada? (escríbela como fracción a/b)",
                       answer=AnswerSpec(kind="number", value=F(A, B), form="simplified"), final=f"{a}/{b}")
    c.step("Razón como cociente", f"${A} : {B} = \\frac{{{A}}}{{{B}}}$", procedure="Razón")
    c.step("Simplificar", f"$= {tex_frac(a, b)}$")
    return c.build(name="Razón simplificada", procedure="Simplificación de razones", prompt=f"Simplifica la razón ${A} : {B}$ (escríbela como fracción).",
                   answer=AnswerSpec(kind="number", value=F(A, B), form="simplified"), final=f"{a}/{b}")


@generator("b20.antecedente_consecuente", "Antecedente y consecuente", {1: ["base"], 2: ["base"], 3: ["base"]})
def antecedente_consecuente(c: Ctx):
    a, b = c.randint(1, 30), c.randint(1, 30)
    role = c.choice(["antecedente", "consecuente"])
    c.step("Recordar", "En a : b, a es el antecedente y b el consecuente.", procedure="Terminología de razones")
    return c.build(name="Términos de una razón", procedure="Identificación de términos", prompt=f"En la razón ${a} : {b}$, ¿cuál es el **{role}**?",
                   answer=A_int(a if role == "antecedente" else b), final=str(a if role == "antecedente" else b))


@generator("b20.proporcion", "Concepto de proporción", {1: ["verificar"], 2: ["verificar"], 3: ["verificar"]})
def proporcion(c: Ctx):
    a, b = c.randint(1, 12), c.randint(1, 12)
    k = c.randint(2, 6)
    yes = c.rng.random() < 0.5
    cc, d = a * k, b * k + (0 if yes else c.choice([-1, 1]))
    if d <= 0:
        c.retry()
    yes = a * d == b * cc
    c.step("Productos cruzados", f"${a} \\times {d} = {a * d}$; ${b} \\times {cc} = {b * cc}$", procedure="Propiedad fundamental de las proporciones")
    c.step("Comparar", "Son iguales → proporción." if yes else "Son distintos → no es proporción.")
    return c.build(name="¿Es una proporción?", procedure="Productos cruzados", prompt=f"¿Forman proporción $\\frac{{{a}}}{{{b}}}$ y $\\frac{{{cc}}}{{{d}}}$?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if yes else "No"), final="Sí" if yes else "No")


@generator("b20.cuarto_proporcional", "Propiedad fundamental de las proporciones", {1: ["entero"], 2: ["entero"], 3: ["decimal"]})
def cuarto_proporcional(c: Ctx):
    a, b = c.randint(2, 12), c.randint(2, 12)
    k = F(c.randint(2, 9)) if c.variant == "entero" else F(c.randint(3, 25), 2)
    cc = a * k
    if cc.denominator != 1:
        c.retry()
    x = b * k
    c.step("Plantear", f"$\\frac{{{a}}}{{{b}}} = \\frac{{{cc}}}{{x}}$", procedure="Cálculo del cuarto proporcional")
    c.step("Productos cruzados", f"${a} \\cdot x = {b} \\cdot {cc}$", prop="Propiedad fundamental: a·d = b·c", prompt="¿Cuánto es el producto conocido?", answer=A_int(int(b * cc)))
    c.step("Despejar", f"$x = \\frac{{{b * cc}}}{{{a}}} = {tex(x)}$")
    c.mistake("suma", "Sumaste la diferencia", "En una proporción se multiplica, no se suma.", b + (cc - a), 1)
    return c.build(name="Término desconocido de una proporción", procedure="Propiedad fundamental de las proporciones",
                   prompt=f"Halla x: $\\frac{{{a}}}{{{b}}} = \\frac{{{cc}}}{{x}}$", answer=AnswerSpec(kind="number", value=x), final=num(x))


@generator("b20.proporciones_equivalentes", "Proporciones equivalentes", {1: ["base"], 2: ["base"], 3: ["base"]})
def proporciones_equivalentes(c: Ctx):
    a, b = c.randint(1, 9), c.randint(2, 9)
    k = c.randint(2, 8)
    c.step("Multiplicar ambos términos", f"${a} : {b} = {a * k} : {b * k}$", procedure="Razones equivalentes")
    return c.build(name="Razones equivalentes", procedure="Amplificación de razones", prompt=f"Completa: ${a} : {b} = \\square : {b * k}$", answer=A_int(a * k), final=str(a * k))


@generator("b20.tipo_proporcionalidad", "Magnitudes directa e inversamente proporcionales", {1: ["clasificar"], 2: ["clasificar"], 3: ["tabla"]})
def tipo_proporcionalidad(c: Ctx):
    bank = [("El número de kilos de fruta y el precio que se paga", "Directa"), ("La velocidad de un coche y el tiempo que tarda en un trayecto fijo", "Inversa"),
            ("El número de obreros y los días que tardan en hacer una obra", "Inversa"), ("Las horas trabajadas y el sueldo (pago por hora)", "Directa"),
            ("La edad de una persona y su estatura", "Ninguna"), ("El número de grifos iguales y el tiempo de llenado de un tanque", "Inversa"),
            ("Los litros de gasolina y los kilómetros recorridos (consumo constante)", "Directa"), ("El número de invitados y la porción de pastel de cada uno", "Inversa"),
            ("La temperatura de un día y el número de la fecha", "Ninguna")]
    if c.variant == "tabla":
        kind = c.choice(["Directa", "Inversa"])
        x = [1, 2, 3, 4, 6]
        k = c.choice([12, 24, 36, 60])
        y = [k * v // 12 for v in x] if kind == "Directa" else [k // v for v in x]
        c.step("Comprobar cociente o producto", ("y/x es constante" if kind == "Directa" else "x·y es constante") + ": " +
               ", ".join(f"({a},{b})" for a, b in zip(x, y)), procedure="Identificación del tipo de proporcionalidad")
        return c.build(name="Tipo de proporcionalidad (tabla)", procedure="Razón constante o producto constante",
                       prompt="La tabla relaciona x con y: " + " · ".join(f"x={a} → y={b}" for a, b in zip(x, y)) + ". ¿Qué tipo de proporcionalidad es?",
                       answer=A_choice_fixed(["Directa", "Inversa", "Ninguna"], kind), final=kind)
    text, kind = c.choice(bank)
    c.step("Preguntar: si una se duplica, ¿la otra?", {"Directa": "se duplica → directa", "Inversa": "se reduce a la mitad → inversa",
                                                         "Ninguna": "no hay una regla fija → no son proporcionales"}[kind],
           procedure="Identificación del tipo de proporcionalidad")
    return c.build(name="Tipo de proporcionalidad", procedure="Razonamiento proporcional", prompt=f"{text}: ¿qué relación tienen?",
                   answer=A_choice_fixed(["Directa", "Inversa", "Ninguna"], kind), final=kind)


@generator("b20.aplicaciones_proporciones", "Aplicaciones cotidianas de proporciones", {1: ["receta"], 2: ["mapa"], 3: ["mapa", "receta"]})
def aplicaciones_proporciones(c: Ctx):
    if c.variant == "receta":
        p1 = c.choice([2, 4, 6])
        g = c.randint(1, 5) * 50
        p2 = p1 * c.choice([2, 3]) if c.rng.random() < 0.5 else p1 // 2 * c.choice([1, 3])
        if p2 == p1 or p2 == 0:
            c.retry()
        x = F(g * p2, p1)
        c.step("Proporción directa", f"$\\frac{{{g}}}{{{p1}}} = \\frac{{x}}{{{p2}}}$", procedure="Proporcionalidad directa")
        c.step("Resolver", f"$x = {g} \\times {p2} \\div {p1} = {num(x)}$")
        return c.build(name="Receta proporcional", procedure="Proporción directa", prompt=f"Una receta para {p1} personas lleva {g} g de harina. ¿Cuántos gramos se necesitan para {p2} personas?",
                       answer=AnswerSpec(kind="number", value=x, unit="g"), final=f"{num(x)} g")
    esc = c.choice([10000, 25000, 50000, 100000])
    cm = c.randint(2, 15)
    km = F(cm * esc, 100000)
    c.step("Escala", f"1 cm en el mapa = {esc} cm reales", procedure="Escalas")
    c.step("Multiplicar", f"{cm} × {esc} = {cm * esc} cm = {num(km)} km", prompt="¿Centímetros reales?", answer=A_int(cm * esc))
    return c.build(name="Escalas", procedure="Proporción directa (escala)", prompt=f"En un mapa a escala 1:{esc}, dos pueblos están a {cm} cm. ¿A cuántos km están en la realidad?",
                   answer=AnswerSpec(kind="number", value=km, unit="km"), final=f"{num(km)} km")


# =================================================== REGLA DE TRES (B21) ===


@generator("b21.regla_tres_directa", "Regla de tres simple directa", {1: ["entera"], 2: ["entera"], 3: ["decimal"]})
def regla_tres_directa(c: Ctx):
    a = c.randint(2, 12)
    unit = c.randint(2, 30) if c.variant == "entera" else F(c.randint(11, 99), 10)
    b = a * unit
    x_q = c.randint(2, 20)
    x = unit * x_q
    item = c.choice(["kg de arroz", "metros de tela", "litros de pintura", "cuadernos"])
    c.step("Identificar magnitudes", f"{item} y precio: a más {item}, más precio → **directa**.", procedure="Regla de tres simple directa")
    c.step("Plantear", f"{a} → {num(b)}; {x_q} → x", why="En la directa se multiplica en cruz y se divide por el que queda.")
    c.step("Resolver", f"$x = \\frac{{{num(b).replace(',', '{,}')} \\times {x_q}}}{{{a}}} = {tex(x)}$", prompt="¿x?", answer=A_num(x))
    c.mistake("inversa", "La resolviste como inversa", "Si ambas magnitudes aumentan juntas, la regla de tres es directa.", F(b) * a / x_q, 1)
    return c.build(name="Regla de tres directa", procedure="Regla de tres simple directa",
                   prompt=f"{a} {item} cuestan {num(b)} pesos. ¿Cuánto cuestan {x_q} {item}?", answer=A_num(x, unit="pesos"), final=f"{num(x)} pesos")


@generator("b21.regla_tres_inversa", "Regla de tres simple inversa", {1: ["obreros"], 2: ["velocidad"], 3: ["obreros", "velocidad"]})
def regla_tres_inversa(c: Ctx):
    total = c.choice([24, 36, 48, 60, 72, 120])
    opts = [d for d in range(2, 25) if total % d == 0]
    a, b = c.sample(opts, 2)
    ta, tb = total // a, total // b
    if c.variant == "obreros":
        story = f"{a} obreros hacen una obra en {ta} días. ¿Cuántos días tardarán {b} obreros (al mismo ritmo)?"
        u = "días"
    else:
        story = f"A {a * 10} km/h un viaje dura {ta} horas. ¿Cuánto dura a {b * 10} km/h?"
        u = "horas"
    c.step("Identificar magnitudes", "Si una aumenta, la otra disminuye → **inversa**.", procedure="Regla de tres simple inversa")
    c.step("Producto constante", f"${a} \\times {ta} = {b} \\times x$", why="En la inversa el producto de las magnitudes se mantiene.", prompt="¿Producto constante?",
           answer=A_int(a * ta))
    c.step("Despejar", f"$x = {a * ta} \\div {b} = {tb}$")
    c.mistake("directa", "La resolviste como directa", "Más obreros (o más velocidad) → menos tiempo: es inversa.", F(ta * b, a), 0)
    return c.build(name="Regla de tres inversa", procedure="Regla de tres simple inversa", prompt=story, answer=A_num(tb, unit=u), final=f"{tb} {u}")


@generator("b21.regla_tres_compuesta", "Regla de tres compuesta", {1: ["directa_directa"], 2: ["directa_inversa"], 3: ["directa_inversa"]})
def regla_tres_compuesta(c: Ctx):
    # máquinas, horas, piezas: piezas ∝ máquinas × horas
    m1, h1 = c.randint(2, 6), c.randint(2, 8)
    rate = c.randint(2, 10)
    p1 = m1 * h1 * rate
    if c.variant == "directa_directa":
        m2, h2 = c.randint(2, 9), c.randint(2, 10)
        x = m2 * h2 * rate
        story = f"{m1} máquinas fabrican {p1} piezas en {h1} horas. ¿Cuántas piezas fabrican {m2} máquinas en {h2} horas?"
        c.step("Analizar cada magnitud con la incógnita", "Más máquinas → más piezas (directa). Más horas → más piezas (directa).", procedure="Regla de tres compuesta")
        c.step("Plantear", f"$x = {p1} \\times \\frac{{{m2}}}{{{m1}}} \\times \\frac{{{h2}}}{{{h1}}}$")
        c.step("Calcular", f"$x = {x}$", prompt="¿Piezas?", answer=A_int(x))
        u = "piezas"
    else:
        p2 = m1 * h1 * rate * c.choice([2, 3])
        m2 = m1 * c.choice([1, 2, 3])
        hx = F(p2, m2 * rate)
        if hx.denominator != 1:
            c.retry()
        x = int(hx)
        story = f"{m1} máquinas fabrican {p1} piezas en {h1} horas. ¿Cuántas horas necesitan {m2} máquinas para fabricar {p2} piezas?"
        c.step("Analizar cada magnitud con la incógnita", "Más piezas → más horas (directa). Más máquinas → menos horas (inversa).", procedure="Regla de tres compuesta")
        c.step("Plantear", f"$x = {h1} \\times \\frac{{{p2}}}{{{p1}}} \\times \\frac{{{m1}}}{{{m2}}}$", why="La razón de la magnitud inversa se invierte.")
        c.step("Calcular", f"$x = {x}$", prompt="¿Horas?", answer=A_int(x))
        c.mistake("todo_directo", "Trataste todas las magnitudes como directas", "Más máquinas → MENOS horas: esa razón se invierte.",
                  F(h1 * p2 * m2, p1 * m1), 0)
        u = "horas"
    return c.build(name="Regla de tres compuesta", procedure="Regla de tres compuesta", prompt=story, answer=A_num(x, unit=u), final=f"{x} {u}")


@generator("b21.identificar_magnitudes", "Identificación de magnitudes", {1: ["base"], 2: ["base"], 3: ["base"]})
def identificar_magnitudes(c: Ctx):
    bank = [("Si 3 cuadernos cuestan 90 pesos, ¿cuánto cuestan 5?", "Directa"), ("Si 4 grifos llenan un tanque en 6 h, ¿cuánto tardan 8 grifos?", "Inversa"),
            ("Si en 2 horas se recorren 160 km, ¿cuánto en 5 horas?", "Directa"), ("Si 6 pintores tardan 10 días, ¿cuánto tardan 3 pintores?", "Inversa"),
            ("Con 20 litros se recorren 300 km; ¿cuántos km con 35 litros?", "Directa"), ("Un pienso alcanza para 30 vacas durante 12 días; ¿cuánto dura para 40 vacas?", "Inversa")]
    text, kind = c.choice(bank)
    c.step("Pregunta clave", "Si una magnitud se duplica, ¿la otra se duplica (directa) o se reduce a la mitad (inversa)?", procedure="Identificación de magnitudes")
    return c.build(name="Directa o inversa", procedure="Análisis de magnitudes", prompt=f"{text} — ¿Es una regla de tres directa o inversa?",
                   answer=A_choice_fixed(["Directa", "Inversa"], kind), final=kind)


@generator("b21.concepto_regla_tres", "Concepto de regla de tres", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_regla_tres(c: Ctx):
    k = c.randint(2, 9)
    a = c.randint(2, 9)
    c.step("Valor unitario", f"Si {a} unidades valen {a * k}, 1 unidad vale {k}.", procedure="Reducción a la unidad")
    return c.build(name="Reducción a la unidad", procedure="Valor unitario (base de la regla de tres)",
                   prompt=f"Si {a} entradas cuestan {a * k} pesos, ¿cuánto cuesta **una** entrada?", answer=A_int(k, "pesos"), final=f"{k} pesos")


# ======================================================= PORCENTAJES (B22) ==


@generator("b22.porcentaje_cantidad", "Porcentaje de una cantidad", {1: ["redondo"], 2: ["cualquiera"], 3: ["decimal"]})
def porcentaje_cantidad(c: Ctx):
    p = c.choice([10, 20, 25, 50, 75]) if c.variant == "redondo" else c.randint(1, 99) if c.variant == "cualquiera" else F(c.randint(5, 199), 10)
    n = c.choice([40, 60, 80, 120, 200, 240, 300, 500, 800, 1200])
    v = F(p) * n / 100
    c.step("Porcentaje como fracción", f"${tex(F(p))}\\% = \\frac{{{tex(F(p))}}}{{100}}$", procedure="Cálculo del porcentaje de una cantidad")
    c.step("Multiplicar", f"$\\frac{{{tex(F(p))} \\times {n}}}{{100}} = {tex(v)}$", prompt="¿Resultado?", answer=A_num(v))
    c.mistake("por_100", "Multiplicaste sin dividir entre 100", "p % significa p de cada 100.", F(p) * n, 1)
    return c.build(name="Porcentaje de una cantidad", procedure="p % de N = p·N/100", prompt=f"Calcula el ${tex(F(p))}\\%$ de {n}.", answer=A_num(v), final=num(v))


@generator("b22.conversion_porcentaje", "Relación entre porcentaje, fracción y decimal", {1: ["a_decimal"], 2: ["a_fraccion", "a_decimal"], 3: ["a_porcentaje"]})
def conversion_porcentaje(c: Ctx):
    p = c.choice([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80, 125, 150])
    q = F(p, 100)
    if c.variant == "a_decimal":
        c.step("Dividir entre 100", f"{p} % = {p}/100 = {decimal_str(q)}", procedure="Porcentaje a decimal")
        return c.build(name="Porcentaje a decimal", procedure="Dividir entre 100", prompt=f"Escribe {p} % como número decimal.",
                       answer=AnswerSpec(kind="number", value=q, form="decimal"), final=decimal_str(q))
    if c.variant == "a_fraccion":
        c.step("Escribir sobre 100 y simplificar", f"{p}/100 = {ftxt(q)}", procedure="Porcentaje a fracción")
        return c.build(name="Porcentaje a fracción", procedure="Fracción sobre 100 y simplificación", prompt=f"Escribe {p} % como fracción irreducible.",
                       answer=AnswerSpec(kind="number", value=q, form="simplified"), final=ftxt(q))
    c.step("Multiplicar por 100", f"{decimal_str(q)} × 100 = {p} %", procedure="Decimal a porcentaje")
    c.mistake("sin_100", "No multiplicaste por 100", "Para pasar a porcentaje se multiplica por 100.", q, 0)
    return c.build(name="Decimal a porcentaje", procedure="Multiplicar por 100", prompt=f"Expresa {decimal_str(q)} como porcentaje (escribe sólo el número).",
                   answer=A_num(p, unit="%"), final=f"{p} %")


@generator("b22.que_porcentaje", "Cálculo de porcentajes", {1: ["redondo"], 2: ["cualquiera"], 3: ["total_desde_parte"]})
def que_porcentaje(c: Ctx):
    n = c.choice([20, 25, 40, 50, 80, 200, 250, 400])
    p = c.choice([10, 20, 25, 40, 50, 75]) if c.variant == "redondo" else c.randint(1, 99)
    part = F(p * n, 100)
    if part.denominator != 1:
        c.retry()
    if c.variant == "total_desde_parte":
        c.step("Plantear", f"{p} % de N = {part} → N = {part} × 100 ÷ {p}", procedure="Cálculo del total a partir de una parte")
        c.step("Resolver", f"N = {n}", prompt="¿N?", answer=A_int(n))
        c.mistake("porcentaje_de_parte", "Calculaste el porcentaje de la parte", "La parte es el {p} % del total: hay que dividir entre el porcentaje.", part * p / 100, 0)
        return c.build(name="Total a partir del porcentaje", procedure="Regla de tres con porcentajes", prompt=f"El {p} % de un número es {part}. ¿Cuál es el número?",
                       answer=A_int(n), final=str(n))
    c.step("Razón parte/total", f"$\\frac{{{part}}}{{{n}}}$", procedure="Cálculo del tanto por ciento")
    c.step("Multiplicar por 100", f"$\\frac{{{part}}}{{{n}}} \\times 100 = {p}$", prompt="¿Porcentaje?", answer=A_int(p))
    return c.build(name="¿Qué porcentaje es?", procedure="parte ÷ total × 100", prompt=f"¿Qué porcentaje de {n} es {part}?", answer=A_num(p, unit="%"), final=f"{p} %")


@generator("b22.aumento", "Aumentos porcentuales", {1: ["base"], 2: ["base"], 3: ["factor"]})
def aumento(c: Ctx):
    n = c.choice([100, 200, 250, 400, 500, 800, 1200, 1500])
    p = c.choice([5, 10, 15, 20, 25, 30, 40])
    inc = F(p * n, 100)
    res = n + inc
    if c.variant == "factor":
        c.step("Factor de aumento", f"$1 + \\frac{{{p}}}{{100}} = {tex(F(100 + p, 100))}$", procedure="Aumento porcentual con factor")
        c.step("Multiplicar", f"${n} \\times {tex(F(100 + p, 100))} = {tex(res)}$", prompt="¿Resultado?", answer=A_num(res))
    else:
        c.step("Calcular el aumento", f"{p} % de {n} = {num(inc)}", procedure="Aumento porcentual", prompt="¿Cuánto aumenta?", answer=A_num(inc))
        c.step("Sumar", f"{n} + {num(inc)} = {num(res)}")
    c.mistake("solo_aumento", "Diste sólo el aumento", "Se pide el valor final: original + aumento.", inc, 1)
    return c.build(name="Aumento porcentual", procedure="Aumento porcentual", prompt=f"Un precio de {n} pesos sube un {p} %. ¿Cuál es el nuevo precio?",
                   answer=A_num(res, unit="pesos"), final=f"{num(res)} pesos")


@generator("b22.descuento", "Descuentos porcentuales", {1: ["base"], 2: ["base"], 3: ["sucesivos"]})
def descuento(c: Ctx):
    n = c.choice([100, 200, 400, 500, 800, 1000, 1200, 2000])
    p = c.choice([5, 10, 15, 20, 25, 30, 40, 50])
    if c.variant == "sucesivos":
        q = c.choice([10, 20])
        r1 = n * F(100 - p, 100)
        r2 = r1 * F(100 - q, 100)
        c.step("Primer descuento", f"{n} × {tex(F(100 - p, 100))} = {num(r1)}", procedure="Descuentos sucesivos", prompt="¿Tras el primer descuento?", answer=A_num(r1))
        c.step("Segundo descuento sobre el nuevo precio", f"{num(r1)} × {tex(F(100 - q, 100))} = {num(r2)}", why="El segundo descuento se aplica al precio ya rebajado.",
               prompt="¿Precio final?", answer=A_num(r2))
        c.mistake("sumar_porcentajes", f"Sumaste los descuentos ({p + q} %)", "Los descuentos sucesivos no se suman: el segundo se calcula sobre el precio rebajado.",
                  n * F(100 - p - q, 100), 1)
        return c.build(name="Descuentos sucesivos", procedure="Descuentos encadenados", prompt=f"Un artículo de {n} pesos tiene un descuento del {p} % y luego otro del {q} % sobre el nuevo precio. ¿Precio final?",
                       answer=A_num(r2, unit="pesos"), final=f"{num(r2)} pesos")
    d = F(p * n, 100)
    c.step("Calcular el descuento", f"{p} % de {n} = {num(d)}", procedure="Descuento porcentual", prompt="¿Descuento?", answer=A_num(d))
    c.step("Restar", f"{n} − {num(d)} = {num(n - d)}")
    c.mistake("solo_descuento", "Diste sólo el descuento", "Se pide el precio final: original − descuento.", d, 1)
    return c.build(name="Descuento porcentual", procedure="Descuento porcentual", prompt=f"Una prenda cuesta {n} pesos y tiene un {p} % de descuento. ¿Cuánto se paga?",
                   answer=A_num(n - d, unit="pesos"), final=f"{num(n - d)} pesos")


@generator("b22.variacion", "Variación porcentual", {1: ["aumento"], 2: ["disminucion", "aumento"], 3: ["disminucion"]})
def variacion(c: Ctx):
    a = c.choice([50, 80, 100, 200, 250, 400, 500])
    p = c.choice([10, 20, 25, 40, 50, 60])
    b = a + a * p // 100 if c.variant == "aumento" else a - a * p // 100
    v = F(b - a, a) * 100
    c.step("Diferencia", f"{b} − {a} = {b - a}", procedure="Variación porcentual", prompt="¿Diferencia (final − inicial)?", answer=A_int(b - a))
    c.step("Dividir entre el valor INICIAL y × 100", f"$\\frac{{{b - a}}}{{{a}}} \\times 100 = {num(v)}\\%$", why="La variación se mide respecto al valor de partida.")
    c.mistake("valor_final", "Dividiste entre el valor final", "La referencia es el valor inicial.", F(b - a, b) * 100, 1)
    return c.build(name="Variación porcentual", procedure="(final − inicial) ÷ inicial × 100",
                   prompt=f"Un valor pasa de {a} a {b}. ¿Cuál es la variación porcentual? (negativa si disminuye)", answer=A_num(v, unit="%"), final=f"{num(v)} %")


@generator("b22.concepto_porcentaje", "Concepto de porcentaje", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_porcentaje(c: Ctx):
    p = c.randint(1, 99)
    c.step("Por ciento = de cada 100", f"{p} % significa {p} de cada 100.", procedure="Definición de porcentaje")
    return c.build(name="Concepto de porcentaje", procedure="Definición", prompt=f"En una cuadrícula de 100 casillas se pintan {p}. ¿Qué porcentaje está pintado?",
                   answer=A_num(p, unit="%"), final=f"{p} %", workspace={"type": "grid100", "filled": p})


@generator("b22.aplicaciones_porcentaje", "Aplicaciones comerciales de los porcentajes", {1: ["iva"], 2: ["comision"], 3: ["iva", "comision"]})
def aplicaciones_porcentaje(c: Ctx):
    n = c.choice([200, 500, 800, 1000, 1500, 2500])
    if c.variant == "iva":
        p = c.choice([16, 19, 21])
        tot = n * F(100 + p, 100)
        c.step("Impuesto", f"{p} % de {n} = {num(F(p * n, 100))}", procedure="Impuesto sobre el precio")
        c.step("Precio final", f"{n} + {num(F(p * n, 100))} = {num(tot)}", prompt="¿Precio con impuesto?", answer=A_num(tot))
        return c.build(name="Impuesto (IVA)", procedure="Aumento porcentual", prompt=f"Un producto cuesta {n} pesos sin impuesto. Si el impuesto es del {p} %, ¿cuánto se paga?",
                       answer=A_num(tot, unit="pesos"), final=f"{num(tot)} pesos")
    p = c.choice([2, 3, 5, 8, 10])
    ventas = n * c.randint(2, 10)
    com = F(p * ventas, 100)
    c.step("Comisión", f"{p} % de {ventas} = {num(com)}", procedure="Porcentaje de una cantidad", prompt="¿Comisión?", answer=A_num(com))
    return c.build(name="Comisión de ventas", procedure="Porcentaje de una cantidad", prompt=f"Un vendedor cobra un {p} % de comisión. Si vendió {ventas} pesos, ¿cuánto cobra de comisión?",
                   answer=A_num(com, unit="pesos"), final=f"{num(com)} pesos")


# ============================================ MATEMÁTICAS FINANCIERAS (B23) ==


@generator("b23.interes_simple", "Interés simple", {1: ["anual"], 2: ["anual", "meses"], 3: ["capital_final"]})
def interes_simple(c: Ctx):
    C = c.choice([1000, 2000, 5000, 8000, 10000, 20000])
    r = c.choice([2, 3, 4, 5, 6, 8, 10, 12])
    if c.variant == "meses":
        m = c.choice([3, 6, 9, 18])
        I = F(C * r * m, 100 * 12)
        c.step("Fórmula", "$I = C \\cdot \\frac{r}{100} \\cdot t$ (t en años)", procedure="Interés simple")
        c.step("Pasar meses a años", f"$t = \\frac{{{m}}}{{12}}$ años", prompt="¿Años (como fracción o decimal)?", answer=A_num(F(m, 12)))
        c.step("Calcular", f"$I = {C} \\times \\frac{{{r}}}{{100}} \\times \\frac{{{m}}}{{12}} = {tex(I)}$")
        c.mistake("meses_como_anos", "Usaste los meses como si fueran años", "La tasa es anual: t debe estar en años.", F(C * r * m, 100), 1)
        return c.build(name="Interés simple (meses)", procedure="I = C·r·t", prompt=f"¿Qué interés simple producen {C} pesos al {r} % anual durante {m} meses?",
                       answer=A_num(I, unit="pesos"), final=f"{num(I)} pesos")
    t = c.randint(1, 6)
    I = F(C * r * t, 100)
    c.step("Identificar", f"Capital C = {C}, tasa r = {r} % anual, tiempo t = {t} años.", procedure="Interés simple")
    c.step("Aplicar I = C·r·t/100", f"$I = \\frac{{{C} \\times {r} \\times {t}}}{{100}} = {tex(I)}$", prompt="¿Interés?", answer=A_num(I))
    if c.variant == "capital_final":
        c.step("Capital final", f"$M = C + I = {C} + {tex(I)} = {tex(C + I)}$")
        c.mistake("solo_interes", "Diste sólo el interés", "El monto final es capital + interés.", I, 2)
        return c.build(name="Monto con interés simple", procedure="M = C + C·r·t", prompt=f"Se invierten {C} pesos al {r} % anual de interés simple durante {t} años. ¿Cuánto dinero hay al final?",
                       answer=A_num(C + I, unit="pesos"), final=f"{num(C + I)} pesos")
    return c.build(name="Interés simple", procedure="I = C·r·t/100", prompt=f"Calcula el interés simple de {C} pesos al {r} % anual durante {t} años.",
                   answer=A_num(I, unit="pesos"), final=f"{num(I)} pesos")


@generator("b23.interes_compuesto", "Interés compuesto", {1: ["dos_anos"], 2: ["tres_anos"], 3: ["comparar"]})
def interes_compuesto(c: Ctx):
    C = c.choice([1000, 2000, 5000, 10000])
    r = c.choice([5, 10, 20])
    t = 2 if c.variant == "dos_anos" else 3
    M = C * F(100 + r, 100) ** t
    c.step("Fórmula", "$M = C \\cdot (1 + \\frac{r}{100})^t$: cada año el interés se suma al capital.", procedure="Interés compuesto")
    acc = F(C)
    for year in range(1, t + 1):
        acc = acc * F(100 + r, 100)
        c.step(f"Año {year}", f"Capital × {tex(F(100 + r, 100))} = {tex(acc)}", prompt=f"¿Capital al final del año {year}?", answer=A_num(acc))
    if c.variant == "comparar":
        simple = C + F(C * r * t, 100)
        diff = M - simple
        c.step("Comparar con interés simple", f"Simple: {num(simple)}. Diferencia: {num(diff)}")
        return c.build(name="Compuesto vs. simple", procedure="Comparación de interés compuesto y simple",
                       prompt=f"Con {C} pesos al {r} % anual durante {t} años, ¿cuántos pesos más da el interés compuesto que el simple?",
                       answer=A_num(diff, unit="pesos"), final=f"{num(diff)} pesos")
    c.mistake("simple", "Calculaste interés simple", "En el compuesto, el interés de cada año se calcula sobre el capital acumulado.", C + F(C * r * t, 100), 1)
    return c.build(name="Interés compuesto", procedure="M = C(1 + r)^t", prompt=f"Se invierten {C} pesos al {r} % anual de interés compuesto durante {t} años. ¿Monto final?",
                   answer=A_num(M, unit="pesos"), final=f"{num(M)} pesos")


@generator("b23.elementos_financieros", "Capital, tasa y tiempo", {1: ["identificar"], 2: ["despejar_tasa"], 3: ["despejar_tiempo", "despejar_capital"]})
def elementos_financieros(c: Ctx):
    C = c.choice([1000, 2000, 4000, 5000])
    r = c.choice([2, 4, 5, 10])
    t = c.randint(1, 5)
    I = C * r * t // 100
    if c.variant == "identificar":
        role = c.choice(["capital", "tasa", "tiempo"])
        val = {"capital": C, "tasa": r, "tiempo": t}[role]
        c.step("Recordar", "Capital: dinero inicial. Tasa: % por periodo. Tiempo: número de periodos.", procedure="Terminología financiera")
        return c.build(name="Elementos del interés", procedure="Identificación", prompt=f"«Se prestan {C} pesos al {r} % anual durante {t} años.» ¿Cuál es el **{role}**?",
                       answer=A_int(val), final=str(val))
    if c.variant == "despejar_tasa":
        c.step("Despejar r", f"$r = \\frac{{100 \\cdot I}}{{C \\cdot t}} = \\frac{{100 \\times {I}}}{{{C} \\times {t}}} = {r}$", procedure="Despeje en la fórmula del interés simple")
        return c.build(name="Calcular la tasa", procedure="r = 100·I/(C·t)", prompt=f"{C} pesos generaron {I} pesos de interés simple en {t} años. ¿A qué tasa anual (%)?",
                       answer=A_num(r, unit="%"), final=f"{r} %")
    if c.variant == "despejar_tiempo":
        c.step("Despejar t", f"$t = \\frac{{100 \\cdot I}}{{C \\cdot r}} = {t}$", procedure="Despeje en la fórmula del interés simple")
        return c.build(name="Calcular el tiempo", procedure="t = 100·I/(C·r)", prompt=f"¿Cuántos años tarda un capital de {C} pesos al {r} % en producir {I} pesos de interés simple?",
                       answer=A_num(t, unit="años"), final=f"{t} años")
    c.step("Despejar C", f"$C = \\frac{{100 \\cdot I}}{{r \\cdot t}} = {C}$", procedure="Despeje en la fórmula del interés simple")
    return c.build(name="Calcular el capital", procedure="C = 100·I/(r·t)", prompt=f"¿Qué capital produce {I} pesos de interés simple al {r} % anual en {t} años?",
                   answer=A_num(C, unit="pesos"), final=f"{C} pesos")


@generator("b23.ganancias_perdidas", "Ganancias y pérdidas", {1: ["ganancia"], 2: ["perdida", "ganancia"], 3: ["porcentaje"]})
def ganancias_perdidas(c: Ctx):
    cost = c.choice([200, 400, 500, 800, 1000, 1500])
    p = c.choice([10, 20, 25, 30, 50])
    if c.variant == "porcentaje":
        sale = cost + cost * p // 100
        c.step("Ganancia", f"{sale} − {cost} = {sale - cost}", procedure="Porcentaje de ganancia", prompt="¿Ganancia?", answer=A_int(sale - cost))
        c.step("Porcentaje sobre el costo", f"{sale - cost} ÷ {cost} × 100 = {p} %")
        c.mistake("sobre_venta", "Calculaste el porcentaje sobre el precio de venta", "El porcentaje de ganancia se calcula sobre el costo.", F(sale - cost, sale) * 100, 1)
        return c.build(name="Porcentaje de ganancia", procedure="ganancia ÷ costo × 100", prompt=f"Un comerciante compra a {cost} pesos y vende a {sale}. ¿Qué porcentaje gana sobre el costo?",
                       answer=A_num(p, unit="%"), final=f"{p} %")
    sale = cost + c.randint(1, cost // 2) * (1 if c.variant == "ganancia" else -1)
    res = sale - cost
    c.step("Venta − costo", f"{sale} − {cost} = {res}", procedure="Ganancia o pérdida", why="Positivo = ganancia; negativo = pérdida.")
    return c.build(name="Ganancia o pérdida", procedure="Venta − costo", prompt=f"Se compró un artículo a {cost} pesos y se vendió a {sale}. ¿Cuánto se ganó? (escribe un número negativo si fue pérdida)",
                   answer=A_int(res, "pesos"), final=f"{res} pesos")


@generator("b23.descuentos_financieros", "Descuentos", {1: ["pronto_pago"], 2: ["pronto_pago"], 3: ["precio_original"]})
def descuentos_financieros(c: Ctx):
    n = c.choice([1000, 2000, 2500, 4000, 5000])
    p = c.choice([2, 3, 5, 10])
    if c.variant == "precio_original":
        final = n * (100 - p) // 100
        c.step("Plantear", f"Precio × (1 − {p}/100) = {final}", procedure="Precio antes del descuento")
        c.step("Despejar", f"Precio = {final} ÷ {tex(F(100 - p, 100))} = {n}")
        c.mistake("sumar_porcentaje", f"Sumaste el {p} % al precio final", "El descuento se calculó sobre el precio ORIGINAL, no sobre el final.", final + F(final * p, 100), 1)
        return c.build(name="Precio original", procedure="División por el factor de descuento", prompt=f"Tras un descuento del {p} % se pagaron {final} pesos. ¿Cuál era el precio original?",
                       answer=A_num(n, unit="pesos"), final=f"{n} pesos")
    d = F(n * p, 100)
    c.step("Descuento por pronto pago", f"{p} % de {n} = {num(d)}", procedure="Descuento comercial")
    c.step("A pagar", f"{n} − {num(d)} = {num(n - d)}", prompt="¿Importe a pagar?", answer=A_num(n - d))
    return c.build(name="Descuento por pronto pago", procedure="Descuento porcentual", prompt=f"Una factura de {n} pesos tiene un {p} % de descuento si se paga al contado. ¿Cuánto se paga?",
                   answer=A_num(n - d, unit="pesos"), final=f"{num(n - d)} pesos")


@generator("b23.aplicaciones_financieras", "Aplicaciones financieras cotidianas", {1: ["cuotas"], 2: ["cuotas"], 3: ["comparar_ofertas"]})
def aplicaciones_financieras(c: Ctx):
    if c.variant == "cuotas":
        price = c.choice([1200, 2400, 3600, 6000])
        k = c.choice([3, 6, 12])
        extra = c.choice([0, 10, 20])
        total = price * (100 + extra) // 100
        cuota = F(total, k)
        c.step("Total con recargo", f"{price} + {extra} % = {total}", procedure="Pago en cuotas", prompt="¿Total a pagar?", answer=A_int(total))
        c.step("Dividir en cuotas", f"{total} ÷ {k} = {num(cuota)}")
        return c.build(name="Pago en cuotas", procedure="Recargo porcentual y división", prompt=f"Un televisor cuesta {price} pesos. Pagándolo en {k} cuotas iguales hay un recargo del {extra} %. ¿Cuánto vale cada cuota?",
                       answer=A_num(cuota, unit="pesos"), final=f"{num(cuota)} pesos")
    price = c.choice([500, 800, 1000, 1200])
    a = price * 80 // 100  # 20 % descuento
    b = F(price * 2, 3)  # 3x2: pagas 2 de 3 → precio por unidad
    unit_b = b
    better = "A" if a < unit_b else "B"
    c.step("Oferta A", f"20 % de descuento: {a} por unidad", procedure="Comparación de ofertas")
    c.step("Oferta B", f"3×2: por 3 unidades pagas 2 → {num(round_half_up(unit_b, 2))} por unidad (aprox.)")
    c.step("Comparar", f"La oferta más barata por unidad es la {better}.")
    return c.build(name="Comparación de ofertas", procedure="Precio unitario", prompt=f"Un producto cuesta {price} pesos. Oferta A: 20 % de descuento. Oferta B: lleva 3 y paga 2. Si necesitas 3 unidades, ¿qué oferta es más barata?",
                   answer=A_choice_fixed(["A", "B"], better), final=better)


@generator("b23.concepto_interes", "Concepto de interés", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_interes(c: Ctx):
    C = c.choice([1000, 2000, 5000])
    I = c.choice([50, 100, 200, 300])
    c.step("Interés = lo que se gana (o paga) por usar el dinero", f"{C + I} − {C} = {I}", procedure="Concepto de interés")
    return c.build(name="Concepto de interés", procedure="Monto − capital", prompt=f"Depositas {C} pesos y al cabo de un año retiras {C + I}. ¿Cuánto interés ganaste?",
                   answer=A_int(I, "pesos"), final=f"{I} pesos")
