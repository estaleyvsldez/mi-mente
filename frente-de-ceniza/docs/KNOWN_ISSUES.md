# Problemas conocidos
- Todo el código está en un solo `index.html` (difícil de mantener; ver arquitectura).
- La voz de la radio no lleva filtro de audio real: la síntesis de voz del navegador no se puede procesar con Web Audio. La radio se distingue con chasquidos y estática.
- El reconocimiento de voz solo funciona en navegadores que lo ofrecen (Chrome/Edge) y puede depender de servicios del navegador; dentro del enlace de Claude el micrófono puede estar bloqueado.
- En el enlace de Claude no funcionan las salas con amigos (WebRTC bloqueado) ni las texturas de Poly Haven.
- Los enemigos no usan todavía rutas A* ni cobertura (solo los compañeros).
- No hay agacharse, arrastrarse ni asomarse todavía.
- Al cargar un punto de control los enemigos de la zona se generan de nuevo (no se guarda la posición exacta de cada enemigo).
- Con dos pestañas abiertas en la misma partida, la atrasada deja de guardar (a propósito, para no pisar progreso).
- Las personalidades todavía no cambian la distancia de seguimiento ni la agresividad del movimiento (solo puntería, curación y diálogos).
