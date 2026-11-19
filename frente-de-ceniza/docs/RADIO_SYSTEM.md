# Radio táctica

- **Interfaz (HUD)**: canal y frecuencia, barras de señal, indicadores TX (transmites) y RX (recibes), historial de los últimos mensajes con emisor y canal, aviso de silencio de radio. Panel de órdenes con **T** (teclado: 1-0 órdenes, `−` silencio, Tab destinatario, Y canal) o botón **RADIO** en teléfono.
- **Canales**: Escuadra, Mando, Médico, Reconocimiento, Operaciones, Emergencia. Las órdenes solo llegan por Escuadra o Emergencia (la petición de médico también por Médico); en otro canal la radio responde que nadie del escuadrón escucha.
- **Prioridades**: 1 emergencia, 2 amenazas, 3 heridos y mando, 4 órdenes, 5 táctica, 6 reportes, 7 charla, 8 humor. Cola de un mensaje a la vez; lo urgente interrumpe; lo viejo y poco importante se descarta.
- **Efectos**: chasquido al abrir y cerrar, estática según la señal, palabras perdidas con señal débil, «SIN SEÑAL» lejos del equipo. La voz usa la síntesis de voz del navegador con tono y velocidad propios de cada compañero; la estática es sonido aparte (la voz del navegador no puede filtrarse por audio web).
- **Órdenes**: sígueme, mantén posición, cúbreme, ataca ahí, reagrupamiento, avanza, retirada, médico cúrame, rescata al herido, explora ahí, silencio de radio. Cada compañero confirma («Recibido, te cubro»), ejecuta y **solo informa “cumplida” cuando llega** (o «No puedo llegar, la ruta está bloqueada» si se atasca).
- **Voz**: tecla **B** o botón en el panel. Usa el reconocimiento de voz del navegador (Chrome/Edge; puede usar servidores del navegador). Las órdenes se interpretan en el propio juego (destinatario + orden), y siempre hay alternativa por teclado y toque.
- **Comunicación autónoma**: contacto, heridas, munición baja, flanqueo a tu espalda, emboscada, compañero caído, jefe caído, cobertura mientras recargas, curaciones, charla entre compañeros cuando hay calma.

## Voces (actualizado)
- **Naturales**: dentro del enlace de Claude, la radio usa la voz natural de Claude (capacidad `tts`), una voz distinta por personaje (Torres, Vega, Morales, Ramírez, Mando).
- **Navegador**: fuera del enlace se elige la mejor voz en español disponible (prioriza voces “Natural/Neural/Online”, por ejemplo las de Edge) y se reparten voces distintas por personaje.
- **Grabaciones propias (preparado)**: si existe `voces/manifest.json` con archivos de audio por personaje y situación, se usan esos en lugar de la síntesis y **sí** pasan por un filtro de radio real (paso banda 320–3200 Hz y saturación). Formato: `{"TORRES":{"contactDir":["torres/contacto_1.mp3"],"down":["torres/herido_1.mp3"]}}` con las claves de categoría de `RL` (contact, contactDir, hit, down, thanks, reload, flank, ammo, wounded, lost, playerDown, healing, healDone, ambush, clear, idle, reply, killConf, praise, night). **Hoy no hay grabaciones**: hacen falta actores de voz.
- **Solo subtítulos**: opción para jugar sin voz.
- Enemigos: ya no usan la voz sintética (sonaba robótica); se oyen gritos sintetizados con formantes y su frase aparece en subtítulos.
- Avisos con contexto real: dirección tipo reloj y distancia («¡Contacto a las dos, cuarenta metros!»), confirmación de bajas de los compañeros, elogios a tus tiros a la cabeza, avisos de mando cuando cambia el clima y comentarios de noche.
