# 💬 Mi Mente Chat

Una app de mensajería parecida a Telegram que funciona **sin internet**: tú y tus amigos os conectáis a la misma red Wi‑Fi (o al hotspot de un móvil) y chateáis desde el navegador. No hace falta instalar nada en los móviles de tus amigos.

## Funciones
- Chat de grupo **General** y grupos que crea cualquiera
- **Chats privados** (pestaña *Personas* → toca a alguien)
- Enviar **fotos, vídeos, audios y archivos** (hasta 25 MB)
- **Notas de voz** (mantén pulsado 🎤; solo funciona en el equipo servidor o con HTTPS)
- Ver quién está **en línea**, "escribiendo…" y la hora en que se vio por última vez
- Confirmación de lectura ✓✓ en chats privados
- **Responder**, copiar y eliminar mensajes (clic derecho o mantener pulsado)
- Contador de mensajes no leídos, sonido y vibración
- Modo oscuro automático; se puede añadir a la pantalla de inicio
- Todo se guarda en el dispositivo que hace de servidor (`data/`)

## Cómo usarlo

Un solo dispositivo hace de **servidor** (un portátil, un PC o un móvil Android con Termux). Solo necesita [Node.js](https://nodejs.org) 18 o superior; no hay dependencias que descargar.

1. Conecta todos los dispositivos a la misma red Wi‑Fi o al hotspot de un móvil (el hotspot no necesita datos móviles).
2. En el servidor:
   ```bash
   node server.js
   ```
3. La consola mostrará algo como `Para tus amigos: http://192.168.1.34:3000`. Tus amigos abren esa dirección en el navegador.
4. Cada uno escribe su nombre y un PIN. Si el nombre es nuevo, se crea la cuenta; para volver a entrar se usa el mismo nombre y PIN.

### En un móvil Android (Termux)
```bash
pkg install nodejs git
git clone <este-repositorio> && cd mi-mente
node server.js
```
Activa el hotspot del móvil y comparte la dirección que aparece.

### Cambiar el puerto
```bash
PORT=8080 node server.js
```

## Notas
- Los mensajes viajan por la red local sin cifrar (HTTP). Úsalo con gente de confianza.
- Si en Windows no te pueden conectar, permite Node.js en el firewall cuando te lo pregunte.
- Para borrar todo y empezar de cero, elimina la carpeta `data/`.
