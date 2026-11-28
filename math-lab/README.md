# MATH LAB

Profesor inteligente y plataforma interactiva para dominar la **aritmética
desde cero** (módulo MAT-01: 32 bloques, 280 temas).

* **Academia**: introducción → clase teórica por secciones con comprobación →
  ejemplo resuelto paso a paso → práctica guiada → práctica independiente
  adaptativa → evaluación intermedia → desafío avanzado → examen final →
  repaso de consolidación.
* **Modo Ayuda** («no sé», «ayuda», «no entiendo», «me trabé»): te guía paso a
  paso y te pide hacer tú el siguiente paso.
* **Diagnóstico de errores**: detecta errores típicos (olvidar llevar, restar
  la cifra menor de la mayor, sumar denominadores…) y señala el paso exacto.
* **Nombre del procedimiento** y propiedades en cada ejercicio.
* **Práctica** ilimitada, **Desafío** contrarreloj, **Aventura** (mapa de 32
  mundos), **Exámenes** de tema/bloque/módulo, **Repaso** espaciado.
* XP, niveles, rachas, logros y estadísticas.
* Corrección **100 % determinista** (aritmética exacta en Python).

## Arranque rápido
Requisitos: Python 3.12+ y Node 20+.

```bash
cd math-lab
scripts/start.sh            # instala lo necesario la primera vez
# abre http://127.0.0.1:8000
```

## Calidad
```bash
scripts/quality_gate.sh     # lint, currículo, motor, backend, frontend, e2e
```

Documentación: `PROJECT_CONTEXT.md`, `PROGRESS.md`, `docs/architecture.md`,
`docs/GUIA_ARCHIVOS.md`, `docs/CONTENT_GUIDE.md`, `docs/QUALITY.md`,
`docs/decisions/`.
