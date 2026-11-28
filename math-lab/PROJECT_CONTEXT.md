# MATH LAB — Contexto del proyecto

> Léelo al empezar cada sesión de trabajo. Resume QUÉ es el proyecto, sus
> REGLAS y DÓNDE está cada cosa. El estado actual está en `PROGRESS.md`.

## Visión
Plataforma educativa personal para aprender matemáticas desde cero con un
**profesor paso a paso** (teoría → ejemplo → práctica guiada → práctica
independiente → evaluaciones → repaso espaciado) y gamificación sobria.
Primer módulo: **MAT-01 Aritmética completa** (32 bloques, 280 temas).

## Reglas innegociables (del propietario)
1. El pensum (`curriculum/mat-01/pensum.yaml`) **no se elimina, resume,
   combina ni reordena** sin autorización. Una prueba con huella SHA-256 lo
   protege (`backend/tests/test_curriculum.py`).
2. La corrección matemática es **determinista** (motor en Python con
   `Fraction`/`Decimal`). Ninguna IA decide si una respuesta es correcta.
3. Dominio = **≥ 90 %** sin ayuda + variantes distintas + sin errores
   repetidos + evaluaciones aprobadas + **repaso diferido** (consolidación).
4. La gamificación nunca sustituye al aprendizaje (XP decreciente por repetir).
5. Trabajo por etapas, explicando decisiones; documentación siempre al día.

## Decisiones técnicas (ver `docs/decisions/`)
| ADR | Decisión |
|---|---|
| 001 | Motor matemático en **Python** (aritmética exacta, Hypothesis) |
| 002 | Monorepo `math-lab/` dentro del repositorio `mi-mente` |
| 003 | Currículo como **datos** (YAML) validado con Pydantic |
| 004 | Coma decimal, se acepta punto, sin separador de miles |
| 005 | Sin IA en la versión inicial |
| 006 | Ejercicios reproducibles por (generador, versión, nivel, variante, semilla) |

## Mapa del código
```
math-lab/
├── engine/      Motor matemático puro (generadores, algoritmos, validación)
├── backend/     FastAPI + SQLite: enseñanza, dominio, repaso, gamificación
├── frontend/    React + TypeScript + Tailwind: interfaz
├── curriculum/  Pensum y lecciones (YAML) — contenido académico
├── docs/        Arquitectura, ADR, calidad, guía de archivos y de contenido
└── scripts/     start.sh, quality_gate.sh, validate_curriculum.py
```

## Comandos
* Arrancar: `scripts/start.sh` → http://127.0.0.1:8000
* Calidad completa: `scripts/quality_gate.sh`
* Validar currículo: `.venv/bin/python scripts/validate_curriculum.py [b04 …]`
* Desarrollo frontend con recarga: `cd frontend && npm run dev` (con el backend en :8000)

## Cómo añadir MAT-02
1. `curriculum/mat-02/pensum.yaml` + `lessons/`.
2. `engine/mathlab_engine/generators/mat02_*.py` (registrar en `generators/__init__.py`).
3. Nada más: el cargador detecta cada carpeta con `pensum.yaml`.
