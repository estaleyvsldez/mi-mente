# Gestión de calidad de MATH LAB

La calidad se asegura en **tres capas**. Nada se entrega si alguna falla.

## 1. Puerta de calidad automática (`scripts/quality_gate.sh`)
También se ejecuta en GitHub Actions (`.github/workflows/math-lab.yml`).

| Paso | Qué garantiza |
|---|---|
| Ruff | Estilo y errores estáticos en Python. |
| Currículo | 32 bloques, 280 temas, huella SHA-256 del pensum intacta, lecciones válidas según el esquema, bancos ≥ 9 preguntas en temas conceptuales, generadores existentes. |
| Motor | Cada generador × nivel × variante × 60 semillas + 300 semillas aleatorias (Hypothesis): la respuesta correcta valida, los pasos interactivos validan, ningún error típico coincide con la respuesta, opciones sin duplicados, reproducibilidad. Algoritmos verificados contra la aritmética de Python. |
| Backend | Recorrido completo de un tema por la API hasta «consolidado»; reglas de dominio, ayuda, bloqueos, diagnósticos, evaluaciones, repetición espaciada. |
| Frontend | TypeScript estricto + compilación. |
| E2E | Navegador real: todas las pantallas sin errores, mapa con 32 bloques, ejercicio con ayuda y diagnóstico, móvil sin desbordamiento. |

## 2. Mesa de críticos (revisión independiente)
Revisores independientes que **no escribieron** el código o el contenido que
revisan, y que sólo informan de hallazgos **reproducidos**:

| Crítico | Revisa |
|---|---|
| Matemático | Recalcula de forma independiente las respuestas de los generadores; busca ambigüedades, pasos erróneos, errores típicos mal calculados y problemas de parseo. |
| Producto, pedagogía e ingeniería | Recorre la app en escritorio y móvil contra los requisitos del propietario; busca bugs de lógica y callejones sin salida. |
| Contenido | Verifica la corrección matemática y pedagógica de las lecciones (ejemplos, respuestas de las comprobaciones, orden de prerrequisitos). |

Cada hallazgo se clasifica (crítico / importante / menor), se corrige, y la
corrección queda protegida con una prueba cuando es posible. El registro de
cada ronda está en `docs/quality/`.

## 3. Reglas de desarrollo
* Ningún cálculo con flotantes en la corrección.
* Cada generador nuevo pasa automáticamente por las pruebas de propiedad.
* Cambiar la lógica de un generador que altere ejercicios antiguos → subir su `version`.
* Cambiar el pensum requiere autorización del propietario y actualizar la huella.
