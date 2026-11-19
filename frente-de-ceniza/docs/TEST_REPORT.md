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
