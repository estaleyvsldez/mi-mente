# Arquitectura técnica

## Decisión de motor (auditada el 2026-11-19)
**Se mantiene Three.js (WebGL 2) en una sola versión web para PC y teléfono.** No hay aplicación nativa ni migración a Unreal.

### Por qué no Unreal Engine 5 / Unity HDRP
No funcionan en el navegador (Unreal solo por “pixel streaming” desde un servidor con GPU; Unity WebGL no tiene HDRP). Romperían el requisito de abrir el juego desde una dirección web en Chrome, Edge y móviles. Nanite, Lumen, Virtual Shadow Maps y ray tracing son exclusivos de esos motores nativos.

### Babylon.js con WebGPU: evaluación
| Criterio | Babylon.js 7 | Three.js (actual) |
|---|---|---|
| WebGPU con WebGL 2 de respaldo | Maduro y oficial | Disponible (`WebGPURenderer`) en versiones nuevas; requiere actualizar desde r160 |
| Calidad visual alcanzable en web | Similar (PBR, sombras en cascada, SSAO, niebla volumétrica de pago en rendimiento) | Similar |
| Coste de migración | Reescribir ~4.800 líneas: materiales, shaders inyectados (viento, terreno con roca por pendiente), instancias por sectores, posprocesado, animaciones esqueléticas, física propia, IA, red | Ninguno |
| Riesgo para el progreso y sistemas | Alto (guardado, misiones, IA, radio y red tendrían que re-probarse desde cero) | Nulo |
| WebGPU en móviles | Chrome Android reciente sí; Safari iOS solo en versiones muy nuevas → hay que mantener WebGL 2 igual | Igual |

**Conclusión:** Babylon.js no ofrece hoy una mejora visual o de rendimiento que justifique reescribir el juego; el cuello de botella real son las llamadas de dibujo (600–980 por cuadro) y la CPU (IA, partículas), que se resuelven optimizando dentro del motor actual. **Paso recomendado** (sin cambiar de motor): actualizar Three.js a una versión con `WebGPURenderer` estable y activarlo en navegadores compatibles con respaldo automático a WebGL 2. Queda en la hoja de ruta como etapa propia con su batería de pruebas.

## Perfiles PC y MÓVIL (mismo mundo, misiones, armas, NPC, inventario y progreso)
- **Detección automática** al primer arranque: teléfono/tableta → MÓVIL perfil Medio; PC → según la GPU (RTX/Radeon RX/Apple M → Ultra; Intel/Iris/Adreno/Mali → Medio; resto → Alto).
- **Cinco perfiles**: Bajo, Medio, Alto, Ultra, Cinemático (resolución, sombras 1024–4096, oclusión ambiental, bloom, antialiasing, densidad de vegetación, distancia de dibujado, partículas de lluvia/nieve, texturas 256–1024).
- **Opciones sueltas**: distancia, vegetación, sombras, resolución (70/85/100 %), sensibilidad, campo de visión, volumen de radio y tipo de voz.
- **Adaptación en vivo**: resolución dinámica según los FPS; la distancia de la vegetación baja si los FPS caen de 40 y vuelve a subir sobre 57; en móvil con batería <30 % y sin cargar, ahorro de batería (resolución reducida y un cuadro sí, uno no).

## Mundo
- `MAP_ID` (zona/selva/nieve) elige función de relieve, materiales, vegetación, estructuras, clima permitido, bases y vehículos. Terreno de 200×200 m a 1 m de resolución + anillo exterior de 700 m con montañas.
- Shader de terreno: mezcla suelo/roca según la inclinación real (normal en espacio mundo).
- Vegetación por instancias agrupadas en sectores de 40 m (recorte por cámara y por distancia). Shader de viento en hojas, frondas, agujas y pasto.
- Escalada: pendientes por encima de 0,85 (40°) no se caminan; con Espacio mantenido se escalan gastando fuerza; más de ~59° te desliza.
- Navegación A* marca como bloqueadas las celdas empinadas; los NPC no suben acantilados y rodean.

## Cielo y clima
`three/addons/objects/Sky.js` (dispersión atmosférica) + domo de nubes + estrellas + luna. Hora 0–24 h (1 hora de juego = 1 minuto real), presets de clima con transición de 70 s, relámpagos, lluvia y nieve por partículas, humedad que cambia rugosidad y color de los materiales, charcos, bancos de niebla, viento, linterna. El mapa de entorno (reflejos) se regenera al cambiar hora o nubes.

## Módulos dentro de `index.html`
Ver la lista de secciones `// =====`. Nuevas: MAPAS: SELECCIÓN Y RELIEVE · MAPAS: CONSTRUCCIÓN · CIELO, CICLO DE DÍA Y NOCHE Y CLIMA · MENÚ, AJUSTES, PERFILES Y VOZ.
**Deuda técnica**: todo en un archivo de ~4.800 líneas; próximo paso de arquitectura: módulos ES separados con un empaquetador.
