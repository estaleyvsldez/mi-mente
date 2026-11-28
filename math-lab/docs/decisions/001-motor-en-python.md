# ADR-001 · Motor matemático en Python

**Estado:** aceptada.

**Contexto.** La corrección debe ser exacta y confiable. En JavaScript
`0.1 + 0.2 = 0.30000000000000004`.

**Decisión.** El motor vive en Python (`engine/`) usando `fractions.Fraction`
y `decimal.Decimal`. Nunca se usan flotantes para comparar respuestas.

**Consecuencias.** + exactitud, + Hypothesis (pruebas de propiedad), + SymPy
disponible para MAT-02. − Dos lenguajes; − el backend debe estar en marcha
(se arranca todo con `scripts/start.sh`).
