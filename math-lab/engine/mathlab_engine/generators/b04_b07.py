"""Bloques 04 (suma), 05 (resta), 06 (multiplicación) y 07 (división)."""

from __future__ import annotations

from ..algorithms.columns import (
    add_concat_columns,
    add_without_carry,
    column_add,
    column_sub,
    long_division,
    long_multiplication,
    mul_no_shift,
    mul_one_digit_no_carry,
    mul_one_digit_trace,
    place_name,
    sub_borrow_not_reduced,
    sub_smaller_from_larger,
)
from ..core.registry import Ctx, generator, mc
from ..numbers.fmt import signed_tex
from ._common import NAMES, A_choice_fixed, A_fields, A_int

# =========================================================== SUMA (B04) ====


def _carries(nums: list[int]) -> int:
    _t, cols = column_add(nums)
    return sum(1 for col in cols if col.carry_out)


def _pick_addends(c: Ctx, count: int, digits: int, min_carries: int, max_carries: int) -> list[int]:
    for _ in range(500):
        nums = [c.randint(10 ** (digits - 1), 10**digits - 1) for _ in range(count)]
        k = _carries(nums)
        if min_carries <= k <= max_carries:
            return nums
    c.retry()
    return []


def _explain_column_addition(c: Ctx, nums: list[int], interactive: bool = True) -> int:
    total, cols = column_add(nums)
    c.step("Identificar la operación", f"Es una **suma** de {len(nums)} números naturales (sumandos).",
           procedure="Suma de números naturales")
    c.step("Organizar los números", "Colocamos unidades debajo de unidades, decenas debajo de decenas, etc.",
           why="Sólo se pueden sumar cifras que representan el mismo orden (unidades con unidades…).",
           procedure="Suma vertical")
    for col in cols:
        pname = place_name(col.index)
        parts = " + ".join(str(d) for d in col.digits)
        if col.carry_in:
            parts += f" + {col.carry_in}"
            extra = f" (incluye {col.carry_in} que llevábamos)"
        else:
            extra = ""
        if col.carry_out:
            txt = (f"${parts} = {col.total}$.{extra} Escribimos **{col.write}** y **llevamos {col.carry_out}** "
                   f"a la columna de las {place_name(col.index + 1)}.")
            why = (f"{col.total} {place_name(col.index, col.total)} = {col.carry_out} {place_name(col.index + 1, col.carry_out)} "
                   f"y {col.write} {place_name(col.index, col.write)}: eso es **reagrupar**.")
            proc = "Suma con reagrupación (llevada)"
        else:
            txt = f"${parts} = {col.total}$.{extra} Escribimos **{col.write}**."
            why, proc = "", "Suma de una columna"
        last = col.index == len(cols) - 1
        if last and col.carry_out:
            txt = f"${parts} = {col.total}$.{extra} Como es la última columna, escribimos **{col.total}** completo."
        c.step(f"Resolver las {pname}", txt, why=why, procedure=proc,
               prompt=f"¿Cuánto suma la columna de las {pname}{' (con lo que llevas)' if col.carry_in else ''}?" if interactive else None,
               answer=A_int(col.total) if interactive else None)
    c.step("Leer el resultado", f"Resultado: **{total}**.", prop="")
    return total


@generator("b04.suma_naturales", "Suma de números naturales",
           {1: ["sin_llevar"], 2: ["una_llevada", "sin_llevar"], 3: ["varias_llevadas"]})
def suma_naturales(c: Ctx):
    digits = c.by_level(2, 3, c.randint(3, 5))
    rng = {"sin_llevar": (0, 0), "una_llevada": (1, 1), "varias_llevadas": (2, 9)}[c.variant]
    nums = _pick_addends(c, 2, digits, *rng)
    total = _explain_column_addition(c, nums)
    carry_step = next((i for i, s in enumerate(c.steps) if "llevamos" in s.explanation), None)
    c.mistake("sin_llevar", "Olvidaste llevar (reagrupar) a la columna siguiente",
              "Cuando una columna suma 10 o más, se escribe la unidad y se lleva la decena a la columna de la izquierda.",
              add_without_carry(nums), carry_step)
    c.mistake("columnas_completas", "Escribiste la suma completa de cada columna",
              "Si una columna da 15, no se escribe 15: se escribe 5 y se lleva 1.", add_concat_columns(nums), carry_step)
    return c.build(name="Suma de dos números naturales",
                   procedure="Suma vertical" + (" con reagrupación" if c.variant != "sin_llevar" else " sin reagrupación"),
                   prompt=f"Calcula: ${nums[0]} + {nums[1]}$", answer=A_int(total), final=str(total),
                   hints=("Empieza por las unidades (columna de la derecha).",
                          "Si una columna suma 10 o más, escribe la cifra de las unidades y lleva 1 a la siguiente."),
                   workspace={"type": "column", "op": "+", "operands": nums, "result": total})


@generator("b04.suma_reagrupacion", "Suma con reagrupación",
           {1: ["una_llevada"], 2: ["varias_llevadas"], 3: ["llevadas_en_cadena"]})
def suma_reagrupacion(c: Ctx):
    if c.variant == "llevadas_en_cadena":
        digits = c.randint(4, 5)
        nums = _pick_addends(c, 2, digits, digits - 1, digits)
    else:
        digits = c.by_level(2, 3, 4)
        nums = _pick_addends(c, 2, digits, *(1, 1) if c.variant == "una_llevada" else (2, 9))
    total = _explain_column_addition(c, nums)
    carry_step = next((i for i, s in enumerate(c.steps) if "llevamos" in s.explanation), None)
    c.mistake("sin_llevar", "Olvidaste llevar (reagrupar) a la columna siguiente",
              "Cuando una columna suma 10 o más, se escribe la unidad y se lleva la decena a la columna de la izquierda.",
              add_without_carry(nums), carry_step)
    c.mistake("columnas_completas", "Escribiste la suma completa de cada columna",
              "Si una columna da 15, no se escribe 15: se escribe 5 y se lleva 1.", add_concat_columns(nums), carry_step)
    return c.build(name="Suma con reagrupación", procedure="Suma de números naturales con reagrupación",
                   prompt=f"Calcula: ${nums[0]} + {nums[1]}$", answer=A_int(total), final=str(total),
                   hints=("Suma por columnas desde las unidades.", "10 unidades forman 1 decena: escribe la unidad y lleva la decena."),
                   workspace={"type": "column", "op": "+", "operands": nums, "result": total})


@generator("b04.suma_varios", "Suma de varios números", {1: ["tres"], 2: ["tres", "cuatro"], 3: ["cuatro", "cinco"]})
def suma_varios(c: Ctx):
    count = {"tres": 3, "cuatro": 4, "cinco": 5}[c.variant]
    digits = c.by_level(2, 3, 4)
    nums = _pick_addends(c, count, digits, 1, 9)
    total = _explain_column_addition(c, nums)
    c.mistake("sin_llevar", "Olvidaste llevar a la columna siguiente",
              "Con varios sumandos la llevada puede ser 2 o más: se lleva la cifra de las decenas completa.",
              add_without_carry(nums), None)
    return c.build(name=f"Suma de {count} números", procedure="Suma vertical de varios sumandos",
                   prompt="Calcula: $" + " + ".join(map(str, nums)) + "$", answer=A_int(total), final=str(total),
                   properties=("Propiedad asociativa",),
                   hints=("Con varios sumandos, una columna puede sumar 20 o más: entonces llevas 2.",),
                   workspace={"type": "column", "op": "+", "operands": nums, "result": total})


@generator("b04.suma_vertical", "Suma vertical", {1: ["base"], 2: ["base"], 3: ["base"]})
def suma_vertical(c: Ctx):
    digits_a = c.by_level(3, 4, 5)
    digits_b = c.by_level(2, 3, c.randint(2, 4))
    a = c.randint(10 ** (digits_a - 1), 10**digits_a - 1)
    b = c.randint(10 ** (digits_b - 1), 10**digits_b - 1)
    total = _explain_column_addition(c, [a, b])
    c.mistake("mal_alineado", "Alineaste los números por la izquierda",
              "Los números se alinean por la DERECHA (unidades con unidades).",
              a + b * 10 ** (digits_a - digits_b), 1)
    c.mistake("sin_llevar", "Olvidaste llevar", "Una columna de 10 o más genera una llevada.", add_without_carry([a, b]), None)
    return c.build(name="Suma vertical de números con distinta cantidad de cifras", procedure="Suma vertical (en columnas)",
                   prompt=f"Coloca en columnas y calcula: ${a} + {b}$", answer=A_int(total), final=str(total),
                   hints=("Alinea por la derecha: las unidades del número corto bajo las unidades del largo.",),
                   workspace={"type": "column", "op": "+", "operands": [a, b], "result": total})


@generator("b04.suma_enteros", "Suma de números enteros", {1: ["mismo_signo"], 2: ["distinto_signo"], 3: ["varios"]})
def suma_enteros(c: Ctx):
    if c.variant == "varios":
        nums = [c.randint(-60, 60) or 7 for _ in range(c.randint(3, 4))]
    else:
        a = c.randint(1, c.by_level(20, 60, 100))
        b = c.randint(1, c.by_level(20, 60, 100))
        if c.variant == "mismo_signo":
            s = c.choice([1, -1])
            nums = [s * a, s * b]
        else:
            if a == b:
                c.retry()
            nums = [a, -b] if c.rng.random() < 0.5 else [-a, b]
    total = sum(nums)
    expr = " + ".join(signed_tex(n) for n in nums)
    if len(nums) == 2 and (nums[0] > 0) == (nums[1] > 0):
        c.step("Mismo signo", "Si los sumandos tienen el mismo signo, se suman sus valores absolutos y se conserva el signo.",
               procedure="Suma de enteros de igual signo")
        c.step("Sumar valores absolutos", f"$|{nums[0]}| + |{nums[1]}| = {abs(nums[0]) + abs(nums[1])}$",
               prompt="¿Cuánto suman los valores absolutos?", answer=A_int(abs(nums[0]) + abs(nums[1])))
        c.step("Poner el signo común", f"Resultado: ${total}$")
    elif len(nums) == 2:
        big = max(nums, key=abs)
        c.step("Distinto signo", "Se RESTAN los valores absolutos (mayor menos menor) y se pone el signo del que tiene mayor valor absoluto.",
               procedure="Suma de enteros de distinto signo")
        c.step("Restar valores absolutos", f"${max(map(abs, nums))} - {min(map(abs, nums))} = {abs(total)}$",
               prompt="¿Cuánto da la resta de valores absolutos?", answer=A_int(abs(total)))
        c.step("Signo del mayor valor absoluto", f"El de mayor valor absoluto es ${big}$, así que el resultado es ${total}$.")
        c.mistake("signo", "El signo del resultado es incorrecto",
                  "El resultado lleva el signo del número con mayor valor absoluto.", -total, 2)
        c.mistake("sumo_absolutos", "Sumaste los valores absolutos",
                  "Con signos distintos, los valores absolutos se restan.", (abs(nums[0]) + abs(nums[1])) * (1 if big > 0 else -1), 1)
    else:
        pos = sum(n for n in nums if n > 0)
        neg = sum(n for n in nums if n < 0)
        c.step("Agrupar positivos y negativos", f"Positivos: {pos}. Negativos: {neg}.", procedure="Suma de varios enteros",
               prop="Propiedades conmutativa y asociativa", prompt="¿Cuánto suman los positivos?", answer=A_int(pos))
        c.step("Sumar los dos resultados", f"${pos} + {signed_tex(neg)} = {total}$")
    return c.build(name="Suma de números enteros", procedure="Suma de enteros con la regla de los signos",
                   prompt=f"Calcula: ${expr}$", answer=A_int(total), final=str(total),
                   hints=("Mismo signo: se suman y se conserva el signo. Distinto signo: se restan y gana el signo del mayor valor absoluto.",))


@generator("b04.suma_mental", "Suma mental", {1: ["decenas"], 2: ["compensacion", "decenas"], 3: ["compensacion"]})
def suma_mental(c: Ctx):
    if c.variant == "decenas":
        a, b = c.randint(11, 89), c.randint(11, 89)
        tb, ub = b // 10 * 10, b % 10
        c.step("Descomponer el segundo sumando", f"${b} = {tb} + {ub}$", procedure="Descomposición numérica")
        c.step("Sumar las decenas", f"${a} + {tb} = {a + tb}$", prompt=f"¿Cuánto es {a} + {tb}?", answer=A_int(a + tb))
        c.step("Sumar las unidades", f"${a + tb} + {ub} = {a + b}$", prop="Propiedad asociativa",
               prompt=f"¿Cuánto es {a + tb} + {ub}?", answer=A_int(a + b))
        proc = "Suma mental por descomposición"
    else:
        a = c.randint(12, 480)
        near = c.choice([9, 19, 29, 39, 49, 99, 98, 199])
        b = near
        up = (b // 10 + 1) * 10 if b % 10 != 0 else b
        diff = up - b
        c.step("Redondear un sumando", f"${b}$ está cerca de ${up}$ (le faltan {diff}).", procedure="Compensación")
        c.step("Sumar el número redondo", f"${a} + {up} = {a + up}$", prompt=f"¿Cuánto es {a} + {up}?", answer=A_int(a + up))
        c.step("Compensar", f"Sumamos {diff} de más, así que lo quitamos: ${a + up} - {diff} = {a + b}$",
               why="Si sumamos de más, restamos lo que sobra para que el resultado no cambie.",
               prompt=f"¿Cuánto es {a + up} − {diff}?", answer=A_int(a + b))
        c.mistake("compensacion_sentido", "Compensaste en el sentido equivocado",
                  "Sumaste de más, así que hay que RESTAR la diferencia.", a + up + diff, 2)
        proc = "Suma mental por compensación"
    return c.build(name="Suma mental", procedure=proc, prompt=f"Calcula mentalmente: ${a} + {b}$",
                   answer=A_int(a + b), final=str(a + b), hints=("Descompón en decenas y unidades, o redondea y compensa.",))


@generator("b04.propiedades_suma", "Propiedades de la suma", {1: ["identificar"], 2: ["identificar", "completar"], 3: ["completar"]})
def propiedades_suma(c: Ctx):
    a, b, k = c.randint(2, 99), c.randint(2, 99), c.randint(2, 99)
    props = {
        "Conmutativa": (f"{a} + {b} = {b} + {a}", "El orden de los sumandos no altera la suma."),
        "Asociativa": (f"({a} + {b}) + {k} = {a} + ({b} + {k})", "La forma de agrupar los sumandos no altera la suma."),
        "Elemento neutro": (f"{a} + 0 = {a}", "Sumar 0 no cambia un número."),
    }
    name = c.choice(list(props))
    expr, why = props[name]
    if c.variant == "identificar":
        ans = mc(c, name, [p for p in [*props, "Distributiva"] if p != name])
        c.step("Observar qué cambia", why, procedure="Identificación de propiedades", prop=f"Propiedad {name.lower()}")
        return c.build(name="Propiedades de la suma", procedure="Identificación de propiedades",
                       prompt=f"¿Qué propiedad de la suma se aplica? ${expr}$", answer=ans, final=name, properties=(name,))
    # completar el hueco
    if name == "Conmutativa":
        prompt, value = f"${a} + {b} = {b} + \\square$", a
    elif name == "Asociativa":
        prompt, value = f"$({a} + {b}) + {k} = {a} + (\\square + {k})$", b
    else:
        prompt, value = f"${a} + \\square = {a}$", 0
    c.step("Aplicar la propiedad", why, prop=f"Propiedad {name.lower()}")
    return c.build(name="Propiedades de la suma", procedure=f"Aplicación de la propiedad {name.lower()}",
                   prompt=f"Completa aplicando la propiedad **{name.lower()}**: {prompt}", answer=A_int(value),
                   final=str(value), properties=(name,))


@generator("b04.elementos_suma", "Elementos de la suma", {1: ["base"], 2: ["base"], 3: ["base"]})
def elementos_suma(c: Ctx):
    a, b = c.randint(10, 500), c.randint(10, 500)
    which = c.choice(["sumando", "suma"])
    if which == "suma":
        c.step("Recordar los nombres", "Los números que se suman son los **sumandos**; el resultado es la **suma** o total.",
               procedure="Terminología de la suma")
        return c.build(name="Elementos de la suma", procedure="Identificación de elementos",
                       prompt=f"En ${a} + {b} = {a + b}$, ¿cuál es la **suma** (total)?", answer=A_int(a + b), final=str(a + b))
    c.step("Usar la relación", f"Si ${a} + \\square = {a + b}$, el sumando que falta es ${a + b} - {a} = {b}$.",
           procedure="Sumando desconocido", why="La resta es la operación inversa de la suma.")
    c.mistake("sumo", "Sumaste en lugar de restar", "Para hallar un sumando que falta se resta el total menos el sumando conocido.",
              2 * a + b, 0)
    return c.build(name="Sumando desconocido", procedure="Cálculo del sumando desconocido",
                   prompt=f"Completa: ${a} + \\square = {a + b}$", answer=A_int(b), final=str(b))


_ITEMS = [("libros", "libros"), ("canicas", "canicas"), ("cromos", "cromos"), ("monedas", "monedas"), ("lápices", "lápices")]


@generator("b04.problemas_suma", "Problemas de suma", {1: ["juntar"], 2: ["juntar", "agregar"], 3: ["varios_pasos"]})
def problemas_suma(c: Ctx):
    n1, n2 = c.sample(NAMES, 2)
    item = c.choice(_ITEMS)[0]
    a, b = c.randint(10, c.by_level(99, 999, 4999)), c.randint(10, c.by_level(99, 999, 4999))
    if c.variant == "varios_pasos":
        d = c.randint(10, 999)
        total = a + b + d
        c.step("Comprender el enunciado", "Se pregunta por el total reunido en tres días.", procedure="Resolución de problemas")
        c.step("Identificar los datos", f"Día 1: {a}; día 2: {b}; día 3: {d}.")
        c.step("Elegir la operación", "Reunir cantidades → **suma**.", prompt="¿Cuánto suman los dos primeros días?", answer=A_int(a + b))
        c.step("Resolver", f"${a} + {b} + {d} = {total}$", prompt="¿Cuál es el total?", answer=A_int(total))
        c.step("Comprobar", "El total es mayor que cada cantidad por separado: tiene sentido.")
        return c.build(name="Problema de suma de varios pasos", procedure="Suma de varios sumandos",
                       prompt=f"Una biblioteca recibió {a} {item} el lunes, {b} el martes y {d} el miércoles. ¿Cuántos {item} recibió en total?",
                       answer=A_int(total, item), final=f"{total} {item}")
    total = a + b
    story = (f"{n1} tiene {a} {item} y {n2} tiene {b} {item}. ¿Cuántos {item} tienen entre los dos?" if c.variant == "juntar"
             else f"{n1} tenía {a} {item} y le regalaron {b} más. ¿Cuántos {item} tiene ahora?")
    c.step("Comprender el enunciado", "Se pregunta por una cantidad total.", procedure="Resolución de problemas")
    c.step("Identificar datos e incógnita", f"Datos: {a} y {b}. Incógnita: el total.")
    c.step("Elegir la operación", "Juntar o agregar cantidades → **suma**.")
    c.step("Resolver", f"${a} + {b} = {total}$", prompt="¿Cuánto da la operación?", answer=A_int(total))
    c.step("Responder con unidades", f"Respuesta: {total} {item}.")
    c.mistake("resto", "Restaste en lugar de sumar", "Cuando se juntan o se agregan cantidades, se suma.", abs(a - b), 2)
    return c.build(name="Problema de suma", procedure="Resolución de problemas mediante suma",
                   prompt=story, answer=A_int(total, item), final=f"{total} {item}")


@generator("b04.concepto_suma", "Concepto de suma", {1: ["base"], 2: ["base"], 3: ["base"]})
def concepto_suma(c: Ctx):
    a, b = c.randint(2, 9), c.randint(2, 9)
    c.step("Juntar dos grupos", f"Un grupo de {a} objetos y otro de {b}: al juntarlos contamos {a + b}.", procedure="Suma como unión de cantidades")
    return c.build(name="Concepto de suma", procedure="Suma como unión de cantidades",
                   prompt=f"En una caja hay {a} 🟦 y en otra {b} 🟦. Si juntamos todos en una sola caja, ¿cuántos hay?",
                   answer=A_int(a + b), final=str(a + b))


# =========================================================== RESTA (B05) ===


def _explain_column_sub(c: Ctx, a: int, b: int, interactive: bool = True) -> int:
    diff, cols = column_sub(a, b)
    c.step("Identificar la operación", f"Es una **resta**: minuendo {a}, sustraendo {b}.", procedure="Resta de números naturales")
    c.step("Organizar los números", "El minuendo arriba y el sustraendo abajo, alineados por la derecha.", procedure="Resta vertical")
    for col in cols:
        pname = place_name(col.index)
        if col.borrowed:
            txt = (f"Arriba hay {col.top} y abajo {col.bottom}: como {col.top} < {col.bottom}, **desagrupamos**: tomamos 1 de "
                   f"las {place_name(col.index + 1)} (que valen 10 {pname}). Ahora tenemos {col.effective_top}. "
                   f"${col.effective_top} - {col.bottom} = {col.write}$.")
            why = f"1 {place_name(col.index + 1, 1)} = 10 {pname}."
            proc = "Resta con desagrupación (préstamo)"
        else:
            txt = f"${col.top} - {col.bottom} = {col.write}$."
            why, proc = "", "Resta de una columna"
        c.step(f"Resolver las {pname}", txt, why=why, procedure=proc,
               prompt=f"¿Qué cifra escribes en las {pname}?" if interactive else None,
               answer=A_int(col.write) if interactive else None)
    c.step("Leer el resultado", f"Diferencia: **{diff}**.")
    return diff


def _pick_sub(c: Ctx, digits: int, borrows: tuple[int, int], zero_middle: bool = False) -> tuple[int, int]:
    for _ in range(500):
        a = c.randint(10 ** (digits - 1), 10**digits - 1)
        if zero_middle:
            s = list(str(a))
            s[1] = "0"
            a = int("".join(s))
        b = c.randint(10 ** max(0, digits - 2), a - 1)
        _d, cols = column_sub(a, b)
        k = sum(col.borrowed for col in cols)
        if borrows[0] <= k <= borrows[1]:
            return a, b
    c.retry()
    return 0, 0


@generator("b05.resta_naturales", "Resta de números naturales", {1: ["sin_prestamo"], 2: ["con_prestamo", "sin_prestamo"], 3: ["con_prestamo"]})
def resta_naturales(c: Ctx):
    digits = c.by_level(2, 3, 4)
    a, b = _pick_sub(c, digits, (0, 0) if c.variant == "sin_prestamo" else (1, 9))
    diff = _explain_column_sub(c, a, b)
    c.mistake("menor_del_mayor", "Restaste la cifra menor de la mayor en cada columna",
              "No se puede invertir el orden: si arriba hay menos, hay que desagrupar.", sub_smaller_from_larger(a, b), 2)
    c.mistake("prestamo_no_descontado", "Desagrupaste pero no descontaste 1 en la columna siguiente",
              "Al pedir prestado, la columna de la izquierda queda con 1 menos.", sub_borrow_not_reduced(a, b), 3)
    return c.build(name="Resta de números naturales", procedure="Resta vertical" + (" con desagrupación" if c.variant != "sin_prestamo" else ""),
                   prompt=f"Calcula: ${a} - {b}$", answer=A_int(diff), final=str(diff),
                   hints=("Empieza por las unidades.", "Si la cifra de arriba es menor, pide 1 a la columna de la izquierda."),
                   workspace={"type": "column", "op": "-", "operands": [a, b], "result": diff})


@generator("b05.resta_desagrupacion", "Resta con desagrupación", {1: ["una"], 2: ["varias"], 3: ["con_ceros"]})
def resta_desagrupacion(c: Ctx):
    if c.variant == "con_ceros":
        digits = c.randint(3, 4)
        a = c.choice([10**digits // 10 * k for k in range(1, 10)]) + c.randint(0, 9)
        if a < 10 ** (digits - 1):
            c.retry()
        b = c.randint(10 ** (digits - 2), a - 1)
        _d, cols = column_sub(a, b)
        if not cols[0].borrowed:  # el préstamo debe atravesar el cero
            c.retry()
    else:
        a, b = _pick_sub(c, c.by_level(2, 3, 4), (1, 1) if c.variant == "una" else (2, 9))
    diff = _explain_column_sub(c, a, b)
    c.mistake("menor_del_mayor", "Restaste la cifra menor de la mayor",
              "Si arriba hay una cifra menor, hay que desagrupar una unidad del orden siguiente.", sub_smaller_from_larger(a, b), 2)
    c.mistake("prestamo_no_descontado", "No descontaste la unidad que pediste prestada",
              "Después de desagrupar, la columna de la izquierda tiene 1 menos.", sub_borrow_not_reduced(a, b), 3)
    return c.build(name="Resta con desagrupación", procedure="Resta de números naturales con desagrupación",
                   prompt=f"Calcula: ${a} - {b}$", answer=A_int(diff), final=str(diff),
                   hints=("Con ceros en el minuendo, se desagrupa desde la primera cifra distinta de cero a la izquierda: 100 = 9 decenas + 10 unidades.",),
                   workspace={"type": "column", "op": "-", "operands": [a, b], "result": diff})


@generator("b05.resta_vertical", "Resta vertical", {1: ["base"], 2: ["base"], 3: ["base"]})
def resta_vertical(c: Ctx):
    da = c.by_level(3, 4, 5)
    a = c.randint(10 ** (da - 1), 10**da - 1)
    b = c.randint(10, min(a - 1, 10 ** (da - 1) * 3))
    diff = _explain_column_sub(c, a, b)
    c.mistake("menor_del_mayor", "Restaste la cifra menor de la mayor", "Hay que desagrupar cuando arriba hay menos.",
              sub_smaller_from_larger(a, b), 2)
    return c.build(name="Resta vertical", procedure="Resta vertical (en columnas)", prompt=f"Coloca en columnas y calcula: ${a} - {b}$",
                   answer=A_int(diff), final=str(diff), workspace={"type": "column", "op": "-", "operands": [a, b], "result": diff})


@generator("b05.resta_enteros", "Resta de números enteros", {1: ["positivo_menos_mayor"], 2: ["menos_negativo"], 3: ["mixto"]})
def resta_enteros(c: Ctx):
    if c.variant == "positivo_menos_mayor":
        a = c.randint(1, 30)
        b = c.randint(a + 1, a + 40)
    elif c.variant == "menos_negativo":
        a = c.randint(-50, 50)
        b = -c.randint(1, 50)
    else:
        a, b = c.randint(-80, 80), c.randint(-80, 80)
    res = a - b
    c.step("Restar es sumar el opuesto", f"${signed_tex(a)} - {signed_tex(b)} = {signed_tex(a)} + {signed_tex(-b)}$",
           procedure="Resta de enteros como suma del opuesto", why="a − b = a + (−b): el opuesto de b deshace a b.",
           prompt=f"¿Cuál es el opuesto de {b}?", answer=A_int(-b))
    c.step("Sumar con la regla de los signos", f"${signed_tex(a)} + {signed_tex(-b)} = {res}$", prompt="¿Cuál es el resultado?", answer=A_int(res))
    c.mistake("no_cambio_signo", "No cambiaste el signo del sustraendo", "Restar un negativo equivale a sumar su opuesto positivo.", a + b, 0)
    c.mistake("signo_resultado", "Signo del resultado incorrecto", "Revisa cuál número tiene mayor valor absoluto.", -res, 1)
    return c.build(name="Resta de números enteros", procedure="Suma del opuesto", prompt=f"Calcula: ${signed_tex(a)} - {signed_tex(b)}$",
                   answer=A_int(res), final=str(res), hints=("Restar es sumar el opuesto: a − b = a + (−b).",))


@generator("b05.relacion_suma_resta", "Relación entre suma y resta", {1: ["sumando"], 2: ["minuendo", "sumando"], 3: ["sustraendo", "minuendo"]})
def relacion_suma_resta(c: Ctx):
    a = c.randint(100, c.by_level(500, 2000, 9999))
    b = c.randint(10, a - 1)
    d = a - b
    if c.variant == "sumando":
        prompt, val, how = f"$\\square + {b} = {a}$", d, f"${a} - {b} = {d}$"
    elif c.variant == "minuendo":
        prompt, val, how = f"$\\square - {b} = {d}$", a, f"${d} + {b} = {a}$ (minuendo = diferencia + sustraendo)"
    else:
        prompt, val, how = f"${a} - \\square = {d}$", b, f"${a} - {d} = {b}$ (sustraendo = minuendo − diferencia)"
    c.step("Usar la operación inversa", "La suma y la resta son operaciones inversas: una deshace a la otra.",
           procedure="Operación inversa", prop="Relación entre suma y resta")
    c.step("Calcular", how, prompt="¿Qué número falta?", answer=A_int(val))
    return c.build(name="Término desconocido", procedure="Uso de la operación inversa", prompt=f"Completa: {prompt}",
                   answer=A_int(val), final=str(val))


@generator("b05.comprobacion_resta", "Comprobación de la resta", {1: ["base"], 2: ["base"], 3: ["base"]})
def comprobacion_resta(c: Ctx):
    a = c.randint(100, 9999)
    b = c.randint(10, a - 1)
    correct = c.rng.random() < 0.5
    shown = a - b if correct else a - b + c.choice([-10, -1, 1, 10, 100])
    c.step("Prueba de la resta", f"Si ${a} - {b} = {shown}$ es correcto, entonces ${shown} + {b}$ debe dar ${a}$.",
           procedure="Comprobación de la resta", why="Diferencia + sustraendo = minuendo.")
    c.step("Sumar", f"${shown} + {b} = {shown + b}$", prompt=f"¿Cuánto es {shown} + {b}?", answer=A_int(shown + b))
    c.step("Comparar", f"{'Coincide' if correct else 'No coincide'} con el minuendo {a}.")
    return c.build(name="Comprobación de una resta", procedure="Prueba de la resta (diferencia + sustraendo = minuendo)",
                   prompt=f"Un compañero calculó ${a} - {b} = {shown}$. ¿Es correcto?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if correct else "No"), final="Sí" if correct else "No")


@generator("b05.resta_mental", "Resta mental", {1: ["decenas"], 2: ["compensacion"], 3: ["compensacion", "completar"]})
def resta_mental(c: Ctx):
    if c.variant == "decenas":
        a = c.randint(40, 99)
        b = c.randint(11, a - 1)
        tb, ub = b // 10 * 10, b % 10
        c.step("Descomponer el sustraendo", f"${b} = {tb} + {ub}$", procedure="Descomposición numérica")
        c.step("Restar las decenas", f"${a} - {tb} = {a - tb}$", prompt=f"¿{a} − {tb}?", answer=A_int(a - tb))
        c.step("Restar las unidades", f"${a - tb} - {ub} = {a - b}$", prompt=f"¿{a - tb} − {ub}?", answer=A_int(a - b))
        proc = "Resta mental por descomposición"
    elif c.variant == "compensacion":
        a = c.randint(120, 900)
        b = c.choice([19, 29, 39, 49, 99, 98, 199])
        up = (b // 10 + 1) * 10
        diff = up - b
        c.step("Redondear el sustraendo", f"${b} \\to {up}$ (sumamos {diff}).", procedure="Compensación")
        c.step("Restar el número redondo", f"${a} - {up} = {a - up}$", prompt=f"¿{a} − {up}?", answer=A_int(a - up))
        c.step("Compensar", f"Quitamos {diff} de más, así que lo devolvemos: ${a - up} + {diff} = {a - b}$",
               why="Si restamos de más, sumamos la diferencia.", prompt=f"¿{a - up} + {diff}?", answer=A_int(a - b))
        c.mistake("compensacion_sentido", "Compensaste en el sentido equivocado", "Restaste de más: ahora hay que SUMAR la diferencia.",
                  a - up - diff, 2)
        proc = "Resta mental por compensación"
    else:
        b = c.randint(120, 880)
        a = (b // 100 + c.randint(1, 3)) * 100
        c.step("Contar hacia arriba", f"De {b} a {(b // 100 + 1) * 100}: {(b // 100 + 1) * 100 - b}. De ahí a {a}: {a - (b // 100 + 1) * 100}.",
               procedure="Resta por complemento (contar hacia arriba)")
        c.step("Sumar los saltos", f"Total: {a - b}", prompt="¿Cuánto suman los saltos?", answer=A_int(a - b))
        proc = "Resta mental contando hacia arriba"
    return c.build(name="Resta mental", procedure=proc, prompt=f"Calcula mentalmente: ${a} - {b}$", answer=A_int(a - b), final=str(a - b))


@generator("b05.elementos_resta", "Elementos de la resta", {1: ["base"], 2: ["base"], 3: ["base"]})
def elementos_resta(c: Ctx):
    a = c.randint(50, 999)
    b = c.randint(10, a - 1)
    role = c.choice(["minuendo", "sustraendo", "diferencia"])
    val = {"minuendo": a, "sustraendo": b, "diferencia": a - b}[role]
    c.step("Recordar los nombres", "Minuendo − sustraendo = diferencia (o resto).", procedure="Terminología de la resta")
    return c.build(name="Elementos de la resta", procedure="Identificación de elementos",
                   prompt=f"En ${a} - {b} = {a - b}$, ¿cuál es el **{role}**?", answer=A_int(val), final=str(val))


@generator("b05.concepto_resta", "Concepto de resta", {1: ["quitar"], 2: ["comparar"], 3: ["comparar"]})
def concepto_resta(c: Ctx):
    n1, n2 = c.sample(NAMES, 2)
    a, b = c.randint(20, 90), c.randint(5, 19)
    if c.variant == "quitar":
        c.step("Quitar", "La resta responde a ¿cuánto queda si quito?", procedure="Resta como quitar")
        return c.build(name="Concepto de resta", procedure="Resta como quitar", prompt=f"Había {a} sillas y se llevaron {b}. ¿Cuántas quedan?",
                       answer=A_int(a - b), final=str(a - b))
    c.step("Comparar", "La resta también responde a ¿cuánto más tiene uno que otro?", procedure="Resta como comparación")
    return c.build(name="Concepto de resta", procedure="Resta como comparación",
                   prompt=f"{n1} mide {a + 100} cm y {n2} mide {a + 100 - b} cm. ¿Cuántos centímetros más mide {n1}?",
                   answer=A_int(b, "cm"), final=f"{b} cm")


@generator("b05.problemas_resta", "Problemas de resta", {1: ["quitar"], 2: ["comparar", "quitar"], 3: ["varios_pasos"]})
def problemas_resta(c: Ctx):
    n1 = c.choice(NAMES)
    a = c.randint(100, c.by_level(999, 4999, 9999))
    b = c.randint(10, a - 1)
    if c.variant == "varios_pasos":
        e = c.randint(10, max(11, a - b - 1)) if a - b > 11 else c.retry()
        rest = a - b - e
        c.step("Comprender", "Se gasta dos veces: hay que restar ambas cantidades.", procedure="Resolución de problemas")
        c.step("Primera resta", f"${a} - {b} = {a - b}$", prompt="¿Cuánto queda tras el primer gasto?", answer=A_int(a - b))
        c.step("Segunda resta", f"${a - b} - {e} = {rest}$", prompt="¿Cuánto queda al final?", answer=A_int(rest))
        c.step("Comprobar", f"${rest} + {e} + {b} = {a}$ ✓")
        c.mistake("solo_una", "Restaste sólo uno de los gastos", "Hay dos gastos; ambos se restan.", a - b, 2)
        return c.build(name="Problema de resta de varios pasos", procedure="Restas sucesivas",
                       prompt=f"{n1} tenía {a} pesos. Gastó {b} en comida y {e} en transporte. ¿Cuánto le queda?",
                       answer=A_int(rest, "pesos"), final=f"{rest} pesos")
    if c.variant == "comparar":
        story = f"Un tren lleva {a} pasajeros y un autobús {b}. ¿Cuántos pasajeros más lleva el tren?"
    else:
        story = f"{n1} tenía {a} cromos y regaló {b}. ¿Cuántos cromos le quedan?"
    c.step("Comprender", "Se pregunta cuánto queda o cuánto más hay.", procedure="Resolución de problemas")
    c.step("Elegir la operación", "Quitar o comparar → **resta**.")
    c.step("Resolver", f"${a} - {b} = {a - b}$", prompt="¿Resultado?", answer=A_int(a - b))
    c.step("Comprobar", f"${a - b} + {b} = {a}$ ✓", procedure="Comprobación de la resta")
    c.mistake("sumo", "Sumaste en lugar de restar", "Quitar o comparar se resuelve con una resta.", a + b, 1)
    return c.build(name="Problema de resta", procedure="Resolución de problemas mediante resta", prompt=story, answer=A_int(a - b), final=str(a - b))


# ===================================================== MULTIPLICACIÓN (B06) ==


@generator("b06.tablas", "Tablas de multiplicar", {1: ["facil"], 2: ["todas"], 3: ["inversa"]})
def tablas(c: Ctx):
    a = c.randint(2, 5) if c.variant == "facil" else c.randint(2, 10)
    b = c.randint(1, 10)
    if c.variant == "inversa":
        c.step("Pensar en la tabla", f"¿Qué número multiplicado por {a} da {a * b}?", procedure="Factor desconocido")
        c.step("Recorrer la tabla del " + str(a), f"${a} \\times {b} = {a * b}$")
        return c.build(name="Factor desconocido en las tablas", procedure="Tablas de multiplicar (inversa)",
                       prompt=f"Completa: ${a} \\times \\square = {a * b}$", answer=A_int(b), final=str(b))
    c.step("Tabla del " + str(a), f"${a} \\times {b} = {a * b}$", procedure="Tablas de multiplicar",
           why=f"Es sumar {a} un total de {b} veces." if b > 1 else "")
    c.mistake("suma", "Sumaste en lugar de multiplicar", "× significa sumar el número varias veces.", a + b, 0)
    c.mistake("vecino", "Tomaste un resultado vecino de la tabla", f"Repasa la tabla del {a}.", a * (b + 1), 0)
    return c.build(name="Tablas de multiplicar", procedure="Tablas de multiplicar", prompt=f"${a} \\times {b} = ?$",
                   answer=A_int(a * b), final=str(a * b))


@generator("b06.suma_repetida", "Multiplicación como suma repetida", {1: ["a_mult"], 2: ["a_suma"], 3: ["a_mult"]})
def suma_repetida(c: Ctx):
    a, k = c.randint(2, 12), c.randint(3, 7)
    rep = " + ".join([str(a)] * k)
    if c.variant == "a_suma":
        c.step("Interpretar", f"${a} \\times {k}$ significa sumar {a} un total de {k} veces.", procedure="Multiplicación como suma repetida")
        c.step("Sumar", f"${rep} = {a * k}$", prompt="¿Resultado?", answer=A_int(a * k))
        return c.build(name="Suma repetida", procedure="Multiplicación como suma repetida",
                       prompt=f"Escribe ${a} \\times {k}$ como suma repetida. ¿Cuánto vale?", answer=A_int(a * k), final=str(a * k))
    c.step("Contar sumandos", f"Hay {k} sumandos iguales a {a}.", procedure="Multiplicación como suma repetida",
           prompt="¿Cuántas veces se repite el sumando?", answer=A_int(k))
    c.step("Escribir como producto", f"${a} \\times {k} = {a * k}$")
    return c.build(name="De suma repetida a multiplicación", procedure="Multiplicación como suma repetida",
                   prompt=f"Calcula usando una multiplicación: ${rep}$", answer=A_int(a * k), final=str(a * k))


@generator("b06.mult_una_cifra", "Multiplicación por una cifra", {1: ["sin_llevar"], 2: ["con_llevadas"], 3: ["con_llevadas"]})
def mult_una_cifra(c: Ctx):
    for _ in range(300):
        a = c.randint(10 ** (c.by_level(1, 2, 3)), 10 ** (c.by_level(2, 3, 4)) - 1)
        d = c.randint(2, 9)
        tr = mul_one_digit_trace(a, d)
        has = any(x[4] for x in tr[:-1])
        if has == (c.variant == "con_llevadas"):
            break
    else:
        c.retry()
    c.step("Identificar la operación", f"Multiplicamos {a} (multiplicando) por {d} (multiplicador).", procedure="Multiplicación por una cifra")
    for i, x, cin, p, cout in tr:
        last = i == len(tr) - 1
        op = f"{x} \\times {d}" + (f" + {cin}" if cin else "")
        txt = f"${op} = {p}$. " + (
            f"Escribimos {p}." if last else (f"Escribimos {p % 10} y llevamos {cout}." if cout else f"Escribimos {p}."))
        c.step(f"Multiplicar las {place_name(i)}", txt, procedure="Multiplicación con llevada" if cout else "",
               prompt=f"¿Cuánto da {x} × {d}{' + ' + str(cin) if cin else ''}?", answer=A_int(p))
    c.step("Resultado", f"${a} \\times {d} = {a * d}$")
    c.mistake("sin_llevar", "Olvidaste sumar lo que llevabas", "La llevada se suma DESPUÉS de multiplicar la siguiente cifra.",
              mul_one_digit_no_carry(a, d), 2)
    return c.build(name="Multiplicación por una cifra", procedure="Multiplicación por una cifra" + (" con llevadas" if c.variant == "con_llevadas" else ""),
                   prompt=f"Calcula: ${a} \\times {d}$", answer=A_int(a * d), final=str(a * d),
                   hints=("Multiplica cada cifra empezando por las unidades y suma lo que llevas.",),
                   workspace={"type": "column", "op": "×", "operands": [a, d], "result": a * d})


@generator("b06.mult_varias_cifras", "Multiplicación por varias cifras", {1: ["dos_por_dos"], 2: ["tres_por_dos"], 3: ["tres_por_tres"]})
def mult_varias_cifras(c: Ctx):
    da, db = {"dos_por_dos": (2, 2), "tres_por_dos": (3, 2), "tres_por_tres": (3, 3)}[c.variant]
    a = c.randint(10 ** (da - 1) + 1, 10**da - 1)
    b = c.randint(10 ** (db - 1) + 1, 10**db - 1)
    if "0" in str(b):
        c.retry()
    prod, rows = long_multiplication(a, b)
    c.step("Organizar", f"Multiplicando {a}, multiplicador {b}. Multiplicaremos {a} por cada cifra de {b}.",
           procedure="Multiplicación por varias cifras (algoritmo largo)", prop="Propiedad distributiva",
           why=f"${a} \\times {b} = " + " + ".join(f"{a} \\times {r.digit * 10**r.place}" for r in rows) + "$")
    for r in rows:
        shift = f", desplazado {r.place} lugar{'es' if r.place > 1 else ''} a la izquierda (equivale a × {10**r.place})" if r.place else ""
        c.step(f"Producto parcial por la cifra de las {place_name(r.place)}", f"${a} \\times {r.digit} = {a * r.digit}${shift} → **{r.partial}**",
               why="Cada cifra del multiplicador vale según su posición." if r.place else "",
               prompt=f"¿Cuál es el producto parcial (ya desplazado) para la cifra {r.digit}?", answer=A_int(r.partial))
    c.step("Sumar los productos parciales", " + ".join(str(r.partial) for r in rows) + f" = {prod}",
           prompt="¿Cuánto suman los productos parciales?", answer=A_int(prod))
    c.mistake("sin_desplazar", "No desplazaste los productos parciales",
              "El producto por las decenas vale 10 veces más: se escribe corrido un lugar a la izquierda.", mul_no_shift(a, b), 2)
    return c.build(name="Multiplicación por varias cifras", procedure="Algoritmo de la multiplicación larga",
                   prompt=f"Calcula: ${a} \\times {b}$", answer=A_int(prod), final=str(prod), properties=("Distributiva",),
                   workspace={"type": "column", "op": "×", "operands": [a, b], "result": prod, "partials": [r.partial for r in rows]})


@generator("b06.mult_potencias_10", "Multiplicación por 10, 100 y 1000", {1: ["natural"], 2: ["natural", "terminado_cero"], 3: ["terminado_cero"]})
def mult_potencias_10(c: Ctx):
    p = c.choice([10, 100, 1000])
    zeros = len(str(p)) - 1
    if c.variant == "natural":
        a = c.randint(2, 999)
        c.step("Contar los ceros", f"{p} tiene {zeros} cero(s).", procedure="Multiplicación por la unidad seguida de ceros")
        c.step("Añadir los ceros", f"${a} \\times {p} = {a * p}$", why="Cada × 10 desplaza todas las cifras una posición a la izquierda.")
        c.mistake("ceros", "Añadiste un número incorrecto de ceros", f"Por {p} se añaden {zeros} ceros.", a * p * 10, 1)
        return c.build(name=f"Multiplicación por {p}", procedure="Multiplicación por potencias de 10", prompt=f"${a} \\times {p}$",
                       answer=A_int(a * p), final=str(a * p))
    a = c.randint(2, 99) * 10
    m = c.randint(2, 9) * p
    c.step("Separar los ceros", f"${a} \\times {m} = ({a // 10} \\times {m // p}) \\times (10 \\times {p})$",
           procedure="Multiplicación de números terminados en cero", prop="Propiedades conmutativa y asociativa")
    c.step("Multiplicar sin ceros", f"${a // 10} \\times {m // p} = {a // 10 * (m // p)}$", prompt="¿Producto sin ceros?",
           answer=A_int(a // 10 * (m // p)))
    c.step("Añadir todos los ceros", f"Añadimos {zeros + 1} ceros: {a * m}")
    return c.build(name="Multiplicación por múltiplos de 10", procedure="Multiplicación de números terminados en cero",
                   prompt=f"${a} \\times {m}$", answer=A_int(a * m), final=str(a * m))


@generator("b06.mult_enteros", "Multiplicación de números enteros", {1: ["dos"], 2: ["dos"], 3: ["tres"]})
def mult_enteros(c: Ctx):
    k = 2 if c.variant == "dos" else 3
    nums = [c.choice([-1, 1]) * c.randint(2, c.by_level(9, 15, 9)) for _ in range(k)]
    prod = 1
    for n in nums:
        prod *= n
    negs = sum(1 for n in nums if n < 0)
    c.step("Regla de los signos", f"Hay {negs} factor(es) negativo(s): " + ("número par → resultado **positivo**." if negs % 2 == 0 else
           "número impar → resultado **negativo**."), procedure="Regla de los signos",
           prompt="¿El resultado es positivo o negativo? (1 = positivo, −1 = negativo)", answer=A_int(1 if prod > 0 else -1))
    c.step("Multiplicar valores absolutos", " × ".join(str(abs(n)) for n in nums) + f" = {abs(prod)}", answer=A_int(abs(prod)),
           prompt="¿Producto de los valores absolutos?")
    c.step("Resultado", f"${prod}$")
    c.mistake("signo", "Signo incorrecto", "(−)·(−) = (+); (−)·(+) = (−).", -prod, 0)
    return c.build(name="Multiplicación de enteros", procedure="Multiplicación con la regla de los signos",
                   prompt="Calcula: $" + " \\times ".join(signed_tex(n) for n in nums) + "$", answer=A_int(prod), final=str(prod))


@generator("b06.propiedades_mult", "Propiedades de la multiplicación", {1: ["identificar"], 2: ["identificar", "distributiva"], 3: ["distributiva"]})
def propiedades_mult(c: Ctx):
    a, b, k = c.randint(2, 20), c.randint(2, 20), c.randint(2, 20)
    props = {
        "Conmutativa": f"{a} \\times {b} = {b} \\times {a}",
        "Asociativa": f"({a} \\times {b}) \\times {k} = {a} \\times ({b} \\times {k})",
        "Elemento neutro": f"{a} \\times 1 = {a}",
        "Distributiva": f"{a} \\times ({b} + {k}) = {a} \\times {b} + {a} \\times {k}",
        "Elemento absorbente": f"{a} \\times 0 = 0",
    }
    if c.variant == "identificar":
        name = c.choice(list(props))
        ans = mc(c, name, [p for p in props if p != name][:3])
        c.step("Observar la igualdad", f"${props[name]}$", procedure="Identificación de propiedades", prop=name)
        return c.build(name="Propiedades de la multiplicación", procedure="Identificación de propiedades",
                       prompt=f"¿Qué propiedad se aplica? ${props[name]}$", answer=ans, final=name, properties=(name,))
    t = c.choice([10, 20, 100])
    u = c.randint(1, 9)
    c.step("Descomponer", f"${t + u} = {t} + {u}$", procedure="Aplicación de la propiedad distributiva", prop="Distributiva")
    c.step("Distribuir", f"${a} \\times {t} + {a} \\times {u} = {a * t} + {a * u}$", prompt=f"¿{a} × {t}?", answer=A_int(a * t))
    c.step("Sumar", f"${a * t} + {a * u} = {a * (t + u)}$", prompt="¿Resultado?", answer=A_int(a * (t + u)))
    c.mistake("no_distribuye", "Multiplicaste sólo el primer sumando", "El factor multiplica a CADA sumando.", a * t + u, 1)
    return c.build(name="Propiedad distributiva", procedure="Aplicación de la propiedad distributiva",
                   prompt=f"Calcula usando la propiedad distributiva: ${a} \\times {t + u} = {a} \\times ({t} + {u})$",
                   answer=A_int(a * (t + u)), final=str(a * (t + u)), properties=("Distributiva",))


@generator("b06.mult_mental", "Multiplicación mental", {1: ["por_5"], 2: ["descomponer"], 3: ["por_9_11"]})
def mult_mental(c: Ctx):
    if c.variant == "por_5":
        a = c.randint(2, 99) * 2
        c.step("× 5 es × 10 ÷ 2", f"${a} \\times 10 = {a * 10}$; ${a * 10} \\div 2 = {a * 5}$", procedure="Multiplicación mental por 5")
        return c.build(name="Multiplicación mental", procedure="× 5 = × 10 ÷ 2", prompt=f"Calcula mentalmente ${a} \\times 5$", answer=A_int(a * 5), final=str(a * 5))
    if c.variant == "descomponer":
        a, b = c.randint(12, 49), c.randint(3, 9)
        t, u = a // 10 * 10, a % 10
        c.step("Descomponer", f"${a} = {t} + {u}$", procedure="Multiplicación mental por descomposición", prop="Distributiva")
        c.step("Multiplicar las partes", f"${t} \\times {b} = {t * b}$, ${u} \\times {b} = {u * b}$", prompt=f"¿{t} × {b}?", answer=A_int(t * b))
        c.step("Sumar", f"${t * b} + {u * b} = {a * b}$", prompt="¿Total?", answer=A_int(a * b))
        return c.build(name="Multiplicación mental", procedure="Descomposición y propiedad distributiva", prompt=f"Calcula mentalmente ${a} \\times {b}$",
                       answer=A_int(a * b), final=str(a * b))
    a = c.randint(12, 99)
    m = c.choice([9, 11])
    c.step("Usar 10", f"${a} \\times {m} = {a} \\times 10 {'-' if m == 9 else '+'} {a}$", procedure=f"Multiplicación mental por {m}", prop="Distributiva")
    c.step("Calcular", f"${a * 10} {'-' if m == 9 else '+'} {a} = {a * m}$", prompt="¿Resultado?", answer=A_int(a * m))
    return c.build(name="Multiplicación mental", procedure=f"× {m} = × 10 {'−' if m == 9 else '+'} el número", prompt=f"Calcula mentalmente ${a} \\times {m}$",
                   answer=A_int(a * m), final=str(a * m))


@generator("b06.elementos_mult", "Elementos de la multiplicación", {1: ["base"], 2: ["base"], 3: ["base"]})
def elementos_mult(c: Ctx):
    a, b = c.randint(2, 30), c.randint(2, 30)
    role = c.choice(["producto", "factor"])
    if role == "producto":
        c.step("Recordar nombres", "Los números que se multiplican son **factores**; el resultado es el **producto**.", procedure="Terminología")
        return c.build(name="Elementos de la multiplicación", procedure="Identificación de elementos",
                       prompt=f"En ${a} \\times {b} = {a * b}$, ¿cuál es el **producto**?", answer=A_int(a * b), final=str(a * b))
    c.step("Factor desconocido", f"Si ${a} \\times \\square = {a * b}$, el factor es ${a * b} \\div {a} = {b}$", procedure="Operación inversa")
    return c.build(name="Factor desconocido", procedure="División como inversa", prompt=f"Completa: ${a} \\times \\square = {a * b}$",
                   answer=A_int(b), final=str(b))


@generator("b06.concepto_mult", "Concepto de multiplicación", {1: ["grupos"], 2: ["arreglo"], 3: ["arreglo"]})
def concepto_mult(c: Ctx):
    g, k = c.randint(2, 9), c.randint(2, 9)
    if c.variant == "grupos":
        c.step("Grupos iguales", f"{g} grupos de {k}: el {k} se repite {g} veces → ${k} \\times {g} = {g * k}$", procedure="Multiplicación como grupos iguales")
        return c.build(name="Concepto de multiplicación", procedure="Grupos iguales", prompt=f"Hay {g} cajas con {k} huevos cada una. ¿Cuántos huevos hay?",
                       answer=A_int(g * k), final=str(g * k))
    c.step("Filas por columnas", f"${g} \\times {k} = {g * k}$", procedure="Multiplicación como arreglo rectangular")
    return c.build(name="Concepto de multiplicación", procedure="Arreglo rectangular", prompt=f"Un auditorio tiene {g} filas de {k} butacas. ¿Cuántas butacas hay?",
                   answer=A_int(g * k), final=str(g * k))


@generator("b06.problemas_mult", "Problemas de multiplicación", {1: ["grupos"], 2: ["precio"], 3: ["varios_pasos"]})
def problemas_mult(c: Ctx):
    if c.variant == "grupos":
        g, k = c.randint(3, 12), c.randint(4, 25)
        story, ans, unit = f"Un colegio tiene {g} aulas con {k} pupitres cada una. ¿Cuántos pupitres hay?", g * k, "pupitres"
        c.step("Identificar grupos iguales", f"{g} grupos de {k}.", procedure="Resolución de problemas")
        c.step("Multiplicar", f"${g} \\times {k} = {ans}$", prompt="¿Resultado?", answer=A_int(ans))
        c.mistake("suma", "Sumaste en vez de multiplicar", "Grupos iguales → multiplicación.", g + k, 1)
    elif c.variant == "precio":
        q, p = c.randint(3, 40), c.randint(12, 250)
        story, ans, unit = f"Cada entrada cuesta {p} pesos. ¿Cuánto cuestan {q} entradas?", q * p, "pesos"
        c.step("Datos", f"Precio unitario {p}, cantidad {q}.", procedure="Resolución de problemas")
        c.step("Multiplicar", f"${q} \\times {p} = {ans}$", prompt="¿Costo total?", answer=A_int(ans))
    else:
        q1, p1, q2, p2 = c.randint(2, 9), c.randint(10, 90), c.randint(2, 9), c.randint(10, 90)
        ans, unit = q1 * p1 + q2 * p2, "pesos"
        story = f"Se compran {q1} cuadernos a {p1} pesos y {q2} bolígrafos a {p2} pesos. ¿Cuánto se paga en total?"
        c.step("Primer producto", f"${q1} \\times {p1} = {q1 * p1}$", procedure="Problema de varios pasos", prompt="¿Costo de cuadernos?", answer=A_int(q1 * p1))
        c.step("Segundo producto", f"${q2} \\times {p2} = {q2 * p2}$", prompt="¿Costo de bolígrafos?", answer=A_int(q2 * p2))
        c.step("Sumar", f"${q1 * p1} + {q2 * p2} = {ans}$")
    return c.build(name="Problema de multiplicación", procedure="Resolución de problemas mediante multiplicación", prompt=story,
                   answer=A_int(ans, unit), final=f"{ans} {unit}")


# ========================================================= DIVISIÓN (B07) ==


def _div_fields(q: int, r: int):
    return A_fields(("cociente", "Cociente", A_int(q)), ("residuo", "Residuo", A_int(r)))


def _explain_long_division(c: Ctx, D: int, d: int) -> tuple[int, int]:
    q, r, steps = long_division(D, d)
    c.step("Identificar los elementos", f"Dividendo {D}, divisor {d}. Buscamos cociente y residuo.", procedure="División larga")
    for i, s in enumerate(steps):
        txt = (f"Tomamos **{s.partial}**. ¿Cuántas veces cabe {d}? ${d} \\times {s.q_digit} = {s.product} \\le {s.partial}$ → "
               f"cifra del cociente **{s.q_digit}**. Restamos: ${s.partial} - {s.product} = {s.remainder}$.")
        if s.brought_down is not None:
            txt += f" Bajamos la siguiente cifra ({s.brought_down})."
        c.step(f"Dividir {s.partial} entre {d}", txt, why=f"El residuo ({s.remainder}) debe ser menor que el divisor ({d})." if i == 0 else "",
               procedure="División larga", prompt=f"¿Cuántas veces cabe {d} en {s.partial}?", answer=A_int(s.q_digit))
    c.step("Resultado", f"Cociente **{q}**, residuo **{r}**.")
    c.step("Comprobar", f"${d} \\times {q} + {r} = {d * q + r}$ ✓", procedure="Prueba de la división", why="Dividendo = divisor × cociente + residuo.")
    return q, r


@generator("b07.division_una_cifra", "División por una cifra", {1: ["exacta"], 2: ["con_residuo"], 3: ["con_ceros"]})
def division_una_cifra(c: Ctx):
    d = c.randint(2, 9)
    if c.variant == "exacta":
        q = c.randint(11, c.by_level(99, 999, 999))
        D = d * q
    elif c.variant == "con_residuo":
        D = c.randint(d * 10, 999)
        if D % d == 0:
            c.retry()
    else:
        q = int(f"{c.randint(1, 9)}0{c.randint(1, 9)}")
        D = d * q + c.randint(0, d - 1)
    q, r = _explain_long_division(c, D, d)
    c.mistake("residuo_grande", "El residuo es mayor o igual que el divisor", "Si el residuo es ≥ divisor, cabe una vez más.",
              {"cociente": q - 1, "residuo": r + d}, 1)
    if "0" in str(q):
        c.mistake("cero_cociente", "Olvidaste el 0 en el cociente", "Si al bajar una cifra el divisor no cabe, se escribe 0 en el cociente.",
                  {"cociente": int(str(q).replace("0", "")), "residuo": r}, 2)
    return c.build(name="División por una cifra", procedure="División larga por una cifra", prompt=f"Divide: ${D} \\div {d}$",
                   answer=_div_fields(q, r), final=f"cociente {q}, residuo {r}",
                   hints=("Comprueba siempre: divisor × cociente + residuo = dividendo.",),
                   workspace={"type": "division", "dividend": D, "divisor": d, "quotient": q, "remainder": r})


@generator("b07.division_varias_cifras", "División por varias cifras", {1: ["dos_cifras_exacta"], 2: ["dos_cifras"], 3: ["tres_cifras"]})
def division_varias_cifras(c: Ctx):
    d = c.randint(11, 99) if c.variant != "tres_cifras" else c.randint(101, 499)
    q = c.randint(12, c.by_level(99, 999, 999))
    r = 0 if c.variant == "dos_cifras_exacta" else c.randint(1, d - 1)
    D = d * q + r
    q, r = _explain_long_division(c, D, d)
    c.mistake("residuo_grande", "El residuo es mayor o igual que el divisor", "Si el residuo ≥ divisor, el cociente puede aumentar.",
              {"cociente": q - 1, "residuo": r + d}, 1)
    return c.build(name="División por varias cifras", procedure="División larga", prompt=f"Divide: ${D} \\div {d}$", answer=_div_fields(q, r),
                   final=f"cociente {q}, residuo {r}", hints=("Estima con la primera cifra del divisor: ¿cuántas veces cabe?",),
                   workspace={"type": "division", "dividend": D, "divisor": d, "quotient": q, "remainder": r})


@generator("b07.division_larga", "División larga", {1: ["base"], 2: ["base"], 3: ["base"]})
def division_larga(c: Ctx):
    d = c.by_level(c.randint(3, 9), c.randint(12, 48), c.randint(12, 99))
    D = c.randint(d * 100, d * c.by_level(999, 999, 9999))
    q, r = _explain_long_division(c, D, d)
    c.mistake("residuo_grande", "Residuo mayor o igual que el divisor", "El residuo debe ser menor que el divisor.", {"cociente": q - 1, "residuo": r + d}, 1)
    return c.build(name="División larga", procedure="Algoritmo de la división larga", prompt=f"Resuelve con división larga: ${D} \\div {d}$",
                   answer=_div_fields(q, r), final=f"cociente {q}, residuo {r}",
                   workspace={"type": "division", "dividend": D, "divisor": d, "quotient": q, "remainder": r})


@generator("b07.exacta_inexacta", "División exacta e inexacta", {1: ["clasificar"], 2: ["clasificar"], 3: ["clasificar"]})
def exacta_inexacta(c: Ctx):
    d = c.randint(2, c.by_level(9, 15, 30))
    exact = c.rng.random() < 0.5
    D = d * c.randint(3, 40) + (0 if exact else c.randint(1, d - 1))
    q, r = divmod(D, d)
    c.step("Dividir", f"${D} \\div {d}$: cociente {q}, residuo {r}.", procedure="Clasificación de la división",
           prompt="¿Cuál es el residuo?", answer=A_int(r))
    c.step("Clasificar", "Residuo 0 → **exacta**." if exact else "Residuo distinto de 0 → **inexacta**.")
    return c.build(name="División exacta o inexacta", procedure="Clasificación según el residuo", prompt=f"¿La división ${D} \\div {d}$ es exacta o inexacta?",
                   answer=A_choice_fixed(["Exacta", "Inexacta"], "Exacta" if exact else "Inexacta"), final="Exacta" if exact else "Inexacta")


@generator("b07.division_residuo", "División con residuo", {1: ["base"], 2: ["base"], 3: ["problema"]})
def division_residuo(c: Ctx):
    d = c.randint(3, 12)
    D = d * c.randint(3, 30) + c.randint(1, d - 1)
    q, r = divmod(D, d)
    if c.variant == "problema":
        c.step("Interpretar", f"Repartir {D} en grupos de {d}.", procedure="Problema de división con residuo")
        c.step("Dividir", f"${D} = {d} \\times {q} + {r}$", prompt="¿Cuántos grupos completos?", answer=A_int(q))
        c.step("El residuo sobra", f"Sobran {r}.")
        return c.build(name="Problema de división con residuo", procedure="División con residuo",
                       prompt=f"Se empaquetan {D} galletas en bolsas de {d}. ¿Cuántas bolsas completas se llenan y cuántas galletas sobran?",
                       answer=A_fields(("cociente", "Bolsas completas", A_int(q)), ("residuo", "Sobran", A_int(r))), final=f"{q} bolsas, sobran {r}")
    c.step("Dividir", f"${d} \\times {q} = {d * q}$ es el mayor múltiplo de {d} que no supera {D}.", procedure="División con residuo",
           prompt=f"¿Mayor múltiplo de {d} ≤ {D}?", answer=A_int(d * q))
    c.step("Residuo", f"${D} - {d * q} = {r}$", prompt="¿Residuo?", answer=A_int(r))
    c.mistake("residuo_grande", "Residuo ≥ divisor", "Cabe una vez más.", {"cociente": q - 1, "residuo": r + d}, 0)
    return c.build(name="División con residuo", procedure="División entera", prompt=f"Calcula cociente y residuo: ${D} \\div {d}$",
                   answer=_div_fields(q, r), final=f"cociente {q}, residuo {r}")


@generator("b07.division_enteros", "División de números enteros", {1: ["base"], 2: ["base"], 3: ["base"]})
def division_enteros(c: Ctx):
    d = c.choice([-1, 1]) * c.randint(2, c.by_level(9, 15, 25))
    q = c.choice([-1, 1]) * c.randint(2, c.by_level(9, 20, 40))
    D = d * q
    c.step("Regla de los signos", "Signos iguales → positivo; distintos → negativo.", procedure="Regla de los signos (división)",
           prompt="¿Signo del resultado? (1 = positivo, −1 = negativo)", answer=A_int(1 if q > 0 else -1))
    c.step("Dividir valores absolutos", f"${abs(D)} \\div {abs(d)} = {abs(q)}$", prompt="¿Cociente de valores absolutos?", answer=A_int(abs(q)))
    c.mistake("signo", "Signo incorrecto", "Revisa la regla de los signos.", -q, 0)
    return c.build(name="División de enteros", procedure="División con la regla de los signos", prompt=f"Calcula: ${signed_tex(D)} \\div {signed_tex(d)}$",
                   answer=A_int(q), final=str(q))


@generator("b07.relacion_mult_div", "Relación entre multiplicación y división", {1: ["base"], 2: ["base"], 3: ["base"]})
def relacion_mult_div(c: Ctx):
    a, b = c.randint(2, 12), c.randint(2, 15)
    form = c.choice(["div", "mult_fac", "dividendo"])
    if form == "div":
        p, v, how = f"${a * b} \\div {a} = \\square$", b, f"Porque ${a} \\times {b} = {a * b}$"
    elif form == "mult_fac":
        p, v, how = f"$\\square \\times {a} = {a * b}$", b, f"${a * b} \\div {a} = {b}$"
    else:
        p, v, how = f"$\\square \\div {a} = {b}$", a * b, f"${a} \\times {b} = {a * b}$"
    c.step("Operaciones inversas", how, procedure="Relación entre multiplicación y división", prop="Operación inversa")
    return c.build(name="Relación entre multiplicación y división", procedure="Uso de la operación inversa", prompt=f"Completa: {p}",
                   answer=A_int(v), final=str(v))


@generator("b07.comprobacion_division", "Comprobación de la división", {1: ["base"], 2: ["base"], 3: ["base"]})
def comprobacion_division(c: Ctx):
    d = c.randint(3, 25)
    q = c.randint(5, 80)
    r = c.randint(0, d - 1)
    D = d * q + r
    correct = c.rng.random() < 0.5
    rq, rr = (q, r) if correct else c.choice([(q + 1, r), (q, r + 1) if r + 1 < d else (q - 1, r), (q - 1, r + d)])
    c.step("Prueba", f"${d} \\times {rq} + {rr} = {d * rq + rr}$", procedure="Prueba de la división",
           prompt=f"¿Cuánto es {d} × {rq} + {rr}?", answer=A_int(d * rq + rr))
    ok = d * rq + rr == D and rr < d
    c.step("Comparar", ("Da el dividendo y el residuo es menor que el divisor: correcto." if ok else
                        f"{'No da el dividendo' if d * rq + rr != D else 'El residuo no es menor que el divisor'}: incorrecto."))
    return c.build(name="Comprobación de la división", procedure="Dividendo = divisor × cociente + residuo (con residuo < divisor)",
                   prompt=f"Alguien dice que ${D} \\div {d}$ da cociente {rq} y residuo {rr}. ¿Es correcto?",
                   answer=A_choice_fixed(["Sí", "No"], "Sí" if ok else "No"), final="Sí" if ok else "No")


@generator("b07.elementos_division", "Elementos de la división", {1: ["base"], 2: ["base"], 3: ["base"]})
def elementos_division(c: Ctx):
    d = c.randint(3, 12)
    q = c.randint(3, 40)
    r = c.randint(0, d - 1)
    D = d * q + r
    role = c.choice(["dividendo", "divisor", "cociente", "residuo"])
    val = {"dividendo": D, "divisor": d, "cociente": q, "residuo": r}[role]
    c.step("Nombres", "Dividendo ÷ divisor = cociente, con un residuo (resto).", procedure="Terminología de la división")
    return c.build(name="Elementos de la división", procedure="Identificación de elementos",
                   prompt=f"En la división ${D} \\div {d}$ el cociente es {q} y el residuo {r}. ¿Cuál es el **{role}**?",
                   answer=A_int(val), final=str(val))


@generator("b07.concepto_division", "Concepto de división", {1: ["reparto"], 2: ["agrupacion"], 3: ["agrupacion"]})
def concepto_division(c: Ctx):
    k, q = c.randint(2, 9), c.randint(2, 12)
    if c.variant == "reparto":
        c.step("Reparto equitativo", f"{k * q} entre {k} personas → {q} cada una.", procedure="División como reparto")
        return c.build(name="Concepto de división", procedure="Reparto en partes iguales", prompt=f"Se reparten {k * q} caramelos entre {k} niños por igual. ¿Cuántos recibe cada uno?",
                       answer=A_int(q), final=str(q))
    c.step("Agrupación", f"¿Cuántos grupos de {k} caben en {k * q}? {q}.", procedure="División como agrupación")
    return c.build(name="Concepto de división", procedure="División como agrupación (¿cuántas veces cabe?)",
                   prompt=f"Con {k * q} flores se hacen ramos de {k}. ¿Cuántos ramos salen?", answer=A_int(q), final=str(q))


@generator("b07.problemas_division", "Problemas de división", {1: ["reparto"], 2: ["residuo"], 3: ["redondeo_arriba"]})
def problemas_division(c: Ctx):
    d = c.randint(3, 15)
    if c.variant == "reparto":
        q = c.randint(5, 60)
        D = d * q
        c.step("Reparto", f"${D} \\div {d} = {q}$", procedure="Resolución de problemas", prompt="¿Cuánto toca?", answer=A_int(q))
        return c.build(name="Problema de reparto", procedure="División exacta", prompt=f"Se reparten {D} pesos entre {d} personas por igual. ¿Cuánto recibe cada una?",
                       answer=A_int(q, "pesos"), final=f"{q} pesos")
    D = d * c.randint(5, 60) + c.randint(1, d - 1)
    q, r = divmod(D, d)
    if c.variant == "residuo":
        c.step("Dividir", f"${D} = {d} \\times {q} + {r}$", procedure="Resolución de problemas", prompt="¿Cajas completas?", answer=A_int(q))
        c.step("Interpretar el residuo", f"Sobran {r} libros.")
        return c.build(name="Problema de división con residuo", procedure="División con residuo",
                       prompt=f"Se colocan {D} libros en cajas de {d}. ¿Cuántos libros sobran después de llenar todas las cajas posibles?",
                       answer=A_int(r, "libros"), final=f"{r} libros")
    c.step("Dividir", f"${D} = {d} \\times {q} + {r}$", procedure="Resolución de problemas", prompt="¿Cociente?", answer=A_int(q))
    c.step("Interpretar el residuo", f"Quedan {r} personas sin viaje, así que hace falta un viaje más: {q + 1}.",
           why="El contexto exige redondear hacia arriba: nadie puede quedarse.")
    c.mistake("no_redondea", "No tuviste en cuenta el residuo", "Las personas que sobran también necesitan viajar.", q, 1)
    return c.build(name="Problema de división (interpretar el residuo)", procedure="División con residuo e interpretación",
                   prompt=f"Un ascensor lleva como máximo {d} personas. ¿Cuántos viajes hacen falta para subir a {D} personas?",
                   answer=A_int(q + 1, "viajes"), final=f"{q + 1} viajes")
