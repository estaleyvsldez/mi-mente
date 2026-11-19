# Registro de progreso

## Implementado y probado

| Área | Estado | Cómo se comprobó |
|---|---|---|
| Base de datos, migraciones, transacciones, copias | ✓ | `tests/server.test.js` |
| Cuentas, sesiones, aislamiento por usuario | ✓ | pruebas de seguridad: otro usuario no ve documentos ni intentos; tokens falsos/cerrados rechazados |
| Sincronización idempotente, multi-dispositivo, última escritura gana | ✓ | pruebas + navegador: se cierra el navegador, se entra desde otro contexto sin caché y aparecen intentos, nivel, palacio, objetivo, asociación y experimento |
| Cola offline y estado «Guardado» solo con confirmación | ✓ | implementado en `store.js`; el indicador refleja confirmación del servidor |
| Sesión interrumpida y reanudación | ✓ | navegador |
| FSRS, rachas, estadísticas, récords, dominio | ✓ | `tests/engines.test.js` (estadísticas comparadas con un historial conocido) |
| Motor de estrategias y diagnóstico | ✓ | pruebas unitarias |
| Biblioteca de inglés (254 estructuras, 17 diálogos, 37 combinaciones) | ✓ | `npm run validate` + pruebas |
| Sesiones de inglés (13 tipos de ejercicio), repaso, evaluación de etapa, prueba de nivel | ✓ | navegador: sesión completa de aprendizaje, repaso y evaluación de punta a punta |
| 12 módulos de memoria, Quick/Hidden Memory, multimodal, palacio, Major, laboratorio, lección guiada | ✓ | navegador: cada tipo de ejercicio se completó y se guardó; puntuación verificada con respuestas correctas conocidas |
| Todas las pantallas sin errores de consola, sin scroll horizontal en móvil | ✓ | navegador (escritorio 1280 px y móvil 390 px, tema claro y oscuro) |

## Implementado, con limitaciones conocidas

- **Voz**: síntesis y reconocimiento usan las APIs del navegador (reconocimiento: Chrome/Edge). No se pudo probar
  la captura real de micrófono en el entorno automatizado; la evaluación de la transcripción (incluida la
  corrección manual) sí está probada. Sin micrófono se ofrece respuesta escrita o autoevaluación.
- **IA**: integrada con el SDK oficial, pero no probada contra la API real porque este entorno no tiene clave.
  Falta: `npm install` y la variable `ANTHROPIC_API_KEY`.
- **FSRS** usa los parámetros por defecto; no se optimizan por usuario.
- **Conflictos**: si el mismo documento (p. ej. un palacio) se edita sin conexión en dos dispositivos, gana la
  edición más reciente. Los intentos nunca se pierden ni se duplican.
- **Base de datos**: SQLite en lugar de PostgreSQL para que funcione en un PC sin instalar servicios; la capa
  está aislada para migrar (ver ARQUITECTURA.md).
- Las imágenes son emoji y los rostros son SVG sintéticos (funciona sin internet y sin derechos de imagen).
- No hay recuperación de contraseña por correo.

## Próximos pasos sugeridos

1. Más estructuras de etapas 5-6 y más situaciones completas.
2. Optimización de parámetros FSRS con el historial propio cuando haya suficientes repasos.
3. Modo PWA instalable con caché de la app para uso sin conexión desde el arranque.
