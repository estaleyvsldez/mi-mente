# Arquitectura técnica

## Tecnología (se mantiene, sin migrar de motor)
- **Three.js r160 (WebGL2)** cargado por CDN, un solo archivo `index.html` con módulo ES.
- **PeerJS 1.5.4** (WebRTC) para salas con amigos; el anfitrión es la autoridad.
- **Recursos**: `assets/Soldier.glb` (modelo con esqueleto y animaciones), `assets/quarry_01_1k.hdr` (cielo Poly Haven, CC0). Texturas PBR de Poly Haven por red; si no hay red, texturas procedurales con mapas de normales.
- **Almacenamiento**: localStorage (ranuras A/B), IndexedDB (copia espejo) y, dentro del enlace de Claude, base de datos privada por usuario.

**Por qué no Unreal/Godot ahora:** el juego ya funciona en navegador en PC y teléfono sin instalar nada; migrar de motor obligaría a reescribir todo y perder la distribución por enlace. Se reevaluará si el proyecto necesita servidores dedicados o gráficos que WebGL no pueda dar.

## Módulos dentro de `index.html` (secciones marcadas con `// =====`)
| Sección | Responsabilidad |
|---|---|
| AJUSTES / RENDER / TEXTURAS / MATERIALES | Motor gráfico, calidad, posprocesado |
| MUNDO / GEOMETRÍA | Mapa, edificios, colisionadores |
| EFECTOS / AUDIO + VOCES | Partículas, sonido sintetizado, voz |
| ARMAS / SOLDADOS | Modelos, animación, IK de brazos |
| RED / MULTIJUGADOR | Mensajes, instantáneas, autoridad del anfitrión |
| IA DE LOS ENEMIGOS (`class NPC`) | Percepción, estados, disparo |
| BARRILES, GRANADAS, RECOMPENSAS | Explosivos y objetos |
| JUGADOR / DISPARO Y COMBATE | Movimiento, trepar, armas |
| MUNICIÓN POR CALIBRE / RPG / BLINDADO | Armamento pesado |
| GUARDADO PERSISTENTE (`SAVE`) | Ver SAVE_SYSTEM.md |
| NAVEGACIÓN (A*) | Rejilla de obstáculos y rutas |
| RADIO MILITAR / ÓRDENES / PERSONALIDAD | Ver RADIO_SYSTEM.md y AI_BEHAVIOR.md |
| ESCUADRA, VEHÍCULOS, MISIONES, INTERACCIONES | Juego cooperativo |
| HUD / MENÚ / BUCLE PRINCIPAL | Interfaz y ciclo de juego |

**Deuda técnica conocida:** todo vive en un archivo de ~3700 líneas. Próximo paso de arquitectura: separar en módulos ES (`core/`, `ai/`, `save/`, `radio/`, `missions/`) con un empaquetador, sin cambiar el comportamiento.
