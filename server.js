// Mi Mente Chat — mensajería local sin internet (LAN / hotspot)
// Uso: node server.js   (puerto opcional: PORT=8080 node server.js)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_UPLOAD = 25 * 1024 * 1024; // 25 MB
const MAX_JSON = 64 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Base de datos (archivo JSON) ----------
let db = { users: {}, chats: {}, messages: {} };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { console.error('db.json corrupto, empezando de cero'); }
}
if (!db.chats.general) {
  db.chats.general = { id: 'general', type: 'group', name: 'General', desc: 'Chat de todos', createdBy: null, ts: Date.now() };
  db.messages.general = db.messages.general || [];
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
}

const id = (n = 9) => crypto.randomBytes(n).toString('base64url');
const hash = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const COLORS = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774', '#e0b341'];

function publicUser(u) { return { id: u.id, name: u.name, color: u.color, bio: u.bio || '', online: isOnline(u.id), lastSeen: u.lastSeen || 0 }; }
function userByToken(t) { return t ? Object.values(db.users).find(u => u.tokens && u.tokens.includes(t)) : null; }
function canSee(chat, uid) { return chat.type === 'group' || (chat.members || []).includes(uid); }
function chatView(chat, uid) {
  const msgs = db.messages[chat.id] || [];
  const last = msgs[msgs.length - 1] || null;
  const read = (chat.read && chat.read[uid]) || 0;
  const unread = msgs.filter(m => m.ts > read && m.from !== uid).length;
  const peerRead = Math.max(0, ...Object.entries(chat.read || {}).filter(([k]) => k !== uid).map(([, v]) => v));
  return { ...chat, read: undefined, last, unread, peerRead };
}

// ---------- Tiempo real (Server-Sent Events) ----------
const streams = new Map(); // uid -> Set<res>
function isOnline(uid) { return streams.has(uid) && streams.get(uid).size > 0; }
function send(uid, event, data) {
  const set = streams.get(uid);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}
function broadcast(event, data, filter = () => true) {
  for (const uid of streams.keys()) if (filter(uid)) send(uid, event, data);
}
function toChat(chat, event, data) {
  broadcast(event, data, uid => canSee(chat, uid));
}
setInterval(() => broadcast('ping', {}), 25000);

// ---------- Utilidades HTTP ----------
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('too_big')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const b = await readBody(req, MAX_JSON);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch { return {}; }
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveFile(res, file, type, extraHeaders = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': type || MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, ...extraHeaders });
    fs.createReadStream(file).pipe(res);
  });
}
const clean = (s, max) => String(s || '').trim().slice(0, max);

// ---------- Rutas ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    // Archivos estáticos
    if (req.method === 'GET' && !p.startsWith('/api/') && !p.startsWith('/uploads/')) {
      const f = path.normalize(path.join(PUBLIC_DIR, p === '/' ? 'index.html' : p));
      if (!f.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
      return serveFile(res, f);
    }

    // Registro / inicio de sesión
    if (req.method === 'POST' && p === '/api/login') {
      const { name, pin } = await readJson(req);
      const n = clean(name, 32);
      if (n.length < 2) return json(res, 400, { error: 'El nombre debe tener al menos 2 letras' });
      if (!/^\d{4,8}$/.test(String(pin || ''))) return json(res, 400, { error: 'El PIN debe tener de 4 a 8 números' });
      let u = Object.values(db.users).find(x => x.name.toLowerCase() === n.toLowerCase());
      if (u) {
        if (hash(pin, u.salt) !== u.pin) return json(res, 401, { error: 'PIN incorrecto para ese nombre' });
      } else {
        const salt = id(8);
        u = { id: id(), name: n, color: COLORS[Object.keys(db.users).length % COLORS.length], salt, pin: hash(pin, salt), tokens: [], ts: Date.now() };
        db.users[u.id] = u;
        broadcast('user', publicUser(u));
      }
      const token = id(24);
      u.tokens = [...(u.tokens || []).slice(-9), token];
      save();
      return json(res, 200, { token, me: publicUser(u) });
    }

    // Archivos subidos (requiere token por query para <img src>)
    if (req.method === 'GET' && p.startsWith('/uploads/')) {
      const name = path.basename(p);
      const meta = db.files && db.files[name];
      if (!meta) { res.writeHead(404); return res.end(); }
      const disp = meta.type.startsWith('image/') || meta.type.startsWith('audio/') || meta.type.startsWith('video/') ? 'inline' : 'attachment';
      return serveFile(res, path.join(UPLOAD_DIR, name), meta.type, { 'Content-Disposition': `${disp}; filename*=UTF-8''${encodeURIComponent(meta.name)}`, 'Cache-Control': 'private, max-age=31536000' });
    }

    // A partir de aquí se requiere sesión
    const me = userByToken(req.headers['x-token'] || url.searchParams.get('token'));
    if (!me) return json(res, 401, { error: 'Sesión no válida' });

    // Flujo de eventos en tiempo real
    if (req.method === 'GET' && p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 2000\n\n');
      const wasOnline = isOnline(me.id);
      if (!streams.has(me.id)) streams.set(me.id, new Set());
      streams.get(me.id).add(res);
      if (!wasOnline) broadcast('user', publicUser(me));
      req.on('close', () => {
        const set = streams.get(me.id);
        set.delete(res);
        if (set.size === 0) {
          streams.delete(me.id);
          me.lastSeen = Date.now(); save();
          broadcast('user', publicUser(me));
        }
      });
      return;
    }

    if (req.method === 'GET' && p === '/api/state') {
      const chats = Object.values(db.chats).filter(c => canSee(c, me.id)).map(c => chatView(c, me.id));
      const users = Object.values(db.users).map(publicUser);
      return json(res, 200, { me: publicUser(me), chats, users });
    }

    if (req.method === 'POST' && p === '/api/profile') {
      const { bio } = await readJson(req);
      me.bio = clean(bio, 140); save();
      broadcast('user', publicUser(me));
      return json(res, 200, { me: publicUser(me) });
    }

    if (req.method === 'POST' && p === '/api/logout') {
      const t = req.headers['x-token'];
      me.tokens = (me.tokens || []).filter(x => x !== t); save();
      return json(res, 200, { ok: true });
    }

    // Crear grupo
    if (req.method === 'POST' && p === '/api/groups') {
      const { name, desc } = await readJson(req);
      const n = clean(name, 40);
      if (n.length < 2) return json(res, 400, { error: 'Nombre de grupo muy corto' });
      const chat = { id: id(), type: 'group', name: n, desc: clean(desc, 140), createdBy: me.id, ts: Date.now() };
      db.chats[chat.id] = chat; db.messages[chat.id] = []; save();
      broadcast('chat', chat);
      return json(res, 200, { chat: chatView(chat, me.id) });
    }

    // Abrir chat privado
    if (req.method === 'POST' && p === '/api/dm') {
      const { userId } = await readJson(req);
      const other = db.users[userId];
      if (!other || other.id === me.id) return json(res, 400, { error: 'Usuario no válido' });
      const key = 'dm_' + [me.id, other.id].sort().join('_');
      let chat = db.chats[key];
      if (!chat) {
        chat = { id: key, type: 'dm', members: [me.id, other.id], ts: Date.now() };
        db.chats[key] = chat; db.messages[key] = []; save();
        send(me.id, 'chat', chat); send(other.id, 'chat', chat);
      }
      return json(res, 200, { chat: chatView(chat, me.id) });
    }

    // Mensajes de un chat
    let m = p.match(/^\/api\/chats\/([\w-]+)\/(messages|read|typing)$/);
    if (m) {
      const chat = db.chats[m[1]];
      if (!chat || !canSee(chat, me.id)) return json(res, 404, { error: 'Chat no encontrado' });
      const list = db.messages[chat.id] || (db.messages[chat.id] = []);

      if (req.method === 'GET' && m[2] === 'messages') {
        const before = Number(url.searchParams.get('before')) || Infinity;
        const older = list.filter(x => x.ts < before);
        return json(res, 200, { messages: older.slice(-60), more: older.length > 60 });
      }
      if (req.method === 'POST' && m[2] === 'messages') {
        const body = await readJson(req);
        const text = clean(body.text, 4000);
        const file = body.file && db.files && db.files[body.file] ? { id: body.file, ...db.files[body.file] } : null;
        if (!text && !file) return json(res, 400, { error: 'Mensaje vacío' });
        let reply = null;
        if (body.replyTo) {
          const r = list.find(x => x.id === body.replyTo);
          if (r) reply = { id: r.id, from: r.from, text: (r.text || (r.file ? '📎 ' + r.file.name : '')).slice(0, 120) };
        }
        const msg = { id: id(), chatId: chat.id, from: me.id, text, file, reply, ts: Date.now() };
        list.push(msg);
        chat.read = chat.read || {}; chat.read[me.id] = msg.ts;
        save();
        toChat(chat, 'message', msg);
        return json(res, 200, { message: msg });
      }
      if (req.method === 'POST' && m[2] === 'read') {
        chat.read = chat.read || {}; chat.read[me.id] = Date.now(); save();
        toChat(chat, 'read', { chatId: chat.id, userId: me.id, ts: chat.read[me.id] });
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && m[2] === 'typing') {
        toChat(chat, 'typing', { chatId: chat.id, userId: me.id });
        return json(res, 200, { ok: true });
      }
    }

    // Borrar mensaje propio
    m = p.match(/^\/api\/messages\/([\w-]+)\/([\w-]+)$/);
    if (m && req.method === 'DELETE') {
      const chat = db.chats[m[1]];
      if (!chat || !canSee(chat, me.id)) return json(res, 404, { error: 'Chat no encontrado' });
      const list = db.messages[chat.id] || [];
      const i = list.findIndex(x => x.id === m[2] && x.from === me.id);
      if (i < 0) return json(res, 404, { error: 'Mensaje no encontrado' });
      list.splice(i, 1); save();
      toChat(chat, 'delete', { chatId: chat.id, id: m[2] });
      return json(res, 200, { ok: true });
    }

    // Subir archivo (cuerpo binario)
    if (req.method === 'POST' && p === '/api/upload') {
      const buf = await readBody(req, MAX_UPLOAD).catch(() => null);
      if (!buf) return json(res, 413, { error: 'Archivo demasiado grande (máx. 25 MB)' });
      const fid = id(12);
      const name = clean(decodeURIComponent(url.searchParams.get('name') || 'archivo'), 120);
      const type = clean(req.headers['content-type'] || 'application/octet-stream', 100);
      fs.writeFileSync(path.join(UPLOAD_DIR, fid), buf);
      db.files = db.files || {};
      db.files[fid] = { name, type, size: buf.length };
      save();
      return json(res, 200, { id: fid, ...db.files[fid] });
    }

    json(res, 404, { error: 'Ruta no encontrada' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Error del servidor' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  💬 Mi Mente Chat funcionando (sin internet)\n');
  console.log(`  En este equipo:   http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  Para tus amigos:  http://${a.address}:${PORT}`);
    }
  }
  console.log('\n  Conectaos todos a la misma red Wi-Fi o al hotspot de un móvil.\n');
});
