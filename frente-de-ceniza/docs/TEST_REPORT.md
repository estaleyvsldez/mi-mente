# Informe de pruebas

Ejecutadas con Chromium sin pantalla (Playwright + SwiftShader) contra `servidor.js`, el 2026-11-19.

## Guardado (`pruebas/guardado.test.js`) — 12/12 pasan, en dos corridas seguidas
Ver `pruebas/resultado_guardado.txt` y SAVE_SYSTEM.md.

## Radio, órdenes e IA (`pruebas/radio_ia.test.js`) — 9/9 pasan
Personalidades · ruta A* que rodea una casa · mantener posición · reagruparse (verificado al llegar) · avanzar (cumplida y confirmada) · la médica cura con botiquín · los compañeros levantan al jugador caído · interpretación de órdenes habladas · al morir se continúa desde el punto de control.

## Anteriores (manuales con script)
Trepar ventana y contenedor, escaleras de la torre, jeep (subir, manejar, bajar, pasajeros), misiones 1–4 arrancan con sus objetos, RPG destruye el blindado con 2 cohetes, recogida de munición por calibre, controles táctiles (disparo, mira al mantener, francotirador).

## No probado
Multijugador con varias personas reales (el entorno no permite WebRTC); rendimiento en teléfonos reales; reconocimiento de voz con micrófono real (se probó el intérprete de frases, no el micrófono).

## Mundo, clima y menú (`pruebas/mundo.test.js`) — 6/6 pasan
Sin escalar, una pendiente empinada frena al jugador (0,20 m) · manteniendo Espacio se escala gastando fuerza (1,5 m, fuerza 91) · la navegación marca laderas (1.786 de 4.096 celdas de muestra en la nieve) · avisos de dirección tipo reloj · la ventisca baja la visibilidad de los NPC a 0,29 · pedir una misión desde la nieve carga la zona y empieza la misión.
Además: los tres mapas cargan sin errores; capturas de selva (tormenta al atardecer, mañana despejada), nieve (ventisca, amanecer), zona (amanecer, noche con lluvia y linterna); regresión: guardado 12/12 y radio/IA 9/9 siguen pasando con el menú nuevo.

## Rendimiento medido (Chromium sin GPU, SwiftShader, 1280×720, un cuadro completo con sombras)
| Mapa | Perfil | Llamadas de dibujo | Triángulos |
|---|---|---|---|
| Zona | Medio | 668 | 846 mil |
| Selva | Medio | 765 | 484 mil |
| Nieve | Medio | 612 | 548 mil |
| Selva | Bajo | 631 | 298 mil |
| Selva | Ultra | 983 | 873 mil |
Los FPS en este entorno (0,3–0,8, sin tarjeta gráfica) **no** representan un equipo real; falta medir en PC y teléfonos reales.
