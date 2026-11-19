# Frente de Ceniza

Juego de disparos en primera persona en el navegador, ambientado en una zona de guerra con ruinas, casas y una base militar. Funciona en PC y en celular (iPhone y Android) y se puede jugar solo o con amigos.

## Cómo jugar

- **En tu PC:** abre `index.html` con doble clic (Chrome o Edge).
- **Con amigos en la misma WiFi:** ejecuta `JUGAR-EN-RED.bat` y comparte la dirección que aparece.
- **Con amigos por internet:** publica el repositorio con GitHub Pages y comparte el enlace.

La primera vez necesita internet para cargar el motor 3D, las texturas y los soldados.

## Controles

| PC | Acción |
|---|---|
| W A S D / Flechas | Moverse (mantén adelante para correr) |
| Ratón | Mirar |
| Clic izquierdo | Disparar |
| Clic derecho | Apuntar con la mira |
| P o R | Recargar |
| 1 2 3 4 5 / Rueda | Fusil, francotirador, pistola, escopeta, cuchillo |
| G | Granada |
| F | Trompada |
| Espacio | Saltar |

En celular aparecen un joystick y botones en pantalla.

## Multijugador

- **CREAR SALA** genera un código de 5 letras.
- Los amigos escriben ese código y tocan **UNIRSE A SALA**.
- Modos: **Cooperativo** (todos contra la máquina) y **Bandos** (Azul contra Rojo, con bots).

## Tecnología

- [Three.js](https://threejs.org) para los gráficos 3D.
- [PeerJS](https://peerjs.com) para conectar a los jugadores.
- Texturas y cielo HDRI de [Poly Haven](https://polyhaven.com) (CC0).
- Modelo de soldado de los ejemplos de Three.js.
