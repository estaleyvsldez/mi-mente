# Comportamiento de la IA

## Compañeros
| Nombre | Personalidad | Efecto real en el juego |
|---|---|---|
| TORRES (ALFA) | Asalto agresivo | Frases agresivas y con groserías; avisa cuando cambia de cobertura |
| VEGA (MÉDICO) | Médica protectora | 4 botiquines; cura al jugador si baja de 45 de vida y a compañeros graves; reanima más rápido |
| MORALES (BRAVO) | Tirador paciente | Más puntería (×1.45) y frases calmadas |
| RAMÍREZ (CHARLIE) | Explorador | Se une tras rescatarlo en la misión 3 |

- **Seguir**: formación detrás del jugador con separación por puesto; ruta A* si hay obstáculos.
- **Combate**: buscan cobertura (punto cercano protegido a la altura del cuerpo pero con tiro de pie), disparan, administran munición (210 balas; piden munición cuando bajan de 40 y recuperan fuera de combate).
- **Jugador caído**: la médica (o quien esté libre) va por él aunque haya combate y avisa; los demás se acercan a menos de 7 m para cubrir.
- **Compañero caído**: lo reaniman; si el jugador está cerca y lo deja morir, baja la confianza de esa persona.
- **Órdenes**: con verificación de cumplimiento y aviso de fallo (ver RADIO_SYSTEM.md).
- **Relaciones**: confianza 0–100 por compañero; sube si lo curas (+8), si te salva (+3), si terminan misiones juntos (+4); baja si lo abandonas (−12) o muere (−3). La confianza aumenta su vida máxima (120 + 0,6 × confianza) y cambia lo que te dicen al empezar misiones («Te debo la vida, jefe», «Esta vez no me dejes tirado»).
- **Sin teletransporte** salvo una recuperación de emergencia a más de 90 m y fuera de la vista del jugador.

## Enemigos
Visión con cono y línea de vista, audición de disparos, sospecha acumulada, combate, búsqueda de la última posición, patrullas, aviso a compañeros cuando uno cae, retirada de granadas, oficial con boina roja que lleva la llave, blindado con torreta.

## Pruebas de IA: `pruebas/radio_ia.test.js` (resultados en `pruebas/resultado_radio.txt`)
