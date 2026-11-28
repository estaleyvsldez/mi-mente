# Arquitectura de MATH LAB

```
┌────────────── frontend (React + TS) ──────────────┐
│ Páginas: Panel, Mapa/Aventura, Tema (Academia),   │
│ Biblioteca, Práctica, Desafío, Repaso, Exámenes,  │
│ Errores, Estadísticas, Logros, Glosario, Ajustes  │
│ Componentes: ExercisePlayer, AnswerInput,         │
│ Whiteboard, AssessmentRunner, Lesson, Md (KaTeX)  │
└───────────────┬───────────────────────────────────┘
                │ JSON /api/*
┌───────────────▼──────── backend (FastAPI) ────────┐
│ api/routes.py        capa HTTP delgada            │
│ services/flow.py     máquina de estados del tema  │
│ services/mastery.py  cálculo del dominio (puro)   │
│ services/srs.py      repetición espaciada (SM-2)  │
│ services/exercises.py elegir/entregar/corregir     │
│ services/gamification.py XP, niveles, rachas, logros│
│ services/stats.py    panel, estadísticas, errores │
│ curriculum/          carga y valida YAML          │
│ db/                  modelos SQLAlchemy (SQLite)  │
└───────────────┬───────────────────────────────────┘
                │ llamadas Python
┌───────────────▼────── engine (Python puro) ───────┐
│ core/types.py     Exercise, Step, AnswerSpec…     │
│ core/registry.py  @generator, generate(), Ctx     │
│ core/validate.py  validación + diagnóstico        │
│ core/bank.py      preguntas conceptuales          │
│ numbers/          parseo exacto, formato, palabras│
│ algorithms/       columnas, división larga, MCD,  │
│                   criba, bases, jerarquía (traza) │
│ generators/       217 generadores, B02–B32        │
└───────────────────────────────────────────────────┘
```

## Flujo de un tema (Modo Academia)
`diagnostico → intro → teoria → ejemplo → guiada → independiente →
intermedia → desafio → examen → (dominado) → consolidacion → completado`

* **Evaluación inicial** (5 preguntas, opcional). 100 % → salta a la
  evaluación intermedia, pero sigue necesitando todos los exámenes.
* **Teoría**: cada sección exige acertar su pregunta de comprobación.
* **Ejemplo resuelto**: lo genera el motor, así que está verificado.
* **Guiada**: nivel 1, ayuda disponible; 4 aciertos sin ayuda para avanzar.
* **Independiente**: adaptativa (sube de nivel tras 4 aciertos seguidos con
  ≥ 2 variantes; baja tras 3 fallos; refuerza el error repetido).
  Requisitos para la evaluación intermedia: ≥ 8 intentos sin ayuda, precisión
  ponderada ≥ 90 %, variantes cubiertas en niveles 1 y 2, ningún error ≥ 3
  veces en la ventana.
* **Intermedia (10)**, **Desafío nivel 3 (10, 25 min)**, **Examen (10, 30 min,
  con 3 preguntas de «¿qué procedimiento usaste?»)**: ≥ 90 % cada una.
* **Dominado** → repaso de **consolidación** disponible ≥ 20 h después.
  Aprobarlo → **consolidado** y entra en la repetición espaciada.

## Modo Ayuda (Fase E)
Escribir «no sé / ayuda / no entiendo / me trabé» o pulsar el botón:
1. recordatorio del concepto y del nombre del procedimiento;
2. se revela el paso 1 (y los pasos explicativos siguientes) y se pide al
   estudiante el siguiente paso interactivo, que se valida por separado;
3. … hasta la solución completa + propuesta de un ejercicio más sencillo.
El intento queda marcado como «con ayuda» y **no cuenta** para el dominio.

## Diagnóstico de errores
Cada generador declara **errores típicos** con el valor que produciría el
algoritmo equivocado (sumar sin llevar, restar la cifra menor de la mayor,
no desplazar productos parciales, sumar denominadores…). Si la respuesta
coincide, se informa del error exacto y del paso donde ocurre.

## Selección de generadores (`gen@variante`)
En el pensum, `b09.operaciones_combinadas@parentesis` fuerza una variante.
Si el nivel pedido es superior al de la variante, se usa el nivel pedido sin
forzar (ejercicios más difíciles que la incluyen); si es inferior, se usa el
nivel mínimo donde existe la variante.

## Datos
Ver `backend/app/db/models.py`: `IssuedExercise` (ejercicio entregado,
reproducible por semilla), `Attempt`, `StepAttempt`, `TopicProgress`,
`ReviewSchedule`, `Assessment`, `XpEvent`, `UnlockedAchievement`,
`StudyDay`, `ChallengeRun`. El currículo NO está en la BD.
