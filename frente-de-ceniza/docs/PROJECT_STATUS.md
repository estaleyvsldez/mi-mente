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
| Multijugador por sala (PeerJS): cooperativo, misiones, bandos | Programado, **no probado con varias personas** | — |

## Qué falta (ver DEVELOPMENT_ROADMAP.md)
Campaña de 100 misiones, agacharse/arrastrarse/asomarse, más mapas (puerto, montaña, complejo científico), clima y día/noche, destrucción, helicópteros, servidor autoritativo, rangos online, animaciones de captura de movimiento.

## Dónde quedó el trabajo
Fase 1 de la hoja de ruta terminada (guardado, radio, escuadra). Siguiente: fase 2 (movimiento táctico y combate).
