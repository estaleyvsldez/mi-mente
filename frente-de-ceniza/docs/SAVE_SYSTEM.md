# Sistema de guardado

## Qué se guarda (por partida)
Misiones completadas y desbloqueadas, misión actual, nivel de dificultad del ciclo, objetivos cumplidos, recompensas, reclutas, inventario (munición por arma y granadas), armas desbloqueadas, ajustes (calidad, modo, bando, nombre), estadísticas (bajas, tiros a la cabeza, muertes, reanimaciones, misiones, blindados, tiempo), experiencia y rango, relaciones con cada compañero (confianza, veces que lo salvaste, veces que te salvó, bajas, misiones juntos, abandonos y memoria de los últimos hechos) y el **punto de control** de la misión en curso.

## Cuándo se guarda
Al empezar una misión, en cada punto de control, al completar una misión (más copia de hito), al desbloquear algo, al subir de rango, al cambiar relaciones, al cambiar ajustes, al morir, cada 30 s de juego y al cerrar o esconder la página.

## Dónde y cómo
1. **localStorage**: escritura en `oz_sN_tmp` → verificación → ranura alterna `oz_sN_A`/`oz_sN_B` (según la secuencia) → verificación → borrar temporal. Así una escritura cortada nunca destruye la copia anterior. `oz_sN_bak` guarda la copia de cada hito.
2. **IndexedDB** (`operacion-zero/saves`): copia espejo `sN_main` y `sN_bak`.
3. **Nube** (solo en el enlace de Claude, capacidad `db`): documento privado `data/users/<id>/slotN`.

Cada copia lleva: formato `OZSAVE`, versión, número de secuencia, fecha y **suma CRC32** del contenido.

## Carga y recuperación
Se leen todas las copias (A, B, temporal, hito, IndexedDB, nube), se descartan las dañadas (JSON roto, CRC distinto, validación fallida), se migran las antiguas y gana la de **mayor secuencia**. Si la mejor no estaba en localStorage, se repara automáticamente.

## Reglas de seguridad
- Antes de escribir se valida el contenido; si no pasa, **no se escribe** y queda el guardado anterior.
- Una pestaña, dispositivo o copia atrasada **nunca** pisa una más nueva: se compara la secuencia y el contenido exacto, y las pestañas se avisan entre sí (BroadcastChannel). La sesión atrasada deja de guardar.
- Un guardado de una **versión más nueva** del juego se protege: no se carga ni se modifica.
- **Migraciones**: `MIGRATIONS[n]` convierte de la versión n a n+1 (hoy v1 → v2).
- Los checkpoints solo se crean en estados estables (jugador vivo, no herido, sin trepar, misión sin terminar); si no es estable, se reintenta.

## Pruebas (pasan las 10): `pruebas/guardado.test.js`, resultados en `pruebas/resultado_guardado.txt`
A completar misión y reabrir · B misión desbloqueada · C cerrar en plena misión y recuperar el checkpoint · D matar el proceso del navegador (simula apagado) · E migración v1→v2 y protección de versión futura · F escritura cortada y copias dañadas → recuperación desde IndexedDB; dato inválido rechazado · G CONTINUAR carga misión, etapa y posición correctas · H tres partidas independientes · I relaciones conservadas · J pestaña atrasada rechazada.

Nota honesta sobre D: no se puede reiniciar la máquina del entorno de pruebas; se simuló matando el proceso del navegador con `kill -9` (sin cierre ordenado), que es el caso más duro para el almacenamiento.
