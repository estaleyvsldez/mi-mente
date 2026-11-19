# Estado del proyecto — Operación Zero: Proyecto Némesis

Última actualización: 2026-11-19. Rama: `claude/dazzling-franklin-170jx0`.

## Qué funciona hoy (probado)
| Sistema | Estado | Prueba |
|---|---|---|
| FPS base (moverse, correr, saltar, trepar muros/ventanas, escaleras) | Funciona | Manual + script |
| Armas: fusil, francotirador, pistola, escopeta, RPG, cuchillo, granadas | Funciona | Manual + script |
| Munición por calibre repartida por el mapa | Funciona | Script |
| Jeeps manejables, blindado enemigo (solo RPG/explosivos) | Funciona | Script |
| 4 misiones con objetivos, pistas, extracción, fracaso y reintento | Funciona | Script |
| **Guardado persistente, 3 partidas, puntos de control, CONTINUAR** | **Funciona** | `pruebas/guardado.test.js` (A–J) |
| Escuadra: Torres (asalto), Vega (médica), Morales (tirador) | Funciona | `pruebas/radio_ia.test.js` |
| Órdenes por radio (teclado, toque, voz) verificadas al cumplirse | Funciona | `pruebas/radio_ia.test.js` |
| Rutas A* para compañeros (rodean paredes) | Funciona | `pruebas/radio_ia.test.js` |
| Relaciones y memoria de compañeros (persisten) | Funciona | Prueba I |
| Tres mapas: zona, selva tropical, montañas nevadas | Funciona | `pruebas/mundo.test.js` + capturas |
| Escalada de pendientes con fuerza, deslizamiento, rutas de subida | Funciona | `pruebas/mundo.test.js` |
| Cielo físico, ciclo de día y noche, clima dinámico (lluvia, tormenta, niebla, nieve, ventisca, viento) | Funciona | capturas por mapa y clima |
| Menú con pestañas, perfiles PC/MÓVIL y 5 calidades, ajustes de controles | Funciona | capturas PC y teléfono |
| Voces naturales (enlace de Claude), mejor voz del navegador, grabaciones propias preparadas | Funciona / grabaciones pendientes | — |
| Multijugador por sala (PeerJS): cooperativo, misiones, bandos; el mapa se sincroniza | Programado, **no probado con varias personas** | — |

## Qué falta (ver DEVELOPMENT_ROADMAP.md)
Campaña de 100 misiones, agacharse/arrastrarse/asomarse, mapas de puerto y complejo científico, destrucción, helicópteros, servidor autoritativo, rangos online, animaciones de captura de movimiento, modelos 3D y voces grabadas profesionales, WebGPU.

## Dónde quedó el trabajo
Fase 1 de la hoja de ruta terminada (guardado, radio, escuadra). Siguiente: fase 2 (movimiento táctico y combate).
