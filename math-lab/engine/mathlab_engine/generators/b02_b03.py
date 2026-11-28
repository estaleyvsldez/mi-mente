"""Bloques 02 (sistemas de numeración) y 03 (conjuntos numéricos)."""

from __future__ import annotations

from fractions import Fraction

from ..algorithms.columns import digits_rev, place_name
from ..algorithms.numtheory import to_base, to_base_trace
from ..core.registry import Ctx, generator, mc
from ..core.types import AnswerSpec
from ..numbers.fmt import decimal_str, num, tex
from ..numbers.words import number_to_words
from ._common import A_choice_fixed, A_int, A_multi, cid

L3 = {1: ["base"], 2: ["base"], 3: ["base"]}


# ---------------------------------------------------------------- B02 ------
@generator("b02.valor_posicional", "Valor posicional de una cifra",
           {1: ["valor"], 2: ["valor", "posicion"], 3: ["valor", "posicion"]})
def valor_posicional(c: Ctx):
    digits = c.by_level(3, c.randint(4, 6), c.randint(6, 9))
    n = c.randint(10 ** (digits - 1), 10**digits - 1)
    ds = digits_rev(n)
    # elegimos una posición cuya cifra no sea 0 (evita ambigüedad)
    positions = [i for i, d in enumerate(ds) if d != 0 and ds.count(d) == 1] or c.retry()
    i = c.choice(positions)
    d = ds[i]
    value = d * 10**i
    pname = place_name(i)
    c.step("Localizar la cifra", f"En {n} la cifra {d} ocupa la posición de las **{pname}** "
           f"(contando desde la derecha, posición {i + 1}).", procedure="Lectura del valor posicional",
           prompt=f"¿En qué posición está la cifra {d}? (1 = unidades, 2 = decenas, …)", answer=A_int(i + 1))
    c.step("Calcular su valor", f"Cada posición vale 10 veces más que la anterior. Las {pname} valen "
           f"$10^{{{i}}} = {10**i}$. Valor: ${d} \\times {10**i} = {value}$.",
           why="En el sistema decimal el valor de una cifra depende de su posición (base 10).",
           prompt=f"¿Cuánto vale la cifra {d}?", answer=A_int(value))
    c.mistake("valor_absoluto", "Diste el valor absoluto de la cifra, no su valor posicional",
              "El valor de la cifra depende de su posición: hay que multiplicarla por la potencia de 10 de su lugar.", d, 1)
    c.mistake("posicion_corrida", "Te equivocaste de posición al contar",
              "Cuenta las posiciones desde la derecha: unidades, decenas, centenas…", d * 10 ** (i + 1), 0)
    if i > 0:
        c.mistake("posicion_corrida2", "Te equivocaste de posición al contar",
                  "Cuenta las posiciones desde la derecha empezando por las unidades.", d * 10 ** (i - 1), 0)
    if c.variant == "posicion":
        ans = mc(c, pname, [place_name(j) for j in range(max(0, i - 2), min(len(ds), i + 3)) if j != i][:3])
        return c.build(name="Identificación del valor posicional", procedure="Lectura del valor posicional",
                       prompt=f"En el número **{n}**, ¿qué lugar ocupa la cifra **{d}**?",
                       answer=ans, final=pname, hints=("Cuenta desde la derecha: unidades, decenas, centenas…",))
    return c.build(name="Valor posicional de una cifra", procedure="Lectura del valor posicional",
                   prompt=f"¿Cuál es el **valor posicional** de la cifra **{d}** en el número **{n}**?",
                   answer=A_int(value), final=str(value),
                   hints=("Valor posicional = cifra × (valor de su posición).",))


@generator("b02.descomposicion", "Descomposición de números", {1: ["aditiva"], 2: ["aditiva", "componer"], 3: ["polinomica", "componer"]})
def descomposicion(c: Ctx):
    digits = c.by_level(3, 4, c.randint(5, 7))
    n = c.randint(10 ** (digits - 1), 10**digits - 1)
    ds = digits_rev(n)
    terms = [d * 10**i for i, d in reversed(list(enumerate(ds))) if d]
    add_tex = " + ".join(str(t) for t in terms)
    poly_tex = " + ".join(f"{d} \\times 10^{{{i}}}" if i > 1 else (f"{d} \\times 10" if i == 1 else str(d))
                          for i, d in reversed(list(enumerate(ds))) if d)
    c.step("Separar cada cifra según su posición",
           "Escribimos el valor de cada cifra (cifra × valor de su lugar) y omitimos los ceros.",
           procedure="Descomposición aditiva")
    c.step("Escribir la suma", f"${n} = {add_tex}$", why="Un número es la suma de los valores de sus cifras.")
    if c.variant == "componer":
        shuffled = c.shuffle(terms)
        c.steps.clear()
        c.step("Ordenar por posición", "Ordenamos los sumandos de mayor a menor valor posicional.",
               procedure="Composición de números")
        c.step("Sumar", f"${' + '.join(str(t) for t in terms)} = {n}$",
               why="Cada sumando aporta su cifra a una posición distinta, así que no hay llevadas.",
               prompt="¿Qué número resulta?", answer=A_int(n))
        c.mistake("concatenar", "Uniste las cifras sin respetar los ceros",
                  "Si falta una posición (por ejemplo no hay decenas), en su lugar va un 0.",
                  int("".join(str(t)[0] for t in terms)), 1)
        return c.build(name="Composición de números", procedure="Composición a partir de la descomposición aditiva",
                       prompt=f"¿Qué número es $ {' + '.join(str(t) for t in shuffled)} $?",
                       answer=A_int(n), final=str(n))
    if c.variant == "polinomica":
        c.step("Usar potencias de 10", f"${n} = {poly_tex}$", procedure="Descomposición polinómica")
    # pregunta: ¿cuántas unidades de una posición dada contiene la descomposición?
    i = c.choice([j for j, d in enumerate(ds) if d])
    target = ds[i] * 10**i
    c.step("Identificar el sumando pedido", f"El sumando que corresponde a las {place_name(i)} es {target}.",
           prompt=f"¿Qué sumando corresponde a las {place_name(i)}?", answer=A_int(target))
    return c.build(name="Descomposición de un número", procedure="Descomposición aditiva",
                   prompt=f"Descompón **{n}** en suma de los valores de sus cifras. "
                          f"¿Cuál es el sumando correspondiente a las **{place_name(i)}**?",
                   answer=A_int(target), final=f"{n} = {add_tex}",
                   hints=("Cada cifra vale cifra × 1, × 10, × 100… según su lugar.",))


@generator("b02.lectura", "Lectura y escritura de números", {1: ["leer"], 2: ["leer", "escribir"], 3: ["leer", "escribir"]})
def lectura(c: Ctx):
    digits = c.by_level(c.randint(2, 3), c.randint(4, 6), c.randint(7, 10))
    n = c.randint(10 ** (digits - 1), 10**digits - 1)
    if c.level >= 2 and c.rng.random() < 0.5:  # números con ceros intermedios (más difíciles)
        s = list(str(n))
        for k in c.sample(range(1, len(s)), min(2, len(s) - 1)):
            s[k] = "0"
        n = int("".join(s))
    words = number_to_words(n)
    groups = f"{n:,}".replace(",", " ")
    c.step("Separar en grupos de tres cifras", f"Desde la derecha: **{groups}** (unidades, miles, millones).",
           procedure="Lectura por clases (grupos de tres cifras)",
           why="Cada grupo de tres cifras se lee igual y se le añade su nombre: mil, millones…")
    c.step("Leer cada grupo y su nombre", f"Se lee: **{words}**.")
    if c.variant == "escribir":
        return c.build(name="Escritura de números con cifras", procedure="Escritura por clases",
                       prompt=f"Escribe con cifras: **{words}**", answer=A_int(n), final=str(n),
                       hints=("Si a un grupo le faltan cifras, complétalo con ceros.",))
    return c.build(name="Lectura de números", procedure="Lectura por clases",
                   prompt=f"Escribe con palabras el número **{n}**",
                   answer=AnswerSpec(kind="words", value=words, placeholder="ej.: setenta y cinco"),
                   final=words, hints=("Agrupa de tres en tres desde la derecha.",))


_BASE_NAME = {2: "binario", 8: "octal", 16: "hexadecimal", 10: "decimal"}


@generator("b02.conversion_bases", "Conversión entre sistemas de numeración",
           {1: ["a_decimal_bin", "de_decimal_bin"], 2: ["a_decimal", "de_decimal"], 3: ["a_decimal", "de_decimal", "entre_bases"]})
def conversion_bases(c: Ctx):
    base = 2 if c.variant.endswith("_bin") else c.choice([2, 8, 16])
    n = c.by_level(c.randint(5, 31), c.randint(20, 255), c.randint(100, 4095))
    rep = to_base(n, base)
    bname = _BASE_NAME[base]
    if c.variant.startswith("a_decimal"):
        terms = [f"{int(ch, 16)} \\times {base}^{{{i}}}" for i, ch in enumerate(reversed(rep))]
        values = [int(ch, 16) * base**i for i, ch in enumerate(reversed(rep))]
        c.step("Escribir el valor de cada posición", f"En base {base} cada posición vale {base} veces más: "
               f"$1, {base}, {base**2}, …$", procedure="Conversión a decimal por valor posicional")
        c.step("Multiplicar cada cifra por su potencia", "$" + " + ".join(reversed(terms)) + "$")
        c.step("Sumar", "$" + " + ".join(str(v) for v in reversed(values)) + f" = {n}$",
               prompt="¿Cuál es el resultado en decimal?", answer=A_int(n))
        c.mistake("suma_cifras", "Sumaste las cifras sin multiplicarlas por su valor posicional",
                  "Cada cifra debe multiplicarse por la potencia de la base que corresponde a su lugar.",
                  sum(int(ch, 16) for ch in rep), 1)
        return c.build(name=f"Conversión de {bname} a decimal", procedure="Conversión por valor posicional",
                       prompt=f"Convierte el número {bname} $({rep})_{{{base}}}$ a decimal.",
                       answer=A_int(n), final=str(n),
                       hints=(f"Las posiciones en base {base} valen 1, {base}, {base**2}, … de derecha a izquierda.",))
    if c.variant == "entre_bases":
        src = c.choice([b for b in (2, 8, 16) if b != base])
        srep = to_base(n, src)
        c.step("Pasar a decimal", f"$({srep})_{{{src}}} = {n}$ (multiplicando cada cifra por su potencia de {src}).",
               procedure="Conversión a decimal por valor posicional", prompt="¿Cuánto vale en decimal?", answer=A_int(n))
        trace = to_base_trace(n, base)
        c.step(f"Dividir sucesivamente entre {base}", "; ".join(f"{a} ÷ {base} = {q} resto {r}" for a, q, r in trace),
               procedure="Divisiones sucesivas")
        c.step("Leer los restos de abajo hacia arriba", f"Resultado: $({rep})_{{{base}}}$")
        return c.build(name=f"Conversión de base {src} a base {base}", procedure="Conversión pasando por decimal",
                       prompt=f"Convierte $({srep})_{{{src}}}$ al sistema {bname} (base {base}).",
                       answer=AnswerSpec(kind="token", value=rep), final=rep,
                       hints=("Pasa primero a decimal y luego a la base pedida.",))
    trace = to_base_trace(n, base)
    c.step(f"Dividir entre {base} repetidamente", "Dividimos el número y cada cociente entre la base hasta llegar a 0.",
           procedure="Divisiones sucesivas")
    for a, q, r in trace:
        shown = to_base(r, 16) if base == 16 else str(r)
        c.step(f"{a} ÷ {base}", f"Cociente {q}, resto {r}" + (f" (en hexadecimal: {shown})" if base == 16 and r > 9 else ""))
    c.step("Leer los restos de abajo hacia arriba", f"El primer resto es la cifra de las unidades. Resultado: **{rep}**",
           why=f"Cada división entre {base} separa una posición del número en base {base}.")
    c.mistake("orden_restos", "Leíste los restos en el orden equivocado",
              "Los restos se leen desde el ÚLTIMO hasta el primero.", rep[::-1], len(c.steps) - 1)
    return c.build(name=f"Conversión de decimal a {bname}", procedure="Divisiones sucesivas",
                   prompt=f"Convierte el número decimal **{n}** al sistema {bname} (base {base}).",
                   answer=AnswerSpec(kind="token", value=rep, accepted=() if base != 16 else (rep.lower(),)),
                   final=rep, hints=(f"Divide entre {base} y anota los restos.",))


@generator("b02.sistemas_concepto", "Qué es un sistema de numeración", {1: ["base"], 2: ["cifras"], 3: ["cifras"]})
def sistemas_concepto(c: Ctx):
    base = c.choice([2, 8, 10, 16])
    digits = "0123456789ABCDEF"[:base]
    if c.variant == "base":
        ans = A_int(base)
        c.step("Contar los símbolos", f"El sistema {_BASE_NAME[base]} usa los símbolos {', '.join(digits)}.",
               procedure="Identificación de la base")
        c.step("La base es la cantidad de símbolos", f"Hay {base} símbolos, así que la base es {base}.",
               why="La base indica cuántas unidades de un orden forman una del orden siguiente.")
        return c.build(name="Base de un sistema de numeración", procedure="Identificación de la base",
                       prompt=f"¿Cuántos símbolos distintos (cifras) usa el sistema **{_BASE_NAME[base]}**?",
                       answer=ans, final=str(base))
    # ¿es válido este número en la base?
    valid = c.rng.random() < 0.5
    length = c.randint(3, 5)
    pool = digits if valid else digits + "0123456789ABCDEF"[base: base + 3]
    s = "".join(c.choice(pool[1:] if k == 0 else pool) for k in range(length))
    valid = all(ch in digits for ch in s)
    bad = sorted({ch for ch in s if ch not in digits})
    c.step("Recordar los símbolos permitidos", f"Base {base}: {', '.join(digits)}.", procedure="Validación de cifras")
    c.step("Revisar cada cifra", "Todas las cifras están permitidas." if valid else
           f"La(s) cifra(s) {', '.join(bad)} no existe(n) en base {base}.")
    ans = A_choice_fixed(["Sí", "No"], "Sí" if valid else "No")
    return c.build(name="Validez de un número en una base", procedure="Validación de cifras",
                   prompt=f"¿Es **{s}** un número válido en el sistema {_BASE_NAME[base]} (base {base})?",
                   answer=ans, final="Sí" if valid else "No",
                   hints=(f"En base {base} sólo existen cifras menores que {base}.",))


# ---------------------------------------------------------------- B03 ------
_SETS = ["Natural (ℕ)", "Entero (ℤ)", "Racional (ℚ)", "Irracional (𝕀)", "Real (ℝ)"]


def _random_number(c: Ctx) -> tuple[str, str, set[str]]:
    """(texto LaTeX, descripción, conjuntos a los que pertenece)."""
    kind = c.choice(["nat", "neg", "frac", "dec", "irr_root", "irr_pi", "per", "root_exact"])
    N, Z, Q, I, R = _SETS
    if kind == "nat":
        n = c.randint(1, 500)
        return str(n), "número natural", {N, Z, Q, R}
    if kind == "neg":
        n = -c.randint(1, 500)
        return str(n), "entero negativo", {Z, Q, R}
    if kind == "frac":
        a, b = c.randint(1, 9), c.randint(2, 9)
        if a % b == 0:
            c.retry()
        sign = c.choice(["", "-"])
        return f"{sign}\\frac{{{a}}}{{{b}}}", "fracción no entera", {Q, R}
    if kind == "dec":
        return f"{c.randint(0, 20)}{{,}}{c.randint(1, 99)}", "decimal exacto", {Q, R}
    if kind == "per":
        return f"0{{,}}\\overline{{{c.randint(1, 9)}}}", "decimal periódico", {Q, R}
    if kind == "irr_root":
        n = c.choice([2, 3, 5, 6, 7, 8, 10, 11, 12, 13])
        return f"\\sqrt{{{n}}}", "raíz no exacta", {I, R}
    if kind == "irr_pi":
        return c.choice(["\\pi", "e"]), "constante irracional", {I, R}
    n = c.choice([4, 9, 16, 25, 36, 49])
    return f"\\sqrt{{{n}}}", "raíz exacta (es un natural)", {N, Z, Q, R}


@generator("b03.clasificacion", "Clasificación de los números",
           {1: ["menor"], 2: ["menor", "todos"], 3: ["todos"]})
def clasificacion(c: Ctx):
    t, desc, sets = _random_number(c)
    N, Z, Q, I, R = _SETS
    chain = [s for s in _SETS if s in sets]
    c.step("Observar el número", f"${t}$ es un {desc}.", procedure="Clasificación de números")
    c.step("Recordar la inclusión", "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ y 𝕀 ⊂ ℝ. Los racionales y los irracionales no se mezclan.",
           why="Todo natural es entero, todo entero es racional (n = n/1), y todo racional o irracional es real.")
    if c.variant == "menor":
        smallest = chain[0]
        ans = mc(c, smallest, [s for s in _SETS if s != smallest][:4])
        c.step("Elegir el conjunto más pequeño", f"El conjunto más pequeño que lo contiene es **{smallest}**.")
        return c.build(name="Clasificación de un número", procedure="Clasificación por conjuntos numéricos",
                       prompt=f"¿Cuál es el conjunto numérico **más pequeño** al que pertenece ${t}$?",
                       answer=ans, final=smallest)
    ans = A_multi(_SETS, chain)
    c.step("Marcar todos los conjuntos", "Pertenece a: " + ", ".join(chain))
    c.mistake("solo_uno", "Marcaste sólo un conjunto", "Si un número es natural, también es entero, racional y real.",
              frozenset({cid(ans, chain[0])}), 1)
    return c.build(name="Pertenencia a conjuntos numéricos", procedure="Clasificación por conjuntos numéricos",
                   prompt=f"Marca **todos** los conjuntos a los que pertenece ${t}$.", answer=ans, final=", ".join(chain))


def _rand_rational(c: Ctx, level: int) -> Fraction:
    if level == 1:
        return Fraction(c.randint(-20, 20))
    if level == 2:
        return Fraction(c.randint(-200, 200), c.choice([1, 10, 100]))
    return Fraction(c.randint(-30, 30), c.choice([2, 3, 4, 5, 8, 10]))


def _show(q: Fraction) -> str:
    return tex(q, as_fraction=q.denominator not in (1, 2, 4, 5, 8, 10, 20, 25, 50, 100))


@generator("b03.comparacion", "Comparación y orden de números", {1: ["comparar"], 2: ["comparar", "ordenar"], 3: ["comparar", "ordenar"]})
def comparacion(c: Ctx):
    if c.variant == "comparar":
        a, b = _rand_rational(c, c.level), _rand_rational(c, c.level)
        if a == b and c.rng.random() < 0.7:
            c.retry()
        sym = "<" if a < b else (">" if a > b else "=")
        c.step("Ubicar en la recta numérica", f"Ubicamos ${_show(a)}$ y ${_show(b)}$ en la recta numérica "
               "(si hace falta, los pasamos a decimal o a igual denominador).", procedure="Comparación de números en la recta numérica",
               why="En la recta, un número es mayor que otro si está a su derecha.")
        if a < 0 and b < 0:
            c.step("Cuidado con los negativos", "Entre dos negativos es mayor el que está más cerca del cero.")
        c.step("Escribir el símbolo", f"${_show(a)} {sym} {_show(b)}$")
        ans = A_choice_fixed(["<", "=", ">"], sym)
        if a < 0 and b < 0 and sym != "=":
            c.mistake("negativos_valor_absoluto", "Comparaste los negativos como si fueran positivos",
                      "Entre dos negativos, el que tiene mayor valor absoluto es MENOR (−8 < −3).",
                      cid(ans, ">" if sym == "<" else "<"), 1)
        return c.build(name="Comparación de números", procedure="Comparación en la recta numérica",
                       prompt=f"Elige el símbolo correcto: ${_show(a)} \\;\\square\\; {_show(b)}$",
                       answer=ans, final=sym)
    k = c.by_level(4, 4, 5)
    vals: list[Fraction] = []
    while len(vals) < k:
        v = _rand_rational(c, c.level)
        if v not in vals:
            vals.append(v)
    asc = sorted(vals)
    c.step("Separar negativos y positivos", "Los negativos van primero (a la izquierda del cero).",
           procedure="Ordenación de números")
    c.step("Ordenar", "De menor a mayor: " + " < ".join(f"${_show(v)}$" for v in asc))
    from ._common import A_list

    spec = A_list(asc)
    if any(v.denominator not in (1, 2, 4, 5, 8, 10, 20, 25, 50, 100) for v in vals):
        spec = AnswerSpec(kind="list", value=asc, placeholder="Ej.: -3/2; 1/4; 2")
    c.mistake("orden_valor_absoluto", "Ordenaste por valor absoluto", "Los negativos son menores que el cero.",
              sorted(vals, key=abs), 1)
    return c.build(name="Ordenación de números", procedure="Ordenación en la recta numérica",
                   prompt="Ordena de **menor a mayor**: " + ",\\; ".join(f"${_show(v)}$" for v in c.shuffle(vals)) +
                   "\n\nSepara los números con punto y coma (;).",
                   answer=spec, final="; ".join(num(v) for v in asc))


@generator("b03.recta_numerica", "Recta numérica", {1: ["entre"], 2: ["entre", "punto"], 3: ["punto"]})
def recta_numerica(c: Ctx):
    if c.variant == "entre":
        q = Fraction(c.randint(-40, 40), c.choice([2, 3, 4, 5]))
        if q.denominator == 1:
            c.retry()
        import math

        lo = math.floor(q)
        c.step("Convertir a decimal o número mixto", f"${tex(q, True)} \\approx {num(round(float(q), 2))}$".replace(".", "{,}"),
               procedure="Ubicación en la recta numérica")
        c.step("Encontrar los enteros vecinos", f"Está entre {lo} y {lo + 1}.",
               why="Todo número no entero queda entre dos enteros consecutivos.")
        spec_low = A_int(lo)
        return c.build(name="Ubicación de un número en la recta", procedure="Ubicación entre enteros consecutivos",
                       prompt=f"El número ${tex(q, True)}$ está entre dos enteros consecutivos. ¿Cuál es el **menor** de ellos?",
                       answer=spec_low, final=str(lo),
                       hints=("Si el número es negativo, el entero menor está más a la izquierda (más lejos del 0).",))
    # punto marcado: la recta va de a a b dividida en partes iguales
    parts = c.choice([2, 4, 5, 10])
    a = c.randint(-5, 5)
    k = c.randint(1, parts * 2 - 1)
    val = a + Fraction(k, parts)
    c.step("Calcular el tamaño de cada división", f"Entre {a} y {a + 1} hay {parts} partes iguales: cada una mide $\\frac{{1}}{{{parts}}}$.",
           procedure="Lectura de la recta numérica")
    c.step("Contar divisiones", f"El punto está {k} divisiones a la derecha de {a}: ${a} + \\frac{{{k}}}{{{parts}}} = {tex(val)}$",
           prompt="¿Qué número marca el punto?", answer=AnswerSpec(kind="number", value=val))
    return c.build(name="Lectura de un punto en la recta", procedure="Lectura de la recta numérica",
                   prompt=f"En una recta numérica, cada unidad está dividida en **{parts}** partes iguales. "
                          f"Un punto está **{k}** divisiones a la derecha de **{a}**. ¿Qué número representa?",
                   answer=AnswerSpec(kind="number", value=val), final=num(val),
                   workspace={"type": "numberline", "start": a, "parts": parts, "marks": k})


@generator("b03.representacion", "Representación de números", {1: ["frac_dec"], 2: ["frac_dec", "dec_frac"], 3: ["dec_frac"]})
def representacion(c: Ctx):
    if c.variant == "frac_dec":
        b = c.choice([2, 4, 5, 8, 10, 20, 25])
        a = c.randint(1, b * 3)
        q = Fraction(a, b)
        c.step("Dividir numerador entre denominador", f"${a} \\div {b} = {tex(q)}$", procedure="Conversión de fracción a decimal",
               why="Una fracción es una división indicada.")
        return c.build(name="Representación decimal de una fracción", procedure="División del numerador entre el denominador",
                       prompt=f"Escribe ${tex_frac(a, b)}$ como número decimal.", answer=AnswerSpec(kind="number", value=q, form="decimal"),
                       final=decimal_str(q))
    places = c.choice([1, 2])
    n = c.randint(1, 10**places * 3)
    if n % 10 == 0:
        c.retry()
    q = Fraction(n, 10**places)
    c.step("Escribir como fracción decimal", f"${tex(q)} = \\frac{{{n}}}{{{10**places}}}$", procedure="Conversión de decimal a fracción")
    c.step("Simplificar", f"$= {tex(q, True)}$", why="Dividimos numerador y denominador por su MCD.",
           prompt="Escribe la fracción simplificada", answer=AnswerSpec(kind="number", value=q, form="simplified"))
    return c.build(name="Representación fraccionaria de un decimal", procedure="Fracción decimal y simplificación",
                   prompt=f"Escribe ${tex(q)}$ como fracción **simplificada**.", answer=AnswerSpec(kind="number", value=q, form="simplified"),
                   final=f"{q.numerator}/{q.denominator}", hints=("0,1 = 1/10; 0,01 = 1/100.",))


def tex_frac(a: int, b: int) -> str:
    return f"\\frac{{{a}}}{{{b}}}"


@generator("b03.relacion_conjuntos", "Relación entre conjuntos numéricos", {1: ["vf"], 2: ["vf"], 3: ["vf"]})
def relacion_conjuntos(c: Ctx):
    statements = [
        ("Todo número natural es un número entero.", True, "ℕ ⊂ ℤ."),
        ("Todo número entero es un número natural.", False, "−3 es entero y no es natural."),
        ("Todo número entero es racional.", True, "n = n/1."),
        ("Todo número racional es entero.", False, "1/2 es racional y no es entero."),
        ("Un número puede ser racional e irracional a la vez.", False, "Son conjuntos disjuntos."),
        ("Todo número irracional es real.", True, "𝕀 ⊂ ℝ."),
        ("El 0 es un número entero.", True, "ℤ = {…, −1, 0, 1, …}."),
        ("√9 es un número irracional.", False, "√9 = 3, que es natural."),
        ("√2 es un número racional.", False, "√2 no puede escribirse como fracción de enteros."),
        ("Los decimales periódicos son números racionales.", True, "0,333… = 1/3."),
        ("Entre dos números racionales siempre hay otro número racional.", True, "Por ejemplo, su promedio."),
        ("π es un número racional porque π = 3,14.", False, "3,14 es sólo una aproximación; π es irracional."),
    ]
    text, truth, why = c.choice(statements)
    c.step("Analizar la afirmación", why, procedure="Relación de inclusión entre conjuntos")
    return c.build(name="Relación entre conjuntos numéricos", procedure="Razonamiento sobre inclusión de conjuntos",
                   prompt=f"¿Verdadero o falso? **{text}**", answer=A_choice_fixed(["Verdadero", "Falso"], "Verdadero" if truth else "Falso"),
                   final="Verdadero" if truth else "Falso")
