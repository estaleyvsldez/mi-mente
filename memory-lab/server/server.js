/* MEMORY LAB — servidor HTTP: archivos estáticos + API REST. Sin dependencias externas. */
'use strict';
process.removeAllListeners('warning'); // silencia el aviso experimental de node:sqlite
const http = require('http');
const fs = require('fs');
const path = require('path');
const { open } = require('./db');
const auth = require('./auth');
const ai = require('./ai');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.md': 'text/plain; charset=utf-8' };
const MAX_BODY = 4 * 1024 * 1024;

function createApp(opts) {
  opts = opts || {};
  const root = path.join(__dirname, '..');
  const publicDir = opts.publicDir || path.join(root, 'public');
  const dbFile = opts.dbFile || process.env.ML_DB || path.join(root, 'data', 'memory-lab.db');
  const backupDir = opts.backupDir || path.join(path.dirname(dbFile === ':memory:' ? path.join(root, 'data', 'x') : dbFile), 'backups');
  const repo = open(dbFile);
  const loginLimiter = auth.makeLimiter(20, 15 * 60 * 1000);
  const aiLimiter = auth.makeLimiter(30, 60 * 60 * 1000);

  function send(res, code, obj, headers) {
    const body = JSON.stringify(obj);
    res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}));
    res.end(body);
  }
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(Object.assign(new Error('JSON no válido'), { status: 400 })); }
      });
      req.on('error', reject);
    });
  }
  function userFrom(req) {
    const h = req.headers.authorization || '';
    const m = /^Bearer\s+([\w-]{20,})$/.exec(h);
    if (!m) return null;
    const s = repo.getSession(auth.tokenHash(m[1]));
    return s ? { id: s.user_id, tokenHash: s.token_hash } : null;
  }
  function issue(uid, device) {
    const token = auth.newToken();
    repo.createSession(auth.tokenHash(token), uid, auth.TTL, device);
    return token;
  }

  async function api(req, res, url) {
    const route = req.method + ' ' + url.pathname;
    const ip = req.socket.remoteAddress || 'x';

    if (route === 'GET /api/health') return send(res, 200, { ok: true, db: true, ai: ai.status().enabled });
    if (route === 'POST /api/register' || route === 'POST /api/login') {
      if (!loginLimiter(ip)) return send(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
      const b = await readBody(req);
      const username = String(b.username || '').trim();
      const password = String(b.password || '');
      if (route === 'POST /api/register') {
        const err = auth.validateCredentials(username, password);
        if (err) return send(res, 400, { error: err });
        if (repo.findUser(username)) return send(res, 409, { error: 'Ese nombre de usuario ya existe.' });
        const { hash, salt } = auth.hashPassword(password);
        const uid = repo.createUser(username, hash, salt);
        return send(res, 201, { token: issue(uid, b.device), user: repo.getUser(uid) });
      }
      const u = repo.findUser(username);
      if (!u || !auth.verifyPassword(password, u.salt, u.pass_hash)) return send(res, 401, { error: 'Usuario o contraseña incorrectos.' });
      return send(res, 200, { token: issue(u.id, b.device), user: repo.getUser(u.id) });
    }

    const user = userFrom(req);
    if (!user) return send(res, 401, { error: 'Sesión no válida. Inicia sesión.' });

    if (route === 'POST /api/logout') { repo.deleteSession(user.tokenHash); return send(res, 200, { ok: true }); }
    if (route === 'GET /api/me') return send(res, 200, { user: repo.getUser(user.id), attempts: repo.countAttempts(user.id), ai: ai.status() });

    /* Sincronización: aplica operaciones pendientes del dispositivo y devuelve cambios nuevos. */
    if (route === 'POST /api/sync') {
      const b = await readBody(req);
      const ops = Array.isArray(b.ops) ? b.ops.slice(0, 2000) : [];
      const result = ops.length ? repo.applyOps(user.id, ops) : { acked: [], rejected: [] };
      const since = Math.max(0, Number(b.since) || 0);
      const changes = repo.changesSince(user.id, since, 5000);
      return send(res, 200, Object.assign(result, changes));
    }
    if (route === 'GET /api/backup') {
      return send(res, 200, repo.exportUser(user.id), { 'Content-Disposition': 'attachment; filename="memory-lab-backup.json"' });
    }
    /* Restaurar: importa un respaldo propio (idempotente: no duplica). */
    if (route === 'POST /api/restore') {
      const b = await readBody(req);
      if (!b || b.format !== 'memory-lab-backup') return send(res, 400, { error: 'Archivo de respaldo no válido.' });
      const ops = [];
      (b.attempts || []).forEach((a, i) => ops.push({ opid: 'ra' + i, op: 'attempt', data: a }));
      (b.docs || []).forEach((d, i) => ops.push({ opid: 'rd' + i, op: d.deleted ? 'del' : 'put', coll: d.coll, id: d.id, data: d.data, updated: d.updated }));
      let acked = 0, rejected = 0;
      for (let i = 0; i < ops.length; i += 2000) { const r = repo.applyOps(user.id, ops.slice(i, i + 2000)); acked += r.acked.length; rejected += r.rejected.length; }
      return send(res, 200, { acked, rejected });
    }
    if (route === 'GET /api/ai/status') return send(res, 200, ai.status());
    if (route === 'POST /api/ai') {
      if (!aiLimiter('u' + user.id)) return send(res, 429, { error: 'Límite de peticiones de IA alcanzado por ahora.' });
      const b = await readBody(req);
      try { return send(res, 200, await ai.run(String(b.task || ''), b.input || {})); }
      catch (e) { return send(res, e.status || 500, { error: e.message }); }
    }
    return send(res, 404, { error: 'Ruta no encontrada' });
  }

  function serveStatic(req, res, url) {
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(publicDir, p));
    if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      return serveStatic(req, res, url);
    } catch (e) {
      if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Error interno' });
      if (!e.status) console.error(e);
    }
  });

  // Copia de seguridad al arrancar y cada 24 h.
  let timer = null;
  if (opts.backups !== false && dbFile !== ':memory:') {
    const doBackup = () => { try { repo.backup(backupDir); } catch (e) { console.error('Copia de seguridad fallida:', e.message); } };
    doBackup();
    timer = setInterval(doBackup, 24 * 3600 * 1000); timer.unref();
  }
  server.on('close', () => { if (timer) clearInterval(timer); });
  return { server, repo };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3210;
  const host = process.env.HOST || '0.0.0.0';
  const { server, repo } = createApp();
  server.listen(port, host, () => {
    console.log('MEMORY LAB listo en http://localhost:' + port);
    console.log('Base de datos: ' + repo.file);
    const st = ai.status();
    console.log('IA: ' + (st.enabled ? 'activada (' + st.model + ')' : 'desactivada — ' + st.reason));
  });
  const shutdown = () => { server.close(); try { repo.close(); } catch (_) { /* ya cerrada */ } process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
