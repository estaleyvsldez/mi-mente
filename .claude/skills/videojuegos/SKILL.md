---
name: videojuegos
description: Crear videojuegos originales jugables, en el navegador (HTML5 Canvas o Phaser) o en Godot 4. Usar cuando el usuario pida hacer un juego, prototipo, nivel, personaje, mecánica, enemigos, puntuación o arreglar un juego existente.
---

# Videojuegos

## Elegir la herramienta

- **Por defecto: un solo archivo `index.html`** con HTML5 Canvas o Phaser. Se abre con doble clic y se juega al instante, sin instalar nada.
- **Phaser 3** cuando haya física, sprites o varias escenas. Cárgalo desde CDN con versión fija:
  `<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>`
- **Godot 4** solo si el usuario lo pide o el juego es grande (3D, muchas escenas, exportar a celular o PC).

## Cómo construirlo

1. Pregunta solo lo esencial si falta: tipo de juego (plataformas, disparos, carreras, puzzle…) y en qué lo va a jugar (PC o celular). Si no responde, decide tú y dilo.
2. Haz primero una versión mínima jugable: mover al jugador, un objetivo y la forma de ganar o perder. Luego agrega cosas.
3. Estructura del código:
   - Bucle con `requestAnimationFrame` y movimiento multiplicado por `deltaTime`, para que vaya igual de rápido en cualquier PC.
   - Estados: menú → jugando → game over → reiniciar.
   - Controles de teclado y, si es para celular, táctiles.
   - Puntuación y récord (récord en `localStorage`, dentro de `try/catch`).
4. Gráficos: formas y colores hechos con código, o emojis, para no depender de imágenes. Si el usuario tiene sus propios assets, úsalos.
5. Sonido opcional con Web Audio API (bips generados por código).

## Godot 4

- GDScript de Godot 4: `@export`, `@onready`, `func _physics_process(delta)`, `velocity` + `move_and_slide()` sin argumentos, señales con `signal.connect(callable)`.
- Indica en qué nodo va cada script y la estructura de escenas.

## Probar

- Si hay navegador disponible (Playwright), abre el juego, revisa que no haya errores en la consola y toma una captura.
- Dile al usuario cómo abrirlo: doble clic en `index.html`.

## Reglas

- Juegos **originales**. Se puede usar un género o una mecánica conocida, pero no copiar el nombre, los personajes, el arte, la música ni los niveles de un juego existente.
- Explica en 3-5 líneas cómo se juega y qué se puede cambiar fácil (velocidad, dificultad, colores).
