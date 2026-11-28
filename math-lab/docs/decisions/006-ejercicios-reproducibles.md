# ADR-006 · Ejercicios reproducibles por semilla

**Decisión.** Un ejercicio queda determinado por
`(generador, versión, nivel, variante, semilla)`. La BD guarda esos datos,
no el ejercicio completo. Al cambiar la lógica de un generador de forma que
altere ejercicios antiguos, se incrementa su `version`.

**Por qué.** Historial ligero, revisión de errores antiguos exacta y pruebas
deterministas.
