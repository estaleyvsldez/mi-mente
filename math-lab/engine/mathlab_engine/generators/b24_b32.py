"""Bloques 24 (valor absoluto) a 32 (aplicaciones)."""

from __future__ import annotations

from fractions import Fraction
from math import comb, factorial, perm

from ..core.registry import Ctx, generator, mc
from ..core.types import AnswerSpec
from ..numbers.fmt import decimal_str, fixed_str, num, round_half_up, signed_tex, tex
from ._common import NAMES, A_choice_fixed, A_fields, A_int, A_list, A_num

F = Fraction


# =================================================== VALOR ABSOLUTO (B24) ==


@generator("b24.valor_absoluto", "Concepto de valor absoluto", {1: ["simple"], 2: ["expresion"], 3: ["expresion"]})
def valor_absoluto(c: Ctx):
    if c.variant == "simple":
        a = c.randint(-99, 99)
        c.step("Distancia al cero", f"$|{a}| = {abs(a)}$", procedure="Valor absoluto", why="El valor absoluto es una distancia: nunca es negativo.")
        c.mistake("signo", "Dejaste el signo negativo", "El valor absoluto siempre es ≥ 0.", -abs(a), 0)
        return c.build(name="Valor absoluto", procedure="Valor absoluto como distancia al cero", prompt=f"Calcula: $|{a}|$", answer=A_int(abs(a)), final=str(abs(a)))
    a, b = c.randint(-20, 20), c.randint(-20, 20)
    form = c.choice(["suma_dentro", "resta_fuera"])
    if form == "suma_dentro":
        val = abs(a + b)
        c.step("Operar dentro", f"${signed_tex(a)} + {signed_tex(b)} = {a + b}$", procedure="Valor absoluto de una expresión", prompt="¿Valor dentro de las barras?", answer=A_int(a + b))
        c.step("Valor absoluto", f"$|{a + b}| = {val}$")
        c.mistake("separado", "Aplicaste el valor absoluto a cada término", "|a + b| no es |a| + |b| en general.", abs(a) + abs(b), 0)
        return c.build(name="Valor absoluto de una expresión", procedure="Operar dentro y luego valor absoluto", prompt=f"Calcula: $|{signed_tex(a)} + {signed_tex(b)}|$",
                       answer=A_int(val), final=str(val))
    val = abs(a) - abs(b)
    c.step("Valores absolutos", f"$|{a}| = {abs(a)}$, $|{b}| = {abs(b)}$", procedure="Operaciones con valores absolutos")
    c.step("Restar", f"${abs(a)} - {abs(b)} = {val}$")
    return c.build(name="Operaciones con valor absoluto", procedure="Valor absoluto y resta", prompt=f"Calcula: $|{a}| - |{b}|$", answer=A_int(val), final=str(val))


@generator("b24.distancia", "Distancia al cero y entre números", {1: ["al_cero"], 2: ["entre"], 3: ["entre"]})
def distancia(c: Ctx):
    if c.variant == "al_cero":
        a = c.randint(-50, 50)
        c.step("Contar unidades hasta 0", f"{a} está a {abs(a)} unidades del cero.", procedure="Distancia al cero")
        return c.build(name="Distancia al cero", procedure="Valor absoluto", prompt=f"¿A qué distancia del cero está {a} en la recta numérica?", answer=A_int(abs(a)), final=str(abs(a)))
    a, b = c.randint(-40, 40), c.randint(-40, 40)
    if a == b:
        c.retry()
    d = abs(a - b)
    c.step("Distancia = |a − b|", f"$|{signed_tex(a)} - {signed_tex(b)}| = |{a - b}| = {d}$", procedure="Distancia entre dos números")
    c.mistake("resta_abs", "Restaste los valores absolutos", "Si están a lados distintos del cero, las distancias se suman.", abs(abs(a) - abs(b)), 0)
    return c.build(name="Distancia entre dos números", procedure="|a − b|", prompt=f"¿Cuál es la distancia entre {a} y {b} en la recta numérica?", answer=A_int(d), final=str(d))


@generator("b24.valor_absoluto_recta", "Valor absoluto en la recta numérica", {1: ["base"], 2: ["base"], 3: ["base"]})
def valor_absoluto_recta(c: Ctx):
    k = c.randint(1, 30)
    c.step("Dos números a la misma distancia", f"Los números a distancia {k} del cero son {-k} y {k}.", procedure="Ecuación |x| = k")
    return c.build(name="Números con un valor absoluto dado", procedure="Simetría respecto al cero", prompt=f"Escribe los números cuyo valor absoluto es {k} (sepáralos con ;).",
                   answer=A_list([-k, k], ordered=False), final=f"{-k}; {k}")


@generator("b24.positivos_negativos", "Números positivos y negativos", {1: ["contexto"], 2: ["contexto"], 3: ["contexto"]})
def positivos_negativos(c: Ctx):
    bank = [("una temperatura de {n} grados bajo cero", -1), ("un edificio con {n} sótanos (el más profundo)", -1), ("una deuda de {n} pesos", -1),
            ("subir {n} pisos", 1), ("una altitud de {n} metros sobre el nivel del mar", 1), ("{n} metros bajo el nivel del mar", -1), ("ganar {n} puntos", 1)]
    t, s = c.choice(bank)
    n = c.randint(2, 50)
    c.step("Interpretar", "Por debajo de una referencia, deudas o pérdidas → negativo; por encima o ganancias → positivo.", procedure="Números relativos en contexto")
    return c.build(name="Números relativos en contexto", procedure="Representación con signo", prompt=f"Representa con un número entero: **{t.format(n=n)}**.",
                   answer=A_int(s * n), final=str(s * n))


@generator("b24.operaciones_relativos", "Operaciones con números relativos", {1: ["suma_resta"], 2: ["mult_div"], 3: ["combinada"]})
def operaciones_relativos(c: Ctx):
    a, b, d = c.randint(-15, 15) or 3, c.randint(-15, 15) or -4, c.randint(-6, 6) or 2
    if c.variant == "suma_resta":
        val = a - b + d
        expr = f"{signed_tex(a)} - {signed_tex(b)} + {signed_tex(d)}"
        c.step("Restar = sumar el opuesto", f"${signed_tex(a)} + {signed_tex(-b)} + {signed_tex(d)}$", procedure="Suma algebraica de enteros")
        c.step("Sumar", f"$= {val}$", prompt="¿Resultado?", answer=A_int(val))
        c.mistake("sin_opuesto", "No cambiaste el signo al restar", "a − (−b) = a + b.", a + b + d, 0)
    elif c.variant == "mult_div":
        val = a * d
        expr = f"{signed_tex(a * d * b)} \\div {signed_tex(b)}" if b else ""
        val = a * d
        c.step("Regla de los signos", "Signos iguales → +; distintos → −.", procedure="Multiplicación y división de enteros")
        c.step("Dividir", f"$= {val}$")
        c.mistake("signo", "Signo incorrecto", "Revisa la regla de los signos.", -val, 0)
    else:
        val = a + b * d
        expr = f"{signed_tex(a)} + {signed_tex(b)} \\times {signed_tex(d)}"
        c.step("Primero la multiplicación", f"${signed_tex(b)} \\times {signed_tex(d)} = {b * d}$", procedure="Jerarquía con enteros", prompt="¿Producto?", answer=A_int(b * d))
        c.step("Luego la suma", f"${signed_tex(a)} + {signed_tex(b * d)} = {val}$")
        c.mistake("izq_der", "Sumaste primero", "La multiplicación va antes.", (a + b) * d, 0)
    return c.build(name="Operaciones con números relativos", procedure="Operaciones con enteros", prompt=f"Calcula: ${expr}$", answer=A_int(val), final=str(val))


@generator("b24.aplicaciones_relativos", "Aplicaciones de los números relativos", {1: ["temperatura"], 2: ["altitud"], 3: ["cuenta"]})
def aplicaciones_relativos(c: Ctx):
    if c.variant == "temperatura":
        t1, d = c.randint(-10, 10), c.randint(3, 15)
        t2 = t1 - d
        c.step("Bajar es restar", f"${signed_tex(t1)} - {d} = {t2}$", procedure="Variación de temperatura")
        return c.build(name="Temperaturas", procedure="Resta de enteros", prompt=f"La temperatura era de {t1} °C y bajó {d} grados. ¿Qué temperatura hace ahora?",
                       answer=A_int(t2, "°C"), final=f"{t2} °C")
    if c.variant == "altitud":
        up, down = c.randint(100, 3000), -c.randint(10, 400)
        c.step("Diferencia de altitudes", f"${up} - ({down}) = {up - down}$", procedure="Distancia entre enteros")
        return c.build(name="Altitudes", procedure="Resta de enteros", prompt=f"Un avión vuela a {up} m y un submarino está a {down} m. ¿Cuántos metros los separan verticalmente?",
                       answer=A_int(up - down, "m"), final=f"{up - down} m")
    s = c.randint(-200, 500)
    movs = [c.choice([-1, 1]) * c.randint(20, 300) for _ in range(3)]
    fin = s + sum(movs)
    c.step("Sumar movimientos", f"{s} " + " ".join(f"{'+' if m > 0 else '−'} {abs(m)}" for m in movs) + f" = {fin}", procedure="Suma de enteros")
    return c.build(name="Saldo de una cuenta", procedure="Suma de enteros", prompt=f"Una cuenta tiene un saldo de {s} pesos. Se hacen los movimientos {', '.join(f'{m:+d}' for m in movs)}. ¿Saldo final?",
                   answer=A_int(fin, "pesos"), final=f"{fin} pesos")


# ======================================== APROXIMACIONES Y ESTIMACIONES (B25) ==


@generator("b25.redondeo_naturales", "Redondeo", {1: ["decenas"], 2: ["centenas", "millares"], 3: ["millares", "decimales"]})
def redondeo_naturales(c: Ctx):
    if c.variant == "decimales":
        v = F(c.randint(10000, 999999), 1000)
        p = c.choice([1, 2])
        r = round_half_up(v, p)
        c.step("Mirar la cifra siguiente", f"{decimal_str(v)} → {fixed_str(v, p)}", procedure="Redondeo de decimales")
        return c.build(name="Redondeo de decimales", procedure="Redondeo", prompt=f"Redondea {decimal_str(v)} a las {'décimas' if p == 1 else 'centésimas'}.",
                       answer=A_num(r), final=fixed_str(v, p))
    place = {"decenas": 10, "centenas": 100, "millares": 1000}[c.variant]
    n = c.randint(place * 2, place * 100)
    r = ((n + place // 2) // place) * place
    nxt = (n // (place // 10)) % 10
    c.step("Mirar la cifra de la derecha", f"La cifra siguiente a las {c.variant} es {nxt}.", procedure="Redondeo de naturales", prompt="¿Cifra siguiente?", answer=A_int(nxt))
    c.step("Decidir", f"{nxt} {'≥ 5 → sube' if nxt >= 5 else '< 5 → se queda'}: {r}")
    c.mistake("truncar", "Truncaste", "Si la cifra siguiente es 5 o más, se redondea hacia arriba.", n // place * place, 1)
    return c.build(name="Redondeo de naturales", procedure="Redondeo", prompt=f"Redondea {n} a las {c.variant if c.variant != 'millares' else 'unidades de millar'}.",
                   answer=A_int(r), final=str(r))


@generator("b25.truncamiento", "Truncamiento", {1: ["base"], 2: ["base"], 3: ["comparar"]})
def truncamiento(c: Ctx):
    v = F(c.randint(10000, 999999), 1000)
    p = c.choice([0, 1, 2])
    t = F(int(v * 10**p), 10**p)
    if c.variant == "comparar":
        r = round_half_up(v, p)
        same = r == t
        c.step("Truncar y redondear", f"Truncado: {decimal_str(t) if t.denominator > 1 else t}; redondeado: {decimal_str(r) if r.denominator > 1 else r}", procedure="Truncamiento vs redondeo")
        return c.build(name="Truncar vs. redondear", procedure="Comparación", prompt=f"¿Coinciden el truncamiento y el redondeo de {decimal_str(v)} a {p} decimales?",
                       answer=A_choice_fixed(["Sí", "No"], "Sí" if same else "No"), final="Sí" if same else "No")
    c.step("Cortar sin mirar la siguiente cifra", f"{decimal_str(v)} → {decimal_str(t) if t.denominator > 1 else t}", procedure="Truncamiento",
           why="Truncar es eliminar las cifras siguientes sin redondear.")
    c.mistake("redondeo", "Redondeaste en vez de truncar", "Truncar es cortar: no se mira la cifra siguiente.", round_half_up(v, p), 0)
    return c.build(name="Truncamiento", procedure="Truncamiento", prompt=f"Trunca {decimal_str(v)} a {p} cifra(s) decimal(es).", answer=A_num(t), final=num(t))


@generator("b25.estimacion", "Estimación", {1: ["suma"], 2: ["producto"], 3: ["cociente"]})
def estimacion(c: Ctx):
    if c.variant == "suma":
        a, b = c.randint(100, 999), c.randint(100, 999)
        ra, rb = round(a, -2), round(b, -2)
        ra, rb = (a + 50) // 100 * 100, (b + 50) // 100 * 100
        est = ra + rb
        c.step("Redondear a centenas", f"{a} ≈ {ra}; {b} ≈ {rb}", procedure="Estimación por redondeo")
        c.step("Operar", f"{ra} + {rb} = {est}", prompt="¿Estimación?", answer=A_int(est))
        return c.build(name="Estimación de una suma", procedure="Redondeo a centenas", prompt=f"Estima {a} + {b} redondeando cada número a las centenas.", answer=A_int(est), final=str(est))
    if c.variant == "producto":
        a, b = c.randint(11, 99), c.randint(11, 99)
        ra, rb = (a + 5) // 10 * 10, (b + 5) // 10 * 10
        est = ra * rb
        c.step("Redondear a decenas", f"{a} ≈ {ra}; {b} ≈ {rb}", procedure="Estimación por redondeo")
        c.step("Operar", f"{ra} × {rb} = {est}", prompt="¿Estimación?", answer=A_int(est))
        return c.build(name="Estimación de un producto", procedure="Redondeo a decenas", prompt=f"Estima {a} × {b} redondeando cada número a las decenas.", answer=A_int(est), final=str(est))
    d = c.randint(2, 9) * 10
    q = c.randint(5, 40)
    D = d * q + c.randint(-d // 3, d // 3)
    ans_q = q
    c.step("Números compatibles", f"{D} ≈ {d * q}, que es divisible entre {d}.", procedure="Estimación con números compatibles")
    c.step("Dividir", f"{d * q} ÷ {d} = {q}")
    return c.build(name="Estimación de un cociente", procedure="Números compatibles", prompt=f"Estima {D} ÷ {d} usando un número compatible cercano a {D} (múltiplo de {d}).",
                   answer=A_int(ans_q), final=str(ans_q))


@generator("b25.cifras_significativas", "Cifras significativas", {1: ["contar"], 2: ["contar"], 3: ["redondear"]})
def cifras_significativas(c: Ctx):
    if c.variant == "redondear":
        n = c.randint(10000, 999999)
        k = c.choice([2, 3])
        digits = len(str(n))
        r = round_half_up(F(n, 10 ** (digits - k)), 0) * 10 ** (digits - k)
        c.step("Conservar las primeras cifras", f"Primeras {k} cifras de {n} y redondeo: {int(r)}", procedure="Redondeo a cifras significativas")
        return c.build(name="Redondeo a cifras significativas", procedure="Cifras significativas", prompt=f"Redondea {n} a {k} cifras significativas.", answer=A_int(int(r)), final=str(int(r)))
    kind = c.choice(["entero", "decimal_ceros", "ceros_medio"])
    if kind == "entero":
        s = str(c.randint(1, 9)) + "".join(str(c.randint(1, 9)) for _ in range(c.randint(1, 4)))
        count = len(s)
        why = "Todas las cifras distintas de cero son significativas."
    elif kind == "decimal_ceros":
        z = c.randint(1, 3)
        sig = str(c.randint(1, 9)) + "".join(str(c.randint(0, 9)) for _ in range(c.randint(0, 2)))
        s = "0," + "0" * z + sig
        count = len(sig)
        why = "Los ceros a la izquierda (antes de la primera cifra no nula) NO son significativos."
    else:
        s = f"{c.randint(1, 9)}0{c.randint(1, 9)}"
        if c.rng.random() < 0.5:
            s += f",{c.randint(1, 9)}0"
        count = len(s.replace(",", ""))
        why = "Los ceros entre cifras no nulas, y los ceros finales tras la coma, sí son significativos."
    c.step("Regla", why, procedure="Conteo de cifras significativas")
    return c.build(name="Cifras significativas", procedure="Conteo de cifras significativas", prompt=f"¿Cuántas cifras significativas tiene **{s}**?", answer=A_int(count), final=str(count))


@generator("b25.errores", "Error absoluto y error relativo", {1: ["absoluto"], 2: ["relativo"], 3: ["relativo_porcentual"]})
def errores(c: Ctx):
    real = F(c.randint(100, 2000), 10)
    approx = real + F(c.choice([-1, 1]) * c.randint(1, 30), 10)
    ea = abs(real - approx)
    c.step("Error absoluto", f"$E_a = |{tex(real)} - {tex(approx)}| = {tex(ea)}$", procedure="Error absoluto", prompt="¿Error absoluto?", answer=A_num(ea))
    if c.variant == "absoluto":
        return c.build(name="Error absoluto", procedure="|valor real − aproximación|", prompt=f"El valor real es {decimal_str(real)} y se midió {decimal_str(approx)}. ¿Cuál es el error absoluto?",
                       answer=A_num(ea), final=decimal_str(ea))
    er = ea / real
    if c.variant == "relativo":
        r = round_half_up(er, 3)
        c.step("Error relativo", f"$E_r = \\frac{{E_a}}{{\\text{{real}}}} = \\frac{{{tex(ea)}}}{{{tex(real)}}} \\approx {tex(r)}$", why="Mide el error en proporción al tamaño de la medida.")
        return c.build(name="Error relativo", procedure="Error absoluto ÷ valor real", prompt=f"Valor real {decimal_str(real)}, medido {decimal_str(approx)}. Calcula el error relativo redondeado a 3 decimales.",
                       answer=A_num(r), final=decimal_str(r))
    r = round_half_up(er * 100, 1)
    c.step("Error relativo porcentual", f"$E_r \\times 100 \\approx {tex(r)}\\%$")
    return c.build(name="Error relativo porcentual", procedure="E_r × 100", prompt=f"Valor real {decimal_str(real)}, medido {decimal_str(approx)}. ¿Error relativo en %, redondeado a 1 decimal?",
                   answer=A_num(r, unit="%"), final=f"{fixed_str(r, 1)} %")


@generator("b25.aproximacion_concepto", "Aproximación", {1: ["por_defecto"], 2: ["por_exceso"], 3: ["por_defecto", "por_exceso"]})
def aproximacion_concepto(c: Ctx):
    v = F(c.randint(1000, 99999), 100)
    if c.variant == "por_defecto":
        r = F(int(v * 10), 10)
        c.step("Por defecto (menor)", f"La aproximación por defecto a las décimas es {decimal_str(r)}.", procedure="Aproximación por defecto")
        return c.build(name="Aproximación por defecto", procedure="Aproximación por defecto", prompt=f"Aproxima {decimal_str(v)} por defecto a las décimas.", answer=A_num(r), final=decimal_str(r))
    r = F(int(v * 10) + (0 if (v * 10).denominator == 1 else 1), 10)
    c.step("Por exceso (mayor)", f"La aproximación por exceso a las décimas es {decimal_str(r) if r.denominator > 1 else r}.", procedure="Aproximación por exceso")
    return c.build(name="Aproximación por exceso", procedure="Aproximación por exceso", prompt=f"Aproxima {decimal_str(v)} por exceso a las décimas.", answer=A_num(r), final=num(r))


@generator("b25.aplicaciones_aproximacion", "Aplicaciones prácticas de las aproximaciones", {1: ["compra"], 2: ["compra"], 3: ["compra"]})
def aplicaciones_aproximacion(c: Ctx):
    prices = [F(c.randint(100, 2000), 100) for _ in range(4)]
    est = sum(round_half_up(p, 0) for p in prices)
    c.step("Redondear cada precio a pesos enteros", ", ".join(f"{decimal_str(p)}→{round_half_up(p, 0)}" for p in prices), procedure="Estimación de una compra")
    c.step("Sumar", f"≈ {est}", prompt="¿Estimación?", answer=A_int(int(est)))
    return c.build(name="Estimar una compra", procedure="Redondeo y suma", prompt="En el supermercado llevas productos de " + ", ".join(decimal_str(p) for p in prices) +
                   " pesos. Estima el total redondeando cada precio a pesos enteros.", answer=A_int(int(est)), final=str(est))


# ================================================ NOTACIÓN CIENTÍFICA (B26) ==


def _sci(c: Ctx, big: bool) -> tuple[Fraction, Fraction, int]:
    m = F(c.randint(100, 999), 100)
    e = c.randint(3, 9) if big else -c.randint(2, 7)
    return m * F(10) ** e, m, e


def _sci_tex(m: Fraction, e: int) -> str:
    return f"{tex(m)} \\times 10^{{{e}}}"


@generator("b26.a_cientifica", "Conversión a notación científica", {1: ["grande"], 2: ["pequeno", "grande"], 3: ["pequeno"]})
def a_cientifica(c: Ctx):
    v, m, e = _sci(c, c.variant == "grande")
    s = decimal_str(v)
    c.step("Colocar la coma tras la primera cifra no nula", f"Mantisa: {decimal_str(m)} (entre 1 y 10).", procedure="Conversión a notación científica",
           prompt="¿Mantisa?", answer=A_num(m))
    c.step("Contar posiciones que se movió la coma", f"La coma se movió {abs(e)} lugares → exponente {e}.",
           why="Mover la coma a la izquierda aumenta el exponente; a la derecha, lo disminuye.", prompt="¿Exponente?", answer=A_int(e))
    spec = A_fields(("mantisa", "Mantisa", A_num(m)), ("exp", "Exponente de 10", A_int(e)))
    c.mistake("signo_exp", "Signo del exponente incorrecto", "Números pequeños (< 1) tienen exponente negativo.", {"mantisa": m, "exp": -e}, 1)
    c.mistake("mantisa_mal", "La mantisa no está entre 1 y 10", "La mantisa debe tener una sola cifra entera distinta de cero.", {"mantisa": m * 10, "exp": e - 1}, 0)
    return c.build(name="Notación científica", procedure="Conversión a notación científica", prompt=f"Escribe **{s}** en notación científica: $a \\times 10^n$ con $1 \\le a < 10$.",
                   answer=spec, final=f"{decimal_str(m)} × 10^{e}")


@generator("b26.a_decimal", "Conversión a notación decimal", {1: ["grande"], 2: ["pequeno"], 3: ["pequeno", "grande"]})
def a_decimal(c: Ctx):
    v, m, e = _sci(c, c.variant == "grande")
    c.step("Mover la coma", f"Exponente {e}: mover la coma {abs(e)} lugares a la {'derecha' if e > 0 else 'izquierda'}.", procedure="Conversión a notación decimal")
    c.step("Resultado", decimal_str(v))
    return c.build(name="Notación decimal", procedure="Conversión desde notación científica", prompt=f"Escribe ${_sci_tex(m, e)}$ en notación decimal (sin potencias).",
                   answer=AnswerSpec(kind="number", value=v, form="any"), final=decimal_str(v))


@generator("b26.operaciones_cientifica", "Operaciones en notación científica", {1: ["producto"], 2: ["cociente", "producto"], 3: ["suma"]})
def operaciones_cientifica(c: Ctx):
    a, b = c.randint(1, 9), c.randint(1, 9)
    e1, e2 = c.randint(-6, 9), c.randint(-6, 9)
    if c.variant == "producto":
        m, e = a * b, e1 + e2
        op = "\\times"
        rule = "Se multiplican las mantisas y se SUMAN los exponentes."
    elif c.variant == "cociente":
        m, e = F(a * b, b), e1 - e2
        a = a * b
        if a >= 10:
            # usamos mantisa decimal
            pass
        op = "\\div"
        rule = "Se dividen las mantisas y se RESTAN los exponentes."
    else:
        e2 = e1
        m, e = a + b, e1
        op = "+"
        rule = "Con el mismo exponente, se suman las mantisas."
    mm, ee = F(m), e
    while mm >= 10:
        mm /= 10
        ee += 1
    c.step("Regla", rule, procedure="Operaciones con notación científica")
    c.step("Calcular", f"Mantisa {num(F(m))}, exponente {e}")
    if F(m) >= 10:
        c.step("Ajustar la mantisa", f"${num(F(m))} \\times 10^{{{e}}} = {tex(mm)} \\times 10^{{{ee}}}$", why="La mantisa debe quedar entre 1 y 10.")
    am = F(a) if c.variant != "cociente" else F(a)
    expr = f"({tex(am)} \\times 10^{{{e1}}}) {op} ({b} \\times 10^{{{e2}}})"
    if F(a) >= 10:
        expr = f"({tex(F(a, 10))} \\times 10^{{{e1 + 1}}}) {op} ({b} \\times 10^{{{e2}}})"
    spec = A_fields(("mantisa", "Mantisa", A_num(mm)), ("exp", "Exponente de 10", A_int(ee)))
    if c.variant == "producto":
        c.mistake("multiplica_exp", "Multiplicaste los exponentes", "En el producto los exponentes se SUMAN.", {"mantisa": mm, "exp": ee - e + e1 * e2}, 0)
    return c.build(name="Operaciones en notación científica", procedure="Operar mantisas y exponentes", prompt=f"Calcula y da el resultado en notación científica: ${expr}$",
                   answer=spec, final=f"{num(mm)} × 10^{ee}")


@generator("b26.potencias_10_cientifica", "Potencias de 10 en notación científica", {1: ["base"], 2: ["base"], 3: ["base"]})
def potencias_10_cientifica(c: Ctx):
    words = [("mil", 3), ("un millón", 6), ("mil millones", 9), ("un billón", 12), ("una décima", -1), ("una centésima", -2), ("una milésima", -3), ("una millonésima", -6)]
    w, e = c.choice(words)
    c.step("Contar ceros o posiciones", f"{w} = $10^{{{e}}}$", procedure="Potencias de 10")
    return c.build(name="Potencias de 10", procedure="Escritura como potencia de 10", prompt=f"¿A qué exponente hay que elevar 10 para obtener **{w}**?", answer=A_int(e), final=str(e))


@generator("b26.aplicaciones_cientifica", "Aplicaciones en ciencia y tecnología", {1: ["comparar"], 2: ["comparar"], 3: ["cociente"]})
def aplicaciones_cientifica(c: Ctx):
    if c.variant == "comparar":
        e1, e2 = c.sample(range(-9, 12), 2)
        m1, m2 = c.randint(1, 9), c.randint(1, 9)
        bigger = "A" if m1 * F(10) ** e1 > m2 * F(10) ** e2 else "B"
        c.step("Comparar exponentes primero", f"10^{e1} vs 10^{e2}", procedure="Comparación en notación científica")
        return c.build(name="Comparar magnitudes", procedure="Comparación de exponentes", prompt=f"¿Qué cantidad es mayor? A = ${m1} \\times 10^{{{e1}}}$, B = ${m2} \\times 10^{{{e2}}}$",
                       answer=A_choice_fixed(["A", "B"], bigger), final=bigger)
    # tiempo de la luz: distancia / velocidad, con números redondos
    d_e = c.randint(9, 12)
    t = F(10) ** d_e / (3 * 10**8)
    t_r = round_half_up(t, 0)
    c.step("Tiempo = distancia ÷ velocidad", f"$\\frac{{10^{{{d_e}}}}}{{3 \\times 10^8}} = \\frac{{1}}{{3}} \\times 10^{{{d_e - 8}}}$", procedure="Cociente en notación científica")
    c.step("Calcular", f"≈ {t_r} segundos")
    return c.build(name="Aplicación: velocidad de la luz", procedure="Cociente con potencias de 10",
                   prompt=f"La luz viaja a $3 \\times 10^8$ m/s. ¿Cuántos segundos tarda en recorrer $10^{{{d_e}}}$ m? (redondea a las unidades)",
                   answer=A_int(int(t_r), "s"), final=f"{t_r} s")


@generator("b26.concepto_cientifica", "Concepto de notación científica", {1: ["identificar"], 2: ["identificar"], 3: ["identificar"]})
def concepto_cientifica(c: Ctx):
    e = c.randint(-5, 8)
    good = f"{c.randint(1, 9)},{c.randint(1, 9)} × 10^{e}"
    bad = [f"{c.randint(10, 99)},{c.randint(1, 9)} × 10^{e}", f"0,{c.randint(1, 9)} × 10^{e}", f"{c.randint(1, 9)},{c.randint(1, 9)} × 5^{e}"]
    ans = mc(c, good, bad)
    c.step("Condiciones", "a × 10ⁿ con 1 ≤ a < 10 y n entero.", procedure="Definición de notación científica")
    return c.build(name="Notación científica correcta", procedure="Definición", prompt="¿Cuál está correctamente escrita en notación científica?", answer=ans, final=good)


# =========================================== SISTEMAS DE UNIDADES (B27) ====

_LEN = {"km": 1000, "hm": 100, "dam": 10, "m": 1, "dm": F(1, 10), "cm": F(1, 100), "mm": F(1, 1000)}
_MASS = {"kg": 1000, "hg": 100, "dag": 10, "g": 1, "dg": F(1, 10), "cg": F(1, 100), "mg": F(1, 1000)}
_CAP = {"kL": 1000, "hL": 100, "daL": 10, "L": 1, "dL": F(1, 10), "cL": F(1, 100), "mL": F(1, 1000)}


def _convert(c: Ctx, table: dict, name: str, procedure: str):
    units = list(table)
    gap = c.by_level(1, 2, 3)
    i = c.randint(0, len(units) - 1 - gap) if c.rng.random() < 0.5 else c.randint(gap, len(units) - 1)
    j = i + gap if i + gap < len(units) and c.rng.random() < 0.5 else max(0, i - gap)
    if i == j:
        c.retry()
    a, b = units[i], units[j]
    v = F(c.randint(1, 999), c.choice([1, 10]))
    res = v * F(table[a]) / F(table[b])
    factor = F(table[a]) / F(table[b])
    c.step("Contar escalones", f"De {a} a {b} hay {abs(i - j)} escalón(es) {'hacia abajo (× 10 por escalón)' if factor > 1 else 'hacia arriba (÷ 10 por escalón)'}.",
           procedure=procedure, why="En el sistema métrico cada unidad es 10 veces la siguiente.")
    c.step("Multiplicar o dividir", f"{decimal_str(v) if v.denominator > 1 else v} {a} × {num(factor)} = {num(res)} {b}", prompt="¿Resultado?", answer=A_num(res))
    c.mistake("al_reves", "Multiplicaste en lugar de dividir (o al revés)", "A una unidad más pequeña → el número crece; a una mayor → decrece.", v / factor, 1)
    return c.build(name=f"Conversión de {name}", procedure=procedure, prompt=f"Convierte {num(v)} {a} a {b}.", answer=A_num(res, unit=b), final=f"{num(res)} {b}")


@generator("b27.longitud", "Longitud", {1: ["base"], 2: ["base"], 3: ["base"]})
def longitud(c: Ctx):
    return _convert(c, _LEN, "longitud", "Conversión de unidades de longitud")


@generator("b27.masa", "Masa", {1: ["base"], 2: ["base"], 3: ["base"]})
def masa(c: Ctx):
    return _convert(c, _MASS, "masa", "Conversión de unidades de masa")


@generator("b27.capacidad", "Capacidad", {1: ["base"], 2: ["base"], 3: ["base"]})
def capacidad(c: Ctx):
    return _convert(c, _CAP, "capacidad", "Conversión de unidades de capacidad")


@generator("b27.tiempo", "Tiempo", {1: ["simple"], 2: ["compuesto"], 3: ["a_horas_minutos"]})
def tiempo(c: Ctx):
    if c.variant == "simple":
        conv = c.choice([("horas", "minutos", 60), ("minutos", "segundos", 60), ("días", "horas", 24), ("semanas", "días", 7), ("horas", "segundos", 3600)])
        a, b, k = conv
        v = c.randint(2, 12)
        c.step("Factor", f"1 {a[:-1] if a.endswith('s') else a} = {k} {b}", procedure="Conversión de unidades de tiempo (sistema sexagesimal)")
        c.step("Multiplicar", f"{v} × {k} = {v * k}")
        return c.build(name="Conversión de tiempo", procedure="Unidades de tiempo", prompt=f"¿Cuántos {b} hay en {v} {a}?", answer=A_int(v * k, b), final=f"{v * k} {b}")
    if c.variant == "compuesto":
        h, m = c.randint(1, 9), c.randint(1, 59)
        c.step("Pasar horas a minutos", f"{h} h = {h * 60} min", procedure="Conversión de tiempo compuesta", prompt="¿Minutos de las horas?", answer=A_int(h * 60))
        c.step("Sumar", f"{h * 60} + {m} = {h * 60 + m} min")
        c.mistake("por_100", "Usaste 100 minutos por hora", "Una hora tiene 60 minutos (sistema sexagesimal).", h * 100 + m, 0)
        return c.build(name="Horas y minutos a minutos", procedure="Sistema sexagesimal", prompt=f"¿Cuántos minutos son {h} h {m} min?", answer=A_int(h * 60 + m, "min"), final=f"{h * 60 + m} min")
    total = c.randint(61, 600)
    h, m = divmod(total, 60)
    c.step("Dividir entre 60", f"{total} ÷ 60 = {h}, resto {m}", procedure="Conversión a forma compleja")
    c.mistake("decimal", "Interpretaste como decimal", "Se divide entre 60, no entre 100.", {"h": total // 100, "m": total % 100}, 0)
    return c.build(name="Minutos a horas y minutos", procedure="División entre 60", prompt=f"Expresa {total} minutos en horas y minutos.",
                   answer=A_fields(("h", "Horas", A_int(h)), ("m", "Minutos", A_int(m))), final=f"{h} h {m} min")


@generator("b27.temperatura", "Temperatura", {1: ["c_a_k"], 2: ["c_a_f", "f_a_c"], 3: ["f_a_c"]})
def temperatura(c: Ctx):
    if c.variant == "c_a_k":
        t = c.randint(-50, 100)
        c.step("K = °C + 273,15", f"{t} + 273,15 = {decimal_str(t + F(27315, 100))}", procedure="Conversión Celsius–Kelvin")
        return c.build(name="Celsius a Kelvin", procedure="K = °C + 273,15", prompt=f"Convierte {t} °C a kelvin.", answer=A_num(t + F(27315, 100), unit="K"), final=f"{decimal_str(t + F(27315, 100))} K")
    if c.variant == "c_a_f":
        t = c.randint(-8, 20) * 5
        f = F(9, 5) * t + 32
        c.step("°F = °C × 9/5 + 32", f"{t} × 9/5 = {num(F(9, 5) * t)}; + 32 = {num(f)}", procedure="Conversión Celsius–Fahrenheit", prompt=f"¿{t} × 9/5?", answer=A_num(F(9, 5) * t))
        c.mistake("sin_32", "Olvidaste sumar 32", "La escala Fahrenheit tiene su cero desplazado.", F(9, 5) * t, 0)
        return c.build(name="Celsius a Fahrenheit", procedure="°F = 9/5·°C + 32", prompt=f"Convierte {t} °C a °F.", answer=A_num(f, unit="°F"), final=f"{num(f)} °F")
    cel = c.randint(-8, 20) * 5
    f = int(F(9, 5) * cel + 32)
    c.step("°C = (°F − 32) × 5/9", f"({f} − 32) × 5/9 = {cel}", procedure="Conversión Fahrenheit–Celsius", prompt=f"¿{f} − 32?", answer=A_int(f - 32))
    c.mistake("orden", "Multiplicaste antes de restar 32", "Primero se resta 32 y luego se multiplica por 5/9.", F(5, 9) * f - 32, 0)
    return c.build(name="Fahrenheit a Celsius", procedure="°C = (°F − 32)·5/9", prompt=f"Convierte {f} °F a °C.", answer=A_num(cel, unit="°C"), final=f"{cel} °C")


@generator("b27.superficie", "Superficie", {1: ["m2_cm2"], 2: ["general"], 3: ["general", "hectarea"]})
def superficie(c: Ctx):
    if c.variant == "hectarea":
        h = c.randint(1, 50)
        c.step("1 ha = 10 000 m²", f"{h} × 10 000 = {h * 10000}", procedure="Medidas agrarias")
        return c.build(name="Hectáreas", procedure="Conversión de superficie", prompt=f"¿Cuántos m² son {h} hectáreas?", answer=A_int(h * 10000, "m²"), final=f"{h * 10000} m²")
    units = ["km²", "hm²", "dam²", "m²", "dm²", "cm²", "mm²"]
    if c.variant == "m2_cm2":
        i, j = 3, 5
    else:
        i = c.randint(0, 5)
        j = min(6, i + c.randint(1, 2)) if c.rng.random() < 0.5 else max(0, i - c.randint(1, 2))
        if i == j:
            c.retry()
    v = c.randint(1, 99)
    factor = F(100) ** (j - i)
    res = v * factor
    c.step("Cada escalón vale 100", f"De {units[i]} a {units[j]}: {abs(j - i)} escalón(es) → factor {num(factor)}", procedure="Conversión de superficie",
           why="Un cuadrado de 1 m de lado contiene 10 × 10 = 100 cuadrados de 1 dm de lado.")
    c.step("Resultado", f"{v} {units[i]} = {num(res)} {units[j]}")
    c.mistake("por_10", "Usaste 10 por escalón", "En superficie cada escalón vale 100.", v * F(10) ** (j - i), 0)
    return c.build(name="Conversión de superficie", procedure="Factor 100 por escalón", prompt=f"Convierte {v} {units[i]} a {units[j]}.", answer=A_num(res, unit=units[j]), final=f"{num(res)} {units[j]}")


@generator("b27.volumen", "Volumen", {1: ["m3_dm3"], 2: ["general"], 3: ["litros"]})
def volumen(c: Ctx):
    if c.variant == "litros":
        v = c.randint(1, 50)
        k = c.choice([("m³", "L", 1000), ("dm³", "L", 1), ("cm³", "mL", 1)])
        c.step("Equivalencia", "1 dm³ = 1 L; 1 m³ = 1000 L; 1 cm³ = 1 mL", procedure="Relación volumen–capacidad")
        return c.build(name="Volumen y capacidad", procedure="1 dm³ = 1 L", prompt=f"¿Cuántos {k[1]} son {v} {k[0]}?", answer=A_int(v * k[2], k[1]), final=f"{v * k[2]} {k[1]}")
    units = ["m³", "dm³", "cm³", "mm³"]
    i, j = (0, 1) if c.variant == "m3_dm3" else c.sample(range(4), 2)
    v = c.randint(1, 50)
    factor = F(1000) ** (j - i)
    res = v * factor
    c.step("Cada escalón vale 1000", f"{abs(j - i)} escalón(es) → factor {num(factor)}", procedure="Conversión de volumen", why="10 × 10 × 10 = 1000.")
    c.mistake("por_10", "Usaste 10 por escalón", "En volumen cada escalón vale 1000.", v * F(10) ** (j - i), 0)
    return c.build(name="Conversión de volumen", procedure="Factor 1000 por escalón", prompt=f"Convierte {v} {units[i]} a {units[j]}.", answer=A_num(res, unit=units[j]), final=f"{num(res)} {units[j]}")


@generator("b27.prefijos", "Prefijos del sistema métrico", {1: ["base"], 2: ["base"], 3: ["grandes"]})
def prefijos(c: Ctx):
    pref = [("kilo", 3), ("hecto", 2), ("deca", 1), ("deci", -1), ("centi", -2), ("mili", -3)]
    if c.variant == "grandes":
        pref = [("mega", 6), ("giga", 9), ("micro", -6), ("nano", -9), ("kilo", 3), ("mili", -3)]
    p, e = c.choice(pref)
    c.step("Recordar", f"{p} = $10^{{{e}}}$", procedure="Prefijos del SI")
    return c.build(name="Prefijos métricos", procedure="Prefijos del SI", prompt=f"El prefijo **{p}** equivale a multiplicar por 10 elevado a…", answer=A_int(e), final=str(e))


@generator("b27.si_unidades", "Sistema Internacional de Unidades", {1: ["base"], 2: ["base"], 3: ["base"]})
def si_unidades(c: Ctx):
    mags = [("longitud", "metro (m)"), ("masa", "kilogramo (kg)"), ("tiempo", "segundo (s)"), ("temperatura", "kelvin (K)"),
            ("intensidad de corriente eléctrica", "amperio (A)"), ("cantidad de sustancia", "mol (mol)"), ("intensidad luminosa", "candela (cd)")]
    m, u = c.choice(mags)
    ans = mc(c, u, [x[1] for x in mags if x[1] != u][:3] + (["gramo (g)"] if m == "masa" else ["litro (L)"]))
    c.step("Unidades básicas del SI", "m, kg, s, A, K, mol, cd.", procedure="Sistema Internacional")
    return c.build(name="Unidades del SI", procedure="Unidades básicas", prompt=f"¿Cuál es la unidad básica del SI para la **{m}**?", answer=ans, final=u)


@generator("b27.aplicaciones_unidades", "Aplicaciones prácticas de las unidades", {1: ["receta"], 2: ["viaje"], 3: ["mezcla"]})
def aplicaciones_unidades(c: Ctx):
    if c.variant == "receta":
        g = c.randint(2, 9) * 250
        c.step("1 kg = 1000 g", f"{g} g = {num(F(g, 1000))} kg", procedure="Conversión en contexto")
        return c.build(name="Unidades en la cocina", procedure="Conversión de masa", prompt=f"Una receta pide {g} g de harina. ¿Cuántos kilogramos son?", answer=A_num(F(g, 1000), unit="kg"), final=f"{num(F(g, 1000))} kg")
    if c.variant == "viaje":
        v = c.choice([36, 54, 72, 90, 108])
        ms = F(v * 1000, 3600)
        c.step("km/h a m/s", f"{v} × 1000 ÷ 3600 = {num(ms)}", procedure="Conversión de velocidad", why="1 km = 1000 m y 1 h = 3600 s.")
        return c.build(name="Velocidad", procedure="Conversión compuesta", prompt=f"Un coche va a {v} km/h. ¿A cuántos m/s va?", answer=A_num(ms, unit="m/s"), final=f"{num(ms)} m/s")
    a, b = c.randint(1, 5), c.randint(100, 900)
    tot = a * 1000 + b
    c.step("Pasar todo a mL", f"{a} L = {a * 1000} mL; + {b} = {tot} mL", procedure="Suma de cantidades con distintas unidades")
    return c.build(name="Sumar con unidades distintas", procedure="Homogeneizar unidades", prompt=f"Se mezclan {a} L de agua con {b} mL de jugo. ¿Cuántos mL hay en total?", answer=A_int(tot, "mL"),
                   final=f"{tot} mL")


# ============================================ SUCESIONES Y PATRONES (B28) ===


@generator("b28.siguiente_termino", "Patrones numéricos", {1: ["aritmetica"], 2: ["geometrica", "aritmetica"], 3: ["cuadrados", "alternada"]})
def siguiente_termino(c: Ctx):
    if c.variant == "aritmetica":
        a, d = c.randint(-20, 50), c.choice([-7, -5, -3, -2, 2, 3, 4, 5, 6, 9, 11])
        seq = [a + d * i for i in range(5)]
        nxt = a + 5 * d
        c.step("Diferencias", f"Cada término se obtiene sumando {d}.", procedure="Identificación de patrones (diferencia constante)", prompt="¿Diferencia común?", answer=A_int(d))
    elif c.variant == "geometrica":
        a, r = c.randint(1, 5), c.choice([2, 3])
        seq = [a * r**i for i in range(5)]
        nxt = a * r**5
        c.step("Cocientes", f"Cada término se multiplica por {r}.", procedure="Identificación de patrones (razón constante)", prompt="¿Razón?", answer=A_int(r))
    elif c.variant == "cuadrados":
        k = c.randint(1, 5)
        seq = [(k + i) ** 2 for i in range(5)]
        nxt = (k + 5) ** 2
        c.step("Diferencias crecientes", "Son cuadrados perfectos consecutivos (las diferencias aumentan de 2 en 2).", procedure="Patrón de cuadrados")
    else:
        a, d1, d2 = c.randint(1, 20), c.randint(2, 9), -c.randint(1, 5)
        seq = [a]
        for i in range(4):
            seq.append(seq[-1] + (d1 if i % 2 == 0 else d2))
        nxt = seq[-1] + d1
        c.step("Patrón alternado", f"Se suma {d1} y se resta {-d2} alternadamente.", procedure="Patrón alternado")
    c.step("Siguiente término", f"{nxt}")
    return c.build(name="Siguiente término", procedure="Identificación de patrones", prompt="¿Cuál es el siguiente término? " + ", ".join(map(str, seq)) + ", …",
                   answer=A_int(nxt), final=str(nxt))


@generator("b28.termino_general", "Sucesiones aritméticas", {1: ["termino_n"], 2: ["termino_n"], 3: ["posicion"]})
def termino_general(c: Ctx):
    a1, d = c.randint(-10, 30), c.choice([-4, -3, 2, 3, 4, 5, 7])
    n = c.randint(10, 60)
    an = a1 + (n - 1) * d
    if c.variant == "posicion":
        c.step("Fórmula", f"$a_n = a_1 + (n-1)d$ → ${an} = {a1} + (n-1)\\cdot {signed_tex(d)}$", procedure="Término general de una sucesión aritmética")
        c.step("Despejar n", f"$n - 1 = \\frac{{{an - a1}}}{{{d}}} = {n - 1}$ → n = {n}", prompt="¿n − 1?", answer=A_int(n - 1))
        return c.build(name="Posición de un término", procedure="Despeje en el término general", prompt=f"En la sucesión aritmética {a1}, {a1 + d}, {a1 + 2 * d}, …, ¿qué lugar ocupa el término {an}?",
                       answer=A_int(n), final=str(n))
    c.step("Fórmula", "$a_n = a_1 + (n-1)\\,d$", procedure="Término general de una sucesión aritmética", why="Para llegar al término n se suma la diferencia (n − 1) veces.")
    c.step("Sustituir", f"$a_{{{n}}} = {a1} + {n - 1} \\cdot {signed_tex(d)} = {an}$", prompt="¿Resultado?", answer=A_int(an))
    c.mistake("n_por_d", "Usaste n en vez de n − 1", "Desde el primer término hasta el n-ésimo hay n − 1 saltos.", a1 + n * d, 1)
    return c.build(name="Término n-ésimo", procedure="a_n = a₁ + (n − 1)d", prompt=f"Halla el término número {n} de la sucesión {a1}, {a1 + d}, {a1 + 2 * d}, {a1 + 3 * d}, …",
                   answer=A_int(an), final=str(an))


@generator("b28.diferencia_comun", "Diferencia común", {1: ["base"], 2: ["base"], 3: ["no_consecutivos"]})
def diferencia_comun(c: Ctx):
    a, d = c.randint(-20, 40), c.choice([-9, -6, -2, 3, 4, 8, 12])
    if c.variant == "no_consecutivos":
        k = c.randint(3, 6)
        c.step("Usar la fórmula", f"$a_{{{1 + k}}} - a_1 = {k}d$ → $d = \\frac{{{a + k * d} - {signed_tex(a)}}}{{{k}}} = {d}$", procedure="Cálculo de la diferencia común")
        return c.build(name="Diferencia común (términos lejanos)", procedure="d = (a_m − a_n)/(m − n)", prompt=f"En una sucesión aritmética, $a_1 = {a}$ y $a_{{{1 + k}}} = {a + k * d}$. ¿Cuál es la diferencia común?",
                       answer=A_int(d), final=str(d))
    seq = [a + d * i for i in range(4)]
    c.step("Restar consecutivos", f"{seq[1]} − {signed_tex(seq[0])} = {d}", procedure="Cálculo de la diferencia común")
    c.mistake("al_reves", "Restaste al revés", "d = término siguiente − término anterior.", -d, 0)
    return c.build(name="Diferencia común", procedure="Resta de términos consecutivos", prompt="¿Cuál es la diferencia común? " + ", ".join(map(str, seq)) + ", …", answer=A_int(d), final=str(d))


@generator("b28.creciente_decreciente", "Sucesiones crecientes y decrecientes", {1: ["base"], 2: ["base"], 3: ["base"]})
def creciente_decreciente(c: Ctx):
    kind = c.choice(["Creciente", "Decreciente", "Ni creciente ni decreciente"])
    a = c.randint(-10, 30)
    if kind == "Creciente":
        seq = [a + c.randint(1, 3) * i + i for i in range(5)]
        seq = sorted(set(seq))[:5]
    elif kind == "Decreciente":
        seq = sorted({a - c.randint(1, 4) * i - i for i in range(5)}, reverse=True)[:5]
    else:
        seq = [a, a + 3, a + 1, a + 5, a + 2]
    if len(seq) < 4:
        c.retry()
    c.step("Comparar cada término con el siguiente", "Si siempre aumenta → creciente; si siempre disminuye → decreciente.", procedure="Monotonía de sucesiones")
    return c.build(name="Monotonía", procedure="Comparación de términos consecutivos", prompt="¿Cómo es la sucesión " + ", ".join(map(str, seq)) + ", …?",
                   answer=A_choice_fixed(["Creciente", "Decreciente", "Ni creciente ni decreciente"], kind), final=kind)


@generator("b28.concepto_sucesion", "Concepto de sucesión", {1: ["termino"], 2: ["termino"], 3: ["formula"]})
def concepto_sucesion(c: Ctx):
    k, b = c.randint(2, 6), c.randint(-5, 10)
    n = c.randint(1, 8)
    if c.variant == "formula":
        c.step("Sustituir n", f"$a_{{{n}}} = {k} \\cdot {n} {'+' if b >= 0 else '-'} {abs(b)} = {k * n + b}$", procedure="Término de una sucesión definida por fórmula")
        return c.build(name="Sucesión dada por fórmula", procedure="Sustitución", prompt=f"Si $a_n = {k}n {'+' if b >= 0 else '-'} {abs(b)}$, ¿cuánto vale $a_{{{n}}}$?", answer=A_int(k * n + b),
                       final=str(k * n + b))
    seq = [k * i + b for i in range(1, 9)]
    c.step("Contar posiciones", f"El término {n} es {seq[n - 1]}.", procedure="Lectura de una sucesión")
    return c.build(name="Términos de una sucesión", procedure="Posición y término", prompt="En la sucesión " + ", ".join(map(str, seq)) + f", … ¿cuál es el término de la posición {n}?",
                   answer=A_int(seq[n - 1]), final=str(seq[n - 1]))


@generator("b28.problemas_sucesiones", "Resolución de problemas con sucesiones", {1: ["ahorro"], 2: ["ahorro", "asientos"], 3: ["suma"]})
def problemas_sucesiones(c: Ctx):
    a, d = c.randint(5, 50), c.randint(2, 10)
    n = c.randint(6, 20)
    if c.variant == "suma":
        an = a + (n - 1) * d
        S = n * (a + an) // 2 if (n * (a + an)) % 2 == 0 else c.retry()
        c.step("Último término", f"$a_{{{n}}} = {a} + {n - 1}\\cdot{d} = {an}$", procedure="Suma de una sucesión aritmética", prompt="¿Último término?", answer=A_int(an))
        c.step("Suma de Gauss", f"$S = \\frac{{n(a_1 + a_n)}}{{2}} = \\frac{{{n}({a} + {an})}}{{2}} = {S}$", why="Emparejando primero con último, cada pareja suma lo mismo.")
        return c.build(name="Suma de términos", procedure="Suma de una progresión aritmética", prompt=f"{c.choice(NAMES)} ahorra {a} pesos la primera semana y cada semana {d} más que la anterior. ¿Cuánto habrá ahorrado en total en {n} semanas?",
                       answer=A_int(S, "pesos"), final=f"{S} pesos")
    an = a + (n - 1) * d
    story = (f"Ahorras {a} pesos la primera semana y cada semana {d} pesos más que la anterior. ¿Cuánto ahorras en la semana {n}?" if c.variant == "ahorro"
             else f"Un teatro tiene {a} butacas en la primera fila y cada fila tiene {d} más que la anterior. ¿Cuántas butacas tiene la fila {n}?")
    c.step("Reconocer una sucesión aritmética", f"$a_1 = {a}$, $d = {d}$", procedure="Modelización con sucesiones")
    c.step("Término general", f"$a_{{{n}}} = {a} + {n - 1} \\cdot {d} = {an}$", prompt="¿Resultado?", answer=A_int(an))
    c.mistake("n_saltos", "Contaste n saltos en vez de n − 1", "Entre la 1ª y la n-ésima hay n − 1 aumentos.", a + n * d, 1)
    return c.build(name="Problema con sucesiones", procedure="Término general", prompt=story, answer=A_int(an), final=str(an))


# =============================================== ARITMÉTICA MODULAR (B29) ==


@generator("b29.operacion_mod", "Operación módulo", {1: ["positivo"], 2: ["grande"], 3: ["negativo"]})
def operacion_mod(c: Ctx):
    m = c.randint(2, 13)
    a = c.by_level(c.randint(m, 60), c.randint(100, 9999), -c.randint(1, 60))
    r = a % m
    q = (a - r) // m
    c.step("Dividir", f"${a} = {m} \\cdot ({q}) + {r}$", procedure="Operación módulo (resto de la división)", why="El resto debe cumplir 0 ≤ r < m.")
    c.step("El resto es el resultado", f"${a} \\bmod {m} = {r}$")
    if a < 0:
        c.mistake("negativo", "Diste un resto negativo", "En aritmética modular el resto está entre 0 y m − 1.", -((-a) % m), 0)
    return c.build(name="Operación módulo", procedure="Resto de la división euclídea", prompt=f"Calcula ${a} \\bmod {m}$.", answer=A_int(r), final=str(r))


@generator("b29.congruencia", "Congruencias", {1: ["verificar"], 2: ["verificar"], 3: ["encontrar"]})
def congruencia(c: Ctx):
    m = c.randint(3, 12)
    if c.variant == "encontrar":
        a = c.randint(20, 200)
        r = a % m
        c.step("Reducir", f"${a} \\equiv {r} \\pmod{{{m}}}$", procedure="Representante mínimo de una clase")
        return c.build(name="Congruencia", procedure="Reducción módulo m", prompt=f"¿Qué número x con 0 ≤ x < {m} cumple ${a} \\equiv x \\pmod{{{m}}}$?", answer=A_int(r), final=str(r))
    a = c.randint(10, 150)
    yes = c.rng.random() < 0.5
    b = a % m + m * c.randint(0, 10) if yes else a % m + m * c.randint(0, 10) + c.randint(1, m - 1)
    yes = (a - b) % m == 0
    c.step("Restar y comprobar divisibilidad", f"${a} - {b} = {a - b}$; ¿es múltiplo de {m}? {'Sí' if yes else 'No'}.", procedure="Definición de congruencia",
           why="a ≡ b (mod m) significa que m divide a a − b (dejan el mismo resto).")
    return c.build(name="¿Son congruentes?", procedure="a ≡ b ⇔ m | (a − b)", prompt=f"¿Es cierto que ${a} \\equiv {b} \\pmod{{{m}}}$?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if yes else "No"), final="Sí" if yes else "No")


@generator("b29.reloj", "Aritmética del reloj", {1: ["horas"], 2: ["horas", "dias"], 3: ["dias"]})
def reloj(c: Ctx):
    if c.variant == "horas":
        h, k = c.randint(0, 23), c.randint(5, 100)
        r = (h + k) % 24
        c.step("Sumar y reducir módulo 24", f"$({h} + {k}) \\bmod 24 = {h + k} \\bmod 24 = {r}$", procedure="Aritmética del reloj (módulo 24)")
        c.mistake("sin_mod", "No redujiste módulo 24", "El reloj vuelve a 0 cada 24 horas.", h + k, 0)
        return c.build(name="Aritmética del reloj", procedure="Suma módulo 24", prompt=f"Son las {h}:00. ¿Qué hora será dentro de {k} horas? (formato 0–23, sólo la hora)", answer=A_int(r), final=f"{r}:00")
    days = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    d0, k = c.randint(0, 6), c.randint(8, 400)
    r = (d0 + k) % 7
    ans = A_choice_fixed(days, days[r])
    c.step("Módulo 7", f"${k} \\bmod 7 = {k % 7}$: avanzamos {k % 7} días desde el {days[d0]}.", procedure="Aritmética modular (módulo 7)", prompt=f"¿{k} mod 7?", answer=A_int(k % 7))
    return c.build(name="Días de la semana", procedure="Suma módulo 7", prompt=f"Hoy es {days[d0]}. ¿Qué día será dentro de {k} días?", answer=ans, final=days[r])


@generator("b29.operaciones_modulares", "Suma, resta y multiplicación modular", {1: ["suma"], 2: ["resta", "suma"], 3: ["multiplicacion"]})
def operaciones_modulares(c: Ctx):
    m = c.randint(5, 13)
    a, b = c.randint(0, 60), c.randint(0, 60)
    op = {"suma": "+", "resta": "-", "multiplicacion": "\\cdot"}[c.variant]
    raw = a + b if c.variant == "suma" else a - b if c.variant == "resta" else a * b
    r = raw % m
    c.step("Reducir primero (opcional)", f"${a} \\equiv {a % m}$, ${b} \\equiv {b % m} \\pmod{{{m}}}$", procedure=f"{c.variant.capitalize()} modular",
           why="Se puede reducir cada número antes de operar: el resultado módulo m es el mismo.")
    c.step("Operar y reducir", f"$({a % m} {op} {b % m}) \\bmod {m} = {r}$", prompt="¿Resultado?", answer=A_int(r))
    return c.build(name="Operación modular", procedure=f"{c.variant.capitalize()} módulo {m}", prompt=f"Calcula $({a} {op} {b}) \\bmod {m}$.", answer=A_int(r), final=str(r))


@generator("b29.aplicaciones_modular", "Aplicaciones en informática y criptografía", {1: ["cesar"], 2: ["cesar", "par_impar"], 3: ["digito_control"]})
def aplicaciones_modular(c: Ctx):
    alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if c.variant == "cesar":
        k = c.randint(1, 25)
        word = "".join(c.choice(alpha) for _ in range(c.randint(3, 5)))
        enc = "".join(alpha[(alpha.index(ch) + k) % 26] for ch in word)
        c.step("Desplazar cada letra módulo 26", f"Con clave {k}: " + ", ".join(f"{ch}→{alpha[(alpha.index(ch) + k) % 26]}" for ch in word), procedure="Cifrado César (suma módulo 26)")
        return c.build(name="Cifrado César", procedure="Suma modular", prompt=f"Cifra la palabra **{word}** con el cifrado César de clave {k} (alfabeto de 26 letras, sin Ñ).",
                       answer=AnswerSpec(kind="token", value=enc), final=enc)
    if c.variant == "par_impar":
        n = c.randint(100, 99999)
        c.step("n mod 2", f"{n} mod 2 = {n % 2}", procedure="Paridad con módulo")
        return c.build(name="Paridad", procedure="n mod 2", prompt=f"En programación, `{n} % 2` devuelve el resto de dividir entre 2. ¿Qué valor devuelve?", answer=A_int(n % 2), final=str(n % 2))
    digits = [c.randint(0, 9) for _ in range(5)]
    w = [5, 4, 3, 2, 1]
    s = sum(d * k for d, k in zip(digits, w))
    check = s % 10
    c.step("Suma ponderada", " + ".join(f"{d}·{k}" for d, k in zip(digits, w)) + f" = {s}", procedure="Dígito de control", prompt="¿Suma ponderada?", answer=A_int(s))
    c.step("Módulo 10", f"{s} mod 10 = {check}")
    return c.build(name="Dígito de control", procedure="Suma ponderada módulo 10", prompt=f"Un código {''.join(map(str, digits))} tiene un dígito de control = (5·d₁ + 4·d₂ + 3·d₃ + 2·d₄ + 1·d₅) mod 10. ¿Cuál es?",
                   answer=A_int(check), final=str(check))


@generator("b29.concepto_modulo", "Módulo", {1: ["restos"], 2: ["restos"], 3: ["restos"]})
def concepto_modulo(c: Ctx):
    m = c.randint(2, 12)
    c.step("Restos posibles", f"Al dividir entre {m} el resto puede ser 0, 1, …, {m - 1}.", procedure="Clases de restos")
    return c.build(name="Restos posibles", procedure="Clases módulo m", prompt=f"¿Cuántos restos distintos pueden salir al dividir un número natural entre {m}?", answer=A_int(m), final=str(m))


# ================================================ PRINCIPIOS DE CONTEO (B30) ==


@generator("b30.principio_multiplicativo", "Principio multiplicativo", {1: ["dos"], 2: ["tres"], 3: ["codigos"]})
def principio_multiplicativo(c: Ctx):
    if c.variant == "codigos":
        L, d = c.randint(2, 4), c.randint(1, 3)
        total = 26**L * 10**d if L <= 2 else 26**L
        if L > 2:
            d = 0
        c.step("Opciones por posición", f"{L} letras (26 opciones cada una) y {d} cifras (10 opciones).", procedure="Principio multiplicativo")
        c.step("Multiplicar", f"$26^{{{L}}} \\times 10^{{{d}}} = {total}$")
        return c.build(name="Conteo de códigos", procedure="Principio multiplicativo", prompt=f"¿Cuántos códigos distintos hay formados por {L} letras (26 posibles, pueden repetirse) seguidas de {d} cifras?",
                       answer=A_int(total), final=str(total))
    k = 2 if c.variant == "dos" else 3
    opts = [c.randint(2, 6) for _ in range(k)]
    items = ["camisetas", "pantalones", "pares de zapatos"][:k]
    total = 1
    for o in opts:
        total *= o
    c.step("Elecciones independientes", ", ".join(f"{o} {it}" for o, it in zip(opts, items)), procedure="Principio multiplicativo",
           why="Por cada elección de la primera hay todas las de la segunda: se multiplican.")
    c.step("Multiplicar", " × ".join(map(str, opts)) + f" = {total}")
    c.mistake("suma", "Sumaste las opciones", "Si se elige una de cada cosa (y además), se multiplica.", sum(opts), 0)
    return c.build(name="Principio multiplicativo", procedure="Producto de opciones", prompt=f"Tienes {', '.join(f'{o} {it}' for o, it in zip(opts, items))}. ¿Cuántos conjuntos distintos puedes formar eligiendo uno de cada?",
                   answer=A_int(total), final=str(total))


@generator("b30.principio_aditivo", "Principio aditivo", {1: ["base"], 2: ["base"], 3: ["mixto"]})
def principio_aditivo(c: Ctx):
    a, b = c.randint(2, 12), c.randint(2, 12)
    if c.variant == "mixto":
        d = c.randint(2, 5)
        total = a + b * d
        c.step("Separar casos", f"En tren: {a} opciones. En autobús: {b} líneas × {d} horarios = {b * d}.", procedure="Principios aditivo y multiplicativo", prompt="¿Opciones en autobús?", answer=A_int(b * d))
        c.step("Sumar casos excluyentes", f"{a} + {b * d} = {total}")
        return c.build(name="Combinación de principios", procedure="Principio aditivo + multiplicativo", prompt=f"Para viajar puedes ir en tren ({a} horarios) o en autobús ({b} líneas, cada una con {d} horarios). ¿Cuántas opciones hay?",
                       answer=A_int(total), final=str(total))
    c.step("Casos excluyentes", "Se elige UNA cosa de un grupo O del otro → se suman.", procedure="Principio aditivo")
    c.mistake("producto", "Multiplicaste", "Cuando se elige una cosa de un grupo O de otro, se suma.", a * b, 0)
    return c.build(name="Principio aditivo", procedure="Suma de casos excluyentes", prompt=f"En el menú hay {a} postres fríos y {b} calientes. Si sólo pides un postre, ¿cuántas opciones tienes?",
                   answer=A_int(a + b), final=str(a + b))


@generator("b30.diagrama_arbol", "Diagramas de árbol", {1: ["monedas"], 2: ["monedas", "dado_moneda"], 3: ["contar_ramas"]})
def diagrama_arbol(c: Ctx):
    if c.variant == "monedas":
        n = c.randint(2, 4)
        c.step("Cada nivel duplica las ramas", f"$2^{{{n}}} = {2**n}$ resultados", procedure="Diagrama de árbol")
        return c.build(name="Lanzar monedas", procedure="Diagrama de árbol", prompt=f"Se lanza una moneda {n} veces. ¿Cuántos resultados posibles (secuencias de cara/cruz) hay?",
                       answer=A_int(2**n), final=str(2**n), workspace={"type": "tree", "levels": [2] * n})
    if c.variant == "dado_moneda":
        c.step("Ramas", "6 ramas del dado y, de cada una, 2 de la moneda: 12", procedure="Diagrama de árbol")
        return c.build(name="Dado y moneda", procedure="Diagrama de árbol", prompt="Se lanza un dado y luego una moneda. ¿Cuántos resultados posibles hay?", answer=A_int(12), final="12",
                       workspace={"type": "tree", "levels": [6, 2]})
    lv = [c.randint(2, 4) for _ in range(3)]
    total = lv[0] * lv[1] * lv[2]
    c.step("Contar hojas", " × ".join(map(str, lv)) + f" = {total}", procedure="Conteo de ramas finales")
    return c.build(name="Hojas de un árbol", procedure="Principio multiplicativo en árboles", prompt=f"Un diagrama de árbol tiene {lv[0]} ramas en el primer nivel, {lv[1]} desde cada una en el segundo y {lv[2]} desde cada una en el tercero. ¿Cuántas ramas finales hay?",
                   answer=A_int(total), final=str(total), workspace={"type": "tree", "levels": lv})


@generator("b30.permutaciones", "Introducción a permutaciones", {1: ["factorial"], 2: ["ordenar_todos"], 3: ["variaciones"]})
def permutaciones(c: Ctx):
    if c.variant == "factorial":
        n = c.randint(3, 7)
        c.step("n!", f"${n}! = {' \\times '.join(str(i) for i in range(n, 0, -1))} = {factorial(n)}$", procedure="Factorial")
        return c.build(name="Factorial", procedure="n! = n·(n−1)·…·1", prompt=f"Calcula ${n}!$", answer=A_int(factorial(n)), final=str(factorial(n)))
    if c.variant == "ordenar_todos":
        n = c.randint(3, 6)
        c.step("Opciones por posición", f"{n} para el 1º, {n - 1} para el 2º, …", procedure="Permutaciones sin repetición")
        c.step("Multiplicar", f"${n}! = {factorial(n)}$")
        c.mistake("n", "Diste n", "Cada posición tiene una opción menos que la anterior: se multiplica.", n, 0)
        return c.build(name="Permutaciones", procedure="Pₙ = n!", prompt=f"¿De cuántas maneras se pueden ordenar {n} libros distintos en una estantería?", answer=A_int(factorial(n)), final=str(factorial(n)))
    n, k = c.randint(5, 10), c.randint(2, 3)
    v = perm(n, k)
    c.step("El orden importa", f"{n} × {n - 1}" + (f" × {n - 2}" if k == 3 else "") + f" = {v}", procedure="Variaciones (permutaciones de n tomados de k)")
    c.mistake("combinacion", "Calculaste combinaciones", "Si los puestos son distintos (oro, plata…), el orden importa.", comb(n, k), 0)
    return c.build(name="Variaciones", procedure="V(n, k) = n!/(n−k)!", prompt=f"En una carrera con {n} corredores, ¿de cuántas formas pueden repartirse los {k} primeros puestos?", answer=A_int(v), final=str(v))


@generator("b30.combinaciones", "Introducción a combinaciones", {1: ["pares"], 2: ["comites"], 3: ["comites", "saludos"]})
def combinaciones(c: Ctx):
    if c.variant == "saludos":
        n = c.randint(4, 15)
        v = comb(n, 2)
        c.step("Cada saludo es un par sin orden", f"$C({n}, 2) = \\frac{{{n} \\cdot {n - 1}}}{{2}} = {v}$", procedure="Combinaciones de 2")
        c.mistake("con_orden", "Contaste cada saludo dos veces", "A saluda a B es el mismo saludo que B saluda a A.", n * (n - 1), 0)
        return c.build(name="Saludos", procedure="C(n, 2)", prompt=f"En una reunión, {n} personas se saludan todas entre sí una vez. ¿Cuántos saludos hay?", answer=A_int(v), final=str(v))
    n = c.randint(4, 10)
    k = 2 if c.variant == "pares" else c.randint(2, 4)
    v = comb(n, k)
    c.step("El orden NO importa", f"Variaciones: {perm(n, k)}; cada grupo se contó {factorial(k)} veces.", procedure="Combinaciones", why="Un grupo {A, B} es el mismo que {B, A}.")
    c.step("Dividir", f"$C({n}, {k}) = \\frac{{{perm(n, k)}}}{{{factorial(k)}}} = {v}$", prompt="¿Resultado?", answer=A_int(v))
    c.mistake("variacion", "No dividiste entre k!", "El orden no importa en un grupo: hay que dividir.", perm(n, k), 0)
    return c.build(name="Combinaciones", procedure="C(n, k) = n!/(k!(n−k)!)", prompt=f"¿Cuántos grupos de {k} personas pueden formarse con {n} personas?", answer=A_int(v), final=str(v))


@generator("b30.aplicaciones_conteo", "Aplicaciones del conteo", {1: ["contrasena"], 2: ["menu"], 3: ["sin_repeticion"]})
def aplicaciones_conteo(c: Ctx):
    if c.variant == "contrasena":
        n = c.randint(3, 6)
        c.step("10 opciones por cifra", f"$10^{{{n}}} = {10**n}$", procedure="Principio multiplicativo")
        return c.build(name="Contraseñas numéricas", procedure="Variaciones con repetición", prompt=f"¿Cuántas claves de {n} cifras (0–9, pueden repetirse) existen?", answer=A_int(10**n), final=str(10**n))
    if c.variant == "menu":
        a, b, d = c.randint(2, 5), c.randint(2, 6), c.randint(2, 4)
        c.step("Multiplicar", f"{a} × {b} × {d} = {a * b * d}", procedure="Principio multiplicativo")
        return c.build(name="Menús", procedure="Principio multiplicativo", prompt=f"Un menú tiene {a} entradas, {b} platos principales y {d} postres. ¿Cuántos menús distintos (uno de cada) hay?",
                       answer=A_int(a * b * d), final=str(a * b * d))
    n = c.randint(3, 5)
    v = perm(10, n)
    c.step("Sin repetir cifras", " × ".join(str(10 - i) for i in range(n)) + f" = {v}", procedure="Variaciones sin repetición")
    c.mistake("con_rep", "Permitiste repetir cifras", "Si no pueden repetirse, cada posición tiene una opción menos.", 10**n, 0)
    return c.build(name="Claves sin repetición", procedure="Variaciones sin repetición", prompt=f"¿Cuántas claves de {n} cifras distintas (sin repetir) pueden formarse con las cifras 0–9?", answer=A_int(v), final=str(v))


@generator("b30.conteo_posibilidades", "Conteo de posibilidades", {1: ["listar"], 2: ["listar"], 3: ["condicion"]})
def conteo_posibilidades(c: Ctx):
    if c.variant == "condicion":
        target = c.randint(4, 10)
        ways = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == target)
        c.step("Listar pares (dado 1, dado 2)", ", ".join(f"({a},{b})" for a in range(1, 7) for b in range(1, 7) if a + b == target), procedure="Conteo sistemático")
        return c.build(name="Conteo con condición", procedure="Listado sistemático", prompt=f"Se lanzan dos dados. ¿En cuántos resultados la suma es {target}?", answer=A_int(ways), final=str(ways))
    digits = c.sample(range(1, 10), 3)
    nums = sorted({a * 10 + b for a in digits for b in digits if a != b})
    c.step("Listar sistemáticamente", ", ".join(map(str, nums)), procedure="Conteo por listado")
    return c.build(name="Contar listando", procedure="Listado sistemático", prompt=f"¿Cuántos números de dos cifras distintas se pueden formar con las cifras {', '.join(map(str, digits))}?",
                   answer=A_int(len(nums)), final=str(len(nums)))


# ========================================= RESOLUCIÓN DE PROBLEMAS (B31) ===


def _story(c: Ctx) -> dict:
    """Problema de varios pasos con datos, incógnita y operaciones conocidas."""
    n = c.choice(NAMES)
    kind = c.choice(["compra", "viaje", "reparto"])
    if kind == "compra":
        q, p, pay = c.randint(2, 9), c.randint(15, 90), 0
        pay = (q * p // 100 + 1) * 100
        return dict(text=f"{n} compra {q} camisetas a {p} pesos cada una y paga con {pay} pesos. ¿Cuánto le devuelven?", data=[f"{q} camisetas", f"{p} pesos cada una", f"paga {pay}"],
                    unknown="El cambio que le devuelven", ops=["Multiplicación", "Resta"], steps=[(f"{q} × {p}", q * p), (f"{pay} − {q * p}", pay - q * p)], answer=pay - q * p, unit="pesos")
    if kind == "viaje":
        v, h, extra = c.randint(40, 110), c.randint(2, 6), c.randint(10, 90)
        return dict(text=f"Un autobús viaja a {v} km/h durante {h} horas y luego recorre {extra} km más. ¿Cuántos km recorre en total?", data=[f"{v} km/h", f"{h} horas", f"{extra} km más"],
                    unknown="La distancia total recorrida", ops=["Multiplicación", "Suma"], steps=[(f"{v} × {h}", v * h), (f"{v * h} + {extra}", v * h + extra)], answer=v * h + extra, unit="km")
    k, each, left = c.randint(3, 9), c.randint(5, 30), c.randint(1, 20)
    tot = k * each + left
    return dict(text=f"Hay {tot} caramelos. Se reparten {each} a cada uno de {k} niños. ¿Cuántos caramelos sobran?", data=[f"{tot} caramelos", f"{each} por niño", f"{k} niños"],
                unknown="Los caramelos que sobran", ops=["Multiplicación", "Resta"], steps=[(f"{k} × {each}", k * each), (f"{tot} − {k * each}", left)], answer=left, unit="caramelos")


@generator("b31.comprension", "Comprensión del enunciado e identificación de incógnitas", {1: ["incognita"], 2: ["incognita"], 3: ["incognita"]})
def comprension(c: Ctx):
    s = _story(c)
    others = ["El precio de cada camiseta", "La velocidad del autobús", "El número de niños", "El total de caramelos", "Las horas de viaje"]
    ans = mc(c, s["unknown"], [o for o in others if o != s["unknown"]][:3])
    c.step("Leer la pregunta final", "La incógnita es lo que la pregunta pide, no los datos que ya conocemos.", procedure="Comprensión del enunciado")
    return c.build(name="Identificación de la incógnita", procedure="Comprensión del enunciado", prompt=f"{s['text']}\n\n**¿Cuál es la incógnita del problema?**", answer=ans, final=s["unknown"])


@generator("b31.identificar_datos", "Identificación de datos", {1: ["base"], 2: ["base"], 3: ["dato_extra"]})
def identificar_datos(c: Ctx):
    s = _story(c)
    text = s["text"]
    distract = f"La tienda abre a las {c.randint(8, 10)} de la mañana."
    if c.variant == "dato_extra":
        text = text.replace("?", "?").replace(". ¿", f". {distract} ¿")
        ans = mc(c, distract.rstrip("."), s["data"])
        c.step("Separar datos útiles de irrelevantes", "Un dato es útil si se necesita para calcular la incógnita.", procedure="Identificación de datos")
        return c.build(name="Dato irrelevante", procedure="Selección de datos", prompt=f"{text}\n\n**¿Qué información NO es necesaria?**", answer=ans, final=distract)
    c.step("Datos", "; ".join(s["data"]), procedure="Identificación de datos")
    num_data = len(s["data"])
    return c.build(name="Identificación de datos", procedure="Lectura de datos", prompt=f"{s['text']}\n\n**¿Cuántos datos numéricos da el enunciado?**", answer=A_int(num_data), final=str(num_data))


@generator("b31.seleccion_operaciones", "Selección de operaciones", {1: ["primera"], 2: ["primera", "segunda"], 3: ["segunda"]})
def seleccion_operaciones(c: Ctx):
    s = _story(c)
    i = 0 if c.variant == "primera" else 1
    op = s["ops"][i]
    ans = mc(c, op, [o for o in ["Suma", "Resta", "Multiplicación", "División"] if o != op])
    c.step("Pensar qué representa cada paso", f"Paso {i + 1}: {s['steps'][i][0]}", procedure="Selección de operaciones")
    return c.build(name="Selección de operaciones", procedure="Análisis del enunciado", prompt=f"{s['text']}\n\n**¿Qué operación se hace en el {'primer' if i == 0 else 'segundo'} paso?**", answer=ans, final=op)


@generator("b31.varios_pasos", "Problemas de varios pasos", {1: ["base"], 2: ["base"], 3: ["base"]})
def varios_pasos(c: Ctx):
    s = _story(c)
    c.step("Comprender", f"Incógnita: {s['unknown'].lower()}.", procedure="Método de resolución de problemas (Pólya)")
    c.step("Datos", "; ".join(s["data"]))
    c.step("Plan", " y luego ".join(s["ops"]).lower())
    for desc, val in s["steps"]:
        c.step("Ejecutar", f"${desc.replace('×', '\\times').replace('−', '-')} = {val}$", prompt=f"¿{desc}?", answer=A_int(val))
    c.step("Comprobar", "¿El resultado es razonable y responde a la pregunta, con su unidad?")
    return c.build(name="Problema de varios pasos", procedure="Resolución en cuatro fases (comprender, planificar, ejecutar, comprobar)", prompt=s["text"],
                   answer=A_int(s["answer"], s["unit"]), final=f"{s['answer']} {s['unit']}")


@generator("b31.comprobacion", "Comprobación de resultados", {1: ["razonable"], 2: ["razonable"], 3: ["razonable"]})
def comprobacion(c: Ctx):
    s = _story(c)
    good = c.rng.random() < 0.5
    shown = s["answer"] if good else s["answer"] + c.choice([-10, 10, 100]) if s["answer"] > 10 else s["answer"] + 7
    c.step("Rehacer al revés", "Comprobamos con la operación inversa o estimando.", procedure="Comprobación de resultados")
    c.step("Veredicto", "Correcto." if good else f"Incorrecto: el resultado correcto es {s['answer']}.")
    return c.build(name="Comprobación", procedure="Verificación con operaciones inversas", prompt=f"{s['text']}\n\nUn compañero respondió **{shown} {s['unit']}**. ¿Es correcto?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if good else "No"), final="Sí" if good else "No")


@generator("b31.estrategias", "Diseño de estrategias y razonamiento matemático", {1: ["ensayo_error"], 2: ["hacia_atras"], 3: ["hacia_atras", "ensayo_error"]})
def estrategias(c: Ctx):
    if c.variant == "ensayo_error":
        a = c.randint(2, 20)
        b = c.randint(a + 1, 40)
        c.step("Ensayo y error / plantear", f"Dos números que suman {a + b} y se diferencian en {b - a}: el mayor es ({a + b} + {b - a}) ÷ 2 = {b}.", procedure="Estrategia: ensayo y error")
        return c.build(name="Suma y diferencia", procedure="Razonamiento", prompt=f"Dos números suman {a + b} y su diferencia es {b - a}. ¿Cuál es el mayor?", answer=A_int(b), final=str(b))
    x = c.randint(5, 40)
    k, s = c.randint(2, 5), c.randint(3, 20)
    res = x * k + s
    c.step("Trabajar hacia atrás", f"Deshacer +{s}: {res} − {s} = {res - s}. Deshacer ×{k}: {res - s} ÷ {k} = {x}.", procedure="Estrategia: trabajar hacia atrás",
           why="Las operaciones inversas se aplican en orden contrario.")
    return c.build(name="Trabajar hacia atrás", procedure="Operaciones inversas en orden inverso", prompt=f"Pienso un número, lo multiplico por {k} y le sumo {s}. Obtengo {res}. ¿Qué número pensé?",
                   answer=A_int(x), final=str(x))


# ===================================== APLICACIONES DE LA ARITMÉTICA (B32) ==


@generator("b32.compras_ventas", "Compras y ventas", {1: ["total"], 2: ["oferta"], 3: ["margen"]})
def compras_ventas(c: Ctx):
    if c.variant == "total":
        items = [(c.randint(1, 5), F(c.randint(100, 3000), 100)) for _ in range(3)]
        tot = sum(q * p for q, p in items)
        c.step("Subtotales", ", ".join(f"{q}×{fixed_str(p, 2)}={fixed_str(q * p, 2)}" for q, p in items), procedure="Cálculo de un ticket de compra")
        c.step("Total", fixed_str(tot, 2), prompt="¿Total?", answer=A_num(tot))
        return c.build(name="Ticket de compra", procedure="Multiplicación y suma de decimales", prompt="Calcula el total: " + "; ".join(f"{q} artículo(s) a {fixed_str(p, 2)} pesos" for q, p in items),
                       answer=A_num(tot, unit="pesos"), final=f"{fixed_str(tot, 2)} pesos")
    if c.variant == "oferta":
        p = c.randint(10, 80)
        n = c.randint(4, 12)
        pay = n - n // 3
        c.step("3×2: de cada 3 se pagan 2", f"Se pagan {pay} de {n}: {pay} × {p} = {pay * p}", procedure="Ofertas", prompt="¿Unidades pagadas?", answer=A_int(pay))
        return c.build(name="Oferta 3×2", procedure="División entera y multiplicación", prompt=f"Con la oferta 3×2 (lleva 3, paga 2), ¿cuánto pagas por {n} yogures de {p} pesos?",
                       answer=A_int(pay * p, "pesos"), final=f"{pay * p} pesos")
    cost = c.randint(20, 200)
    m = c.choice([20, 25, 30, 40, 50])
    sale = F(cost * (100 + m), 100)
    c.step("Precio de venta = costo + margen", f"{cost} × {tex(F(100 + m, 100))} = {num(sale)}", procedure="Margen comercial")
    return c.build(name="Precio de venta", procedure="Aumento porcentual", prompt=f"Un comercio compra un artículo a {cost} pesos y quiere ganar un {m} % sobre el costo. ¿A qué precio debe venderlo?",
                   answer=A_num(sale, unit="pesos"), final=f"{num(sale)} pesos")


@generator("b32.presupuestos", "Presupuestos", {1: ["saldo"], 2: ["porcentajes"], 3: ["ahorro_meta"]})
def presupuestos(c: Ctx):
    ingreso = c.choice([8000, 10000, 12000, 15000, 20000])
    if c.variant == "saldo":
        gastos = [c.randint(5, 30) * 100 for _ in range(4)]
        libre = ingreso - sum(gastos)
        if libre < 0:
            c.retry()
        c.step("Sumar gastos", " + ".join(map(str, gastos)) + f" = {sum(gastos)}", procedure="Presupuesto", prompt="¿Gastos totales?", answer=A_int(sum(gastos)))
        c.step("Restar del ingreso", f"{ingreso} − {sum(gastos)} = {libre}")
        return c.build(name="Saldo del presupuesto", procedure="Suma y resta", prompt=f"Ingreso mensual: {ingreso}. Gastos: alquiler {gastos[0]}, comida {gastos[1]}, transporte {gastos[2]}, servicios {gastos[3]}. ¿Cuánto queda?",
                       answer=A_int(libre, "pesos"), final=f"{libre} pesos")
    if c.variant == "porcentajes":
        p = c.choice([50, 30, 20])
        v = ingreso * p // 100
        c.step("Regla 50/30/20", f"{p} % de {ingreso} = {v}", procedure="Distribución porcentual del presupuesto")
        cat = {50: "necesidades", 30: "deseos", 20: "ahorro"}[p]
        return c.build(name="Distribución del presupuesto", procedure="Porcentaje de una cantidad", prompt=f"Con la regla 50/30/20, ¿cuánto de un ingreso de {ingreso} pesos se destina a **{cat}** ({p} %)?",
                       answer=A_int(v, "pesos"), final=f"{v} pesos")
    meta = c.choice([6000, 9000, 12000, 18000])
    ah = c.choice([500, 750, 1000, 1500])
    meses = -(-meta // ah)
    c.step("Dividir la meta entre el ahorro mensual", f"{meta} ÷ {ah} = {num(F(meta, ah))}", procedure="Planificación del ahorro")
    c.step("Redondear hacia arriba", f"Hacen falta {meses} meses.", why="Si sobra una parte, hace falta un mes más.")
    return c.build(name="Meta de ahorro", procedure="División con redondeo hacia arriba", prompt=f"Quieres ahorrar {meta} pesos guardando {ah} al mes. ¿Cuántos meses necesitas como mínimo?",
                   answer=A_int(meses, "meses"), final=f"{meses} meses")


@generator("b32.finanzas_personales", "Finanzas personales", {1: ["ahorro"], 2: ["interes"], 3: ["deuda"]})
def finanzas_personales(c: Ctx):
    if c.variant == "ahorro":
        a, m = c.choice([200, 300, 500]), c.randint(3, 24)
        c.step("Ahorro acumulado", f"{a} × {m} = {a * m}", procedure="Ahorro periódico")
        return c.build(name="Ahorro periódico", procedure="Multiplicación", prompt=f"Si ahorras {a} pesos cada mes, ¿cuánto tendrás en {m} meses?", answer=A_int(a * m, "pesos"), final=f"{a * m} pesos")
    if c.variant == "interes":
        C, r = c.choice([5000, 10000]), c.choice([5, 10])
        M = C * F(100 + r, 100) ** 2
        c.step("Interés compuesto 2 años", f"{C} × {tex(F(100 + r, 100))}² = {num(M)}", procedure="Interés compuesto")
        return c.build(name="Inversión a dos años", procedure="Interés compuesto", prompt=f"Inviertes {C} pesos al {r} % anual compuesto. ¿Cuánto tendrás a los 2 años?", answer=A_num(M, unit="pesos"),
                       final=f"{num(M)} pesos")
    d = c.choice([1000, 2000, 5000])
    r = c.choice([2, 3, 5])
    M = d * F(100 + r, 100)
    c.step("Interés de un mes", f"{d} × {tex(F(100 + r, 100))} = {num(M)}", procedure="Costo de una deuda")
    return c.build(name="Costo de una deuda", procedure="Aumento porcentual", prompt=f"Una tarjeta cobra un {r} % mensual. Si debes {d} pesos y no pagas, ¿cuánto deberás al mes siguiente?",
                   answer=A_num(M, unit="pesos"), final=f"{num(M)} pesos")


@generator("b32.medidas", "Medidas y conversiones", {1: ["pintura"], 2: ["baldosas"], 3: ["tanque"]})
def medidas(c: Ctx):
    if c.variant == "pintura":
        a, b = c.randint(3, 8), c.randint(2, 4)
        rend = c.choice([5, 8, 10])
        area = 2 * (a + a) * b
        latas = -(-area // rend)
        c.step("Área de las paredes", f"Perímetro {4 * a} m × alto {b} m = {area} m²", procedure="Áreas y rendimientos", prompt="¿Área?", answer=A_int(area))
        c.step("Latas", f"{area} ÷ {rend} → {latas} (hacia arriba)")
        return c.build(name="Pintar una habitación", procedure="Área, división y redondeo hacia arriba", prompt=f"Una habitación cuadrada de {a} m de lado tiene paredes de {b} m de alto. Cada litro de pintura cubre {rend} m². ¿Cuántos litros (enteros) necesitas para las 4 paredes?",
                       answer=A_int(latas, "L"), final=f"{latas} L")
    if c.variant == "baldosas":
        a, b = c.randint(2, 6), c.randint(2, 6)
        t = c.choice([20, 25, 50])
        n = (a * 100 // t) * (b * 100 // t)
        c.step("Pasar a cm", f"{a} m = {a * 100} cm; {b} m = {b * 100} cm", procedure="Conversión y división")
        c.step("Baldosas por lado", f"{a * 100 // t} × {b * 100 // t} = {n}", prompt="¿Total de baldosas?", answer=A_int(n))
        return c.build(name="Embaldosar", procedure="Conversión de unidades y producto", prompt=f"¿Cuántas baldosas cuadradas de {t} cm de lado cubren un suelo de {a} m × {b} m?", answer=A_int(n), final=str(n))
    l, w, h = c.randint(1, 4), c.randint(1, 3), c.randint(1, 2)
    vol = l * w * h
    c.step("Volumen", f"{l} × {w} × {h} = {vol} m³", procedure="Volumen de un prisma")
    c.step("A litros", f"{vol} m³ = {vol * 1000} L", prompt="¿Litros?", answer=A_int(vol * 1000))
    return c.build(name="Capacidad de un tanque", procedure="Volumen y conversión a litros", prompt=f"Un tanque mide {l} m × {w} m × {h} m. ¿Cuántos litros caben?", answer=A_int(vol * 1000, "L"), final=f"{vol * 1000} L")


@generator("b32.ciencia_tecnologia", "Ciencia, tecnología e informática", {1: ["bytes"], 2: ["descarga"], 3: ["binario"]})
def ciencia_tecnologia(c: Ctx):
    if c.variant == "bytes":
        n = c.randint(2, 64)
        c.step("1 byte = 8 bits", f"{n} × 8 = {n * 8}", procedure="Unidades de información")
        return c.build(name="Bits y bytes", procedure="Conversión de unidades de información", prompt=f"¿Cuántos bits son {n} bytes?", answer=A_int(n * 8, "bits"), final=f"{n * 8} bits")
    if c.variant == "descarga":
        mb, v = c.choice([100, 200, 500, 800]), c.choice([5, 10, 20, 25])
        t = F(mb * 8, v)
        c.step("Megabytes a megabits", f"{mb} MB × 8 = {mb * 8} Mb", procedure="Velocidad de transferencia", prompt="¿Megabits?", answer=A_int(mb * 8))
        c.step("Tiempo = tamaño ÷ velocidad", f"{mb * 8} ÷ {v} = {num(t)} s")
        c.mistake("sin_8", "No convertiste bytes a bits", "La velocidad está en megabits por segundo: 1 byte = 8 bits.", F(mb, v), 0)
        return c.build(name="Tiempo de descarga", procedure="Conversión y división", prompt=f"Un archivo de {mb} MB se descarga a {v} Mb/s (megabits por segundo). ¿Cuántos segundos tarda?",
                       answer=A_num(t, unit="s"), final=f"{num(t)} s")
    n = c.randint(1, 8)
    c.step("Combinaciones de n bits", f"$2^{{{n}}} = {2**n}$", procedure="Potencias de 2 en informática")
    return c.build(name="Valores con n bits", procedure="2ⁿ", prompt=f"¿Cuántos valores distintos pueden representarse con {n} bits?", answer=A_int(2**n), final=str(2**n))


@generator("b32.problemas_reales", "Resolución de problemas reales e integración", {1: ["viaje"], 2: ["viaje", "fiesta"], 3: ["fiesta"]})
def problemas_reales(c: Ctx):
    if c.variant == "viaje":
        km = c.randint(150, 600)
        cons = c.choice([5, 6, 7, 8])
        price = F(c.randint(100, 250), 10)
        litros = F(km * cons, 100)
        cost = litros * price
        c.step("Litros", f"{km} km × {cons} L/100 km = {num(litros)} L", procedure="Problema integrador (proporciones y decimales)", prompt="¿Litros?", answer=A_num(litros))
        c.step("Costo", f"{num(litros)} × {decimal_str(price) if price.denominator > 1 else price} = {num(cost)}")
        return c.build(name="Costo de un viaje", procedure="Proporcionalidad y multiplicación de decimales",
                       prompt=f"Un coche consume {cons} L cada 100 km y la gasolina cuesta {num(price)} pesos el litro. ¿Cuánto cuesta en gasolina un viaje de {km} km?",
                       answer=A_num(cost, unit="pesos"), final=f"{num(cost)} pesos")
    p = c.randint(10, 40)
    porc = c.choice([2, 3])
    pizza = c.choice([8, 10, 12])
    precio = c.choice([120, 150, 180])
    pizzas = -(-(p * porc) // pizza)
    cost = pizzas * precio
    each = F(cost, p)
    c.step("Porciones necesarias", f"{p} × {porc} = {p * porc}", procedure="Problema integrador", prompt="¿Porciones?", answer=A_int(p * porc))
    c.step("Pizzas (hacia arriba)", f"{p * porc} ÷ {pizza} → {pizzas}", prompt="¿Pizzas?", answer=A_int(pizzas))
    c.step("Costo por persona", f"{cost} ÷ {p} = {fixed_str(each, 2)}")
    return c.build(name="Organizar una fiesta", procedure="División con redondeo y reparto", prompt=f"Para una fiesta de {p} personas se calculan {porc} porciones por persona. Cada pizza tiene {pizza} porciones y cuesta {precio} pesos. ¿Cuánto paga cada persona? (redondea a centésimas)",
                   answer=A_num(round_half_up(each, 2), unit="pesos"), final=f"{fixed_str(each, 2)} pesos")


@generator("b32.vida_cotidiana", "Aritmética en la vida cotidiana", {1: ["horario"], 2: ["horario", "propina"], 3: ["propina"]})
def vida_cotidiana(c: Ctx):
    if c.variant == "horario":
        h, m = c.randint(6, 20), c.choice([0, 15, 30, 45])
        d = c.randint(25, 200)
        tot = h * 60 + m + d
        fh, fm = divmod(tot, 60)
        c.step("Sumar minutos", f"{h}:{m:02d} + {d} min", procedure="Aritmética del tiempo")
        c.step("Convertir", f"{fh}:{fm:02d}")
        return c.build(name="¿A qué hora llega?", procedure="Suma en sistema sexagesimal", prompt=f"Un tren sale a las {h}:{m:02d} y el viaje dura {d} minutos. ¿A qué hora llega?",
                       answer=A_fields(("h", "Hora", A_int(fh % 24)), ("m", "Minutos", A_int(fm))), final=f"{fh % 24}:{fm:02d}")
    cuenta = c.randint(200, 1500)
    p = c.choice([10, 15])
    tip = F(cuenta * p, 100)
    c.step("Propina", f"{p} % de {cuenta} = {num(tip)}", procedure="Porcentaje de una cantidad")
    return c.build(name="Propina", procedure="Porcentaje", prompt=f"La cuenta de un restaurante es {cuenta} pesos. ¿Cuánto es una propina del {p} %?", answer=A_num(tip, unit="pesos"), final=f"{num(tip)} pesos")
