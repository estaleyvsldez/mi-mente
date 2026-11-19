# ◆ Memory Lab

Sistema de entrenamiento de memoria, técnicas de memorización y aprendizaje estructural del inglés.
Servidor Node + base de datos SQLite integrada + aplicación web (escritorio, tablet y móvil).

## Arrancar

Requisito: **Node.js 22.13 o superior** (incluye SQLite; no hace falta instalar nada más).

```bash
cd memory-lab
```

```bash
npm start
```

Abre `http://localhost:3210`, crea una cuenta y empieza. En Windows puedes hacer doble clic en `INICIAR.bat`.
Desde el móvil, en la misma red Wi-Fi: `http://IP-DE-TU-PC:3210`.

- Base de datos: `memory-lab/data/memory-lab.db` (cámbiala con la variable `ML_DB`).
- Copias de seguridad automáticas: `memory-lab/data/backups/` (una al arrancar y cada 24 h; se guardan 14).
- Puerto: variable `PORT` (por defecto 3210).

### IA (opcional)

La aplicación funciona completa sin IA. Para activar generación de estructuras, evaluación de respuestas libres,
explicaciones adaptadas y conversación simulada:

```bash
npm install
```

y define `ANTHROPIC_API_KEY` antes de `npm start` (modelo configurable con `ML_AI_MODEL`).
Sin clave, la app lo indica en Configuración y ofrece alternativas (autoevaluación, importación de paquetes).

## Pruebas

```bash
npm test
```

```bash
npm run validate
```

`npm test` cubre persistencia tras reinicio, sincronización entre dispositivos, aislamiento entre usuarios,
seguridad (tokens, validación, rutas), copias de seguridad, FSRS, rachas, estadísticas frente al historial,
récords, criterio de dominio, motor de estrategias, diagnóstico, verificación de respuestas en inglés y la
biblioteca completa. `npm run validate` revisa la biblioteca de inglés (duplicados, referencias, formato).

## Qué incluye

| Sección | Contenido |
|---|---|
| Dashboard | Plan del día (repasos FSRS, estructura nueva, evaluaciones diferidas, lección, módulo menos practicado), racha, objetivos, sesión interrumpida |
| Progressive Memory Training | 9 lecciones acumulativas: asociación visual → agrupación → recuperación activa → repaso espaciado → palacio → historias y anclajes → combinación → números (Major) → multimodal |
| Biblioteca de técnicas | 48 técnicas con explicación, demostración, cuándo conviene, limitaciones, nivel de evidencia, ejercicio e historial personal |
| Motor de estrategias | Recomienda combinaciones según tipo de información, cantidad, orden, abstracción, similitud, tiempo, retención deseada, técnicas dominadas y rendimiento real; diagnóstico de fallos con comparación antes/después |
| Memory Athlete | Major System 00-99 editable, PAO 00-99, Peg 1-20, palacios de la memoria persistentes (lugares, orden, capacidad, varios elementos por lugar, historial), desafíos de palabras hasta 1.500, dígitos hasta 300, cartas, rostros, fechas, secuencias y datos mixtos |
| Módulos de memoria | 12 módulos (numérica, letras, palabras, visual, colores, espacial, rostros, auditiva, conceptual, secuencias, trabajo, asociativa) con nivel propio |
| Quick & Hidden Memory | 2 → 30 elementos, modos lento/normal/rápido/extremo, actividad intermedia con distracción |
| Desafíos multimodales | Objetos + colores + números + palabras en inglés + estructura → evaluación por capacidad y combinada |
| Voice Recall | Respuestas habladas con transcripción corregible, recuerdo oral, secuencias, describir imágenes |
| Strategy Lab | Experimentos con orden contrabalanceado; tiempo, precisión, orden, esfuerzo y retención a 24 h, 7 y 30 días |
| Structural English Memory | 254 estructuras en 33 categorías y 6 etapas, 17 situaciones completas, 37 combinaciones; 13 tipos de ejercicio |
| Analytics | Totales, series diaria/semanal/mensual/anual, por módulo, inglés, técnicas, récords, calendario, historial, objetivos y logros |

Más detalle: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md), [docs/FORMATO-CONTENIDO.md](docs/FORMATO-CONTENIDO.md), [docs/PROGRESO.md](docs/PROGRESO.md).
