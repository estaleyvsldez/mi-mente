# Guía de contenido de las lecciones

Las lecciones viven en `curriculum/mat-01/lessons/bXX.yaml` (una por bloque) y
se validan con el esquema de `backend/app/curriculum/models.py`:

```bash
.venv/bin/python scripts/validate_curriculum.py b04
```

## Principios pedagógicos (del propietario)

* Enseñar **desde cero**, sin dar por hecho conocimientos previos que no se
  hayan enseñado antes en el pensum.
* Lenguaje **sencillo pero matemáticamente correcto**. Español neutro.
* Enseñar a **razonar**, no sólo procedimientos: cada regla con su *por qué*.
* **Relacionar** con lo anterior (prerrequisitos) y con lo que viene.
* Poca información de golpe: 1–3 secciones cortas por tema.
* Nombrar los procedimientos y la terminología progresivamente.
* **No** cambiar, quitar ni añadir temas: el pensum es intocable.

## Estructura de un tema (`topics.tXX`)

```yaml
block: b04
intro: >-
  Presentación breve del bloque (2–4 frases).
topics:
  t05:
    intro:                     # FASE A — Introducción
      what: Qué es el tema.
      purpose: Para qué sirve.
      importance: Por qué es importante aprenderlo.
      foundations: Cuáles son sus fundamentos.
      prerequisites: [Temas previos necesarios (texto, citando el bloque)]
      outcomes: [Tipos de problemas que podrá resolver]
      everyday_example: Ejemplo cotidiano.
    sections:                  # FASE B — Clase teórica (1 a 4 secciones)
      - title: Título corto
        concept: El concepto en una frase.
        explanation: Explicación sencilla (Markdown; matemáticas en $...$).
        definition: Definición matemática precisa.
        rules: [Reglas y propiedades]
        examples:
          - problem: "Calcula $48 + 27$"
            solution: |-
              **Paso 1.** …
              **Paso 2.** …
              Resultado: $75$.
        common_errors: [Errores comunes y cómo evitarlos]
        summary: Resumen de lo aprendido.
        check:                 # comprobación antes de continuar
          question: Pregunta
          options: [opción A, opción B, opción C]
          answer: 0            # índice (desde 0) de la opción correcta
          explanation: Por qué esa es la correcta y las otras no.
    glossary:
      - {term: Sumando, definition: Cada uno de los números que se suman.}
    practice: []               # banco de preguntas (ver abajo)
```

### Banco `practice`

* **Obligatorio (≥ 9 preguntas, 3 por nivel: level 1, 2 y 3)** en los temas
  cuyo `gens` en `pensum.yaml` está vacío (temas conceptuales).
* Opcional en los demás (los ejercicios los genera el motor).
* Mismo formato que `check`, con `level: 1|2|3`.
* Nivel 1 = reconocer/recordar; 2 = comprender/relacionar; 3 = aplicar/razonar.

## Reglas de formato

* Matemáticas en LaTeX entre `$…$` (KaTeX). Coma decimal: `0{,}75`.
  Multiplicación `\times`, división `\div`, fracciones `\frac{a}{b}`.
* En YAML, usa `|-` o `>-` para textos largos y entrecomilla las cadenas que
  empiecen por `[`, `{`, `*`, `&`, `!`, `%`, `@`, `` ` `` o contengan `: `.
* **Verifica cada cálculo** de los ejemplos: un ejemplo erróneo es un defecto
  crítico. Prefiere números pequeños y claros.
* Las opciones de `check`/`practice` deben ser inequívocas: una sola correcta.
* Nada de humor infantil: tono de plataforma profesional y cercana.
