// Servidor local para jugar con amigos en la misma red WiFi.
// Uso: doble clic en JUGAR-EN-RED.bat (o: node servidor.js)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const PORT = 8080, ROOT = __dirname;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(PORT, () => {
  console.log('\n  FRENTE DE CENIZA - servidor encendido\n');
  console.log('  En esta PC:      http://localhost:' + PORT);
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || [])
    if (a.family === 'IPv4' && !a.internal) console.log('  Amigos (WiFi):   http://' + a.address + ':' + PORT);
  console.log('\n  Deja esta ventana abierta mientras juegan. Ctrl+C para cerrar.\n');
});
