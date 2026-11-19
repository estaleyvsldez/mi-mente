# Arquitectura

```
memory-lab/
  server/            backend (Node, sin dependencias)
    server.js        HTTP: archivos estáticos + API REST + copias diarias
    db.js            repositorio SQLite: migraciones, transacciones, consultas (único archivo con SQL)
    auth.js          scrypt, tokens de sesión (se guardan como hash), limitador de intentos
    ai.js            proveedor de IA aislado (SDK oficial de Anthropic, opcional)
  public/            frontend (HTML + JS sin compilación)
    js/srs.js        motor de repetición espaciada FSRS          (navegador + Node)
    js/stats.js      estadísticas, rachas, récords, objetivos, logros, criterio de dominio  (navegador + Node)
    js/strategy.js   motor de estrategias y diagnóstico          (navegador + Node)
    js/english-core.js  formato de bloques, normalización y verificación de respuestas (navegador + Node)
    js/store.js      persistencia del cliente: caché IndexedDB + cola offline + sincronización
    js/exercises.js  motor de ejercicios: ejecutor de sesiones, guardado tras cada ejercicio, reanudación
    js/modules/*.js  inglés, entrenamiento progresivo y técnicas, atleta, módulos de memoria, laboratorio, analytics
    data/            técnicas, lecciones, banco de material y biblioteca de inglés
  tools/validate.js  validador de la biblioteca de inglés
  tests/             pruebas automatizadas (node:test)
```

## Persistencia

- **Fuente de verdad: la base de datos del servidor** (SQLite en modo WAL con `synchronous=FULL`).
- Tablas: `users`, `sessions`, `attempts` (cada respuesta), `docs` (colecciones por usuario: tarjetas de repaso,
  palacios, PAO, Major, anclajes, asociaciones, objetivos, logros, ajustes, lecciones, experimentos, evaluaciones
  diferidas, sesión interrumpida…), `counters`, `schema_version`.
- **Migraciones** numeradas en `db.js`, cada una en su transacción.
- **Sincronización** (`POST /api/sync`): el cliente envía un lote de operaciones con id único; el servidor las aplica
  en UNA transacción, devuelve los ids confirmados y los cambios posteriores a la secuencia que el cliente ya tenía.
  - Reenviar un lote (corte de red) no duplica nada: los intentos se identifican por id.
  - Documentos: la escritura más reciente gana; una más antigua no pisa a una nueva.
- **Sin conexión**: las operaciones quedan en IndexedDB y se reenvían con reintentos exponenciales, al recuperar
  la conexión, al volver a la pestaña y cada minuto. El indicador superior solo muestra «Guardado» cuando el
  servidor ha confirmado.
- **Guardado tras cada ejercicio** y sesión en curso guardada para reanudarla.
- **Copias**: automáticas del archivo (`VACUUM INTO`), y descarga/restauración por usuario (idempotente).

## Seguridad

- Contraseñas con scrypt y sal; comparación en tiempo constante.
- Tokens aleatorios de 256 bits; en la base de datos solo su SHA-256. Caducan a los 90 días; logout los invalida.
- Todas las consultas filtran por `user_id` del token: un usuario no puede leer ni escribir datos de otro.
- Validación de cada operación (tipos, rangos, tamaños, nombres de colección); las inválidas se rechazan sin
  afectar al resto del lote.
- Límite de intentos de inicio de sesión por IP y de peticiones de IA por usuario; límite de tamaño de cuerpo;
  protección contra salida del directorio público; cabeceras `nosniff`, `X-Frame-Options`, `Referrer-Policy`.

## Cambiar a PostgreSQL

Solo `server/db.js` contiene SQL y expone funciones (`createUser`, `applyOps`, `changesSince`, `exportUser`…).
Para PostgreSQL: reimplementar esas funciones con el paquete `pg` manteniendo las mismas firmas; las pruebas de
`tests/server.test.js` sirven de contrato.

## Motores

- **FSRS** (`srs.js`): estabilidad y dificultad por tarjeta, retención objetivo 90 %, parámetros por defecto de FSRS 5.
  Repasar el mismo día no cuenta como repaso espaciado.
- **Dominio**: inglés por habilidades (recordar, construir, escuchar, hablar, escribir, conversar, rapidez) con media
  móvil; los niveles 3-5 exigen ≥85 %, días distintos y estabilidad FSRS de 7-21 días. Lecciones: ≥85 % en dos
  evaluaciones separadas ≥20 h. Módulos: sube con ≥85 % en dos días distintos, baja tras dos sesiones <50 %.
- **Estrategias** (`strategy.js`): combinaciones base por tipo, ajustes por perfil, sustitución por técnicas
  dominadas y penalización de técnicas con baja precisión personal. Diagnóstico con mínimo 3 intentos.
- **Estadísticas** (`stats.js`): todo se calcula a partir de la tabla de intentos; el día se fija en la zona horaria
  del dispositivo al practicar.

## IA

`server/ai.js` es el único punto de contacto con el proveedor. Tareas con salida JSON estructurada: generar
estructuras de inglés, asociaciones, evaluar oraciones, turnos de conversación y explicación de técnicas.
El contenido generado entra como «pendiente», pasa la validación automática y requiere aprobación del usuario.
