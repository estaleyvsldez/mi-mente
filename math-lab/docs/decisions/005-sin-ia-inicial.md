# ADR-005 · Sin IA en la versión inicial

**Decisión.** Todo lo pedagógico (pasos, pistas, diagnóstico, modo ayuda) es
determinista y sale del motor. No hay llamadas a modelos externos.

**Futuro.** Una capa opcional podría redactar explicaciones alternativas
*a partir de* los pasos verificados por el motor, nunca para decidir si una
respuesta es correcta.
