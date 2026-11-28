# Guía de archivos (para aprender ingeniería de software con MATH LAB)

Cada entrada responde: **qué hace · por qué existe · cómo se relaciona · qué
concepto de programación enseña.**

## Motor matemático — `engine/mathlab_engine/`

| Archivo | Qué hace | Concepto que aprendes |
|---|---|---|
| `core/types.py` | Define `Exercise`, `Step`, `AnswerSpec`, `Misconception`, `ValidationResult`. Todo lo demás habla este «idioma». | **Modelado de datos** con `dataclass(frozen=True)` (objetos inmutables): un ejercicio no puede cambiar por accidente. |
| `numbers/parse.py` | Convierte lo que escribes (`0,75`, `3/4`, `1 3/4`, `2^3·3`) en valores exactos. Rechaza ambigüedades (`1.000`). | **Validación de entrada** y **expresiones regulares**; excepciones propias (`ParseError`). |
| `numbers/fmt.py` | Muestra números en formato español y LaTeX; redondeo escolar «5 sube». | **Separar presentación de lógica**; `Decimal` con `ROUND_HALF_UP`. |
| `numbers/words.py` | Escribe números con palabras (setenta y cinco, veintiún mil). | **Recursión/descomposición** de problemas en subproblemas. |
| `algorithms/columns.py` | Suma, resta, multiplicación y división en columna **con traza** de cada paso, y los «algoritmos equivocados» típicos. | **Algoritmos con trazabilidad**: guardar el «cómo», no sólo el resultado. |
| `algorithms/numtheory.py` | Divisores, primos, criba, factorización, Euclides, bases. | Algoritmos clásicos y su complejidad (p. ej. probar hasta √n). |
| `algorithms/expr.py` | Resuelve operaciones combinadas **una operación a la vez** respetando la jerarquía. | **Tokenización** y **reducción paso a paso** (como un pequeño intérprete). |
| `core/registry.py` | Decorador `@generator`, el contexto `Ctx` y `generate()`. | **Patrón registro + decoradores**; **aleatoriedad reproducible** con semillas; reintentos controlados. |
| `core/validate.py` | Corrige respuestas y detecta errores típicos; `canonical_input` da la respuesta «ideal». | **Funciones puras** fáciles de probar; despacho por tipo. |
| `core/bank.py` | Convierte preguntas del banco (temas conceptuales) en `Exercise`. | **Uniformidad de interfaces**: todo ejercicio tiene la misma forma. |
| `generators/bXX_bYY.py` | 217 generadores agrupados por bloques. Cada uno produce enunciado, respuesta, pasos explicados, nombre del procedimiento y errores típicos. | **Modularidad**: añadir un tema = añadir una función. |

## Backend — `backend/app/`

| Archivo | Qué hace | Concepto |
|---|---|---|
| `config.py` | Umbrales pedagógicos (90 %, tamaños de examen, XP). | **Configuración centralizada**. |
| `curriculum/models.py` | Esquema estricto del YAML (Pydantic). | **Validación de esquemas**; fallar pronto. |
| `curriculum/loader.py` | Carga pensum + lecciones, verifica generadores y bancos. | **Carga de datos externos** y caché (`lru_cache`). |
| `db/models.py` | Tablas: intentos, progreso, repaso, evaluaciones, XP, logros. | **ORM** (SQLAlchemy 2), claves foráneas, restricciones únicas. |
| `db/session.py` | Conexión a SQLite y sesión por petición. | **Inyección de dependencias** (FastAPI `Depends`). |
| `services/exercises.py` | Elige generador, entrega, corrige, Modo Ayuda, pregunta de procedimiento. | **Capa de servicios**: la lógica no vive en las rutas. |
| `services/mastery.py` | Calcula precisión ponderada, variantes y errores repetidos. | **Funciones puras** sobre listas → pruebas sencillas. |
| `services/srs.py` | Repetición espaciada (SM-2 simplificado). | Algoritmo de planificación. |
| `services/flow.py` | **Máquina de estados** de cada tema y las evaluaciones. | **Máquinas de estados finitos**: reglas explícitas de transición. |
| `services/gamification.py` | XP decreciente, niveles, rachas, logros. | **Tabla de reglas** (lista de `AchievementDef` con funciones). |
| `services/stats.py` | Panel, estadísticas, historial de errores. | Consultas de agregación (`GROUP BY`). |
| `api/routes.py` | Endpoints HTTP `/api/*`. | **API REST**; códigos de estado (403 bloqueado, 409 conflicto). |
| `main.py` | Crea la app, valida el currículo al arrancar, sirve el frontend compilado. | **Ciclo de vida** de la aplicación (`lifespan`). |

## Frontend — `frontend/src/`

| Archivo | Qué hace | Concepto |
|---|---|---|
| `lib/api.ts` | Cliente HTTP y **tipos** de todas las respuestas. | **Tipado estático** (TypeScript) como contrato con el backend. |
| `lib/useApi.ts` | Hook para cargar datos con estados de carga/error. | **Hooks personalizados** de React. |
| `lib/events.tsx` | Notificaciones de XP y logros. | **Context API** (estado compartido). |
| `components/ui.tsx` | Botones, tarjetas, barras, anillos. | **Componentes reutilizables** y tokens de diseño. |
| `components/Md.tsx` | Markdown + fórmulas (KaTeX). | Composición de librerías. |
| `components/AnswerInput.tsx` | Casilla adecuada a cada tipo de respuesta. | **Renderizado condicional**. |
| `components/ExercisePlayer.tsx` | Enunciado, respuesta, corrección, diagnóstico, solución, Modo Ayuda. | **Estado local** y efectos (`useState`, `useEffect`). |
| `components/Whiteboard.tsx` | Pizarra: cuadrícula con llevadas + lienzo libre. | Eventos de puntero, `<canvas>`. |
| `components/AssessmentRunner.tsx` | Ejecuta evaluaciones y muestra el resultado. | Flujo asíncrono. |
| `components/Lesson.tsx` | Introducción, secciones con comprobación, ejemplo paso a paso. | Componentes de presentación. |
| `pages/*.tsx` | Una pantalla por ruta. | **Enrutado** (React Router) y *code splitting* (`lazy`). |

## Calidad
| Archivo | Qué hace |
|---|---|
| `engine/tests/test_generators.py` | Genera miles de ejercicios de cada generador/nivel/variante y comprueba que la respuesta correcta valida, que los pasos son coherentes y que ningún «error típico» coincide con la respuesta. |
| `engine/tests/test_numbers.py` | Parseo, formato, algoritmos (pruebas de propiedad con Hypothesis). |
| `backend/tests/test_flow.py` | Recorre un tema completo por la API hasta «consolidado»; ayuda, errores, bloqueos. |
| `backend/tests/test_units.py` | Dominio, repetición espaciada, niveles. |
| `backend/tests/test_curriculum.py` | 32 bloques, 280 temas y huella del pensum. |
| `frontend/e2e/smoke.spec.cjs` | Navegador real: pantallas, ejercicio, móvil sin desbordes. |
| `scripts/quality_gate.sh` | Ejecuta todo lo anterior + lint + compilación. |
