/* MEMORY LAB — capa de persistencia (SQLite integrado en Node, sin dependencias).
   Toda la lógica SQL vive aquí: el resto del servidor solo usa estas funciones,
   así que cambiar a PostgreSQL implica reescribir solo este archivo. */
'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const MIGRATIONS = [
  /* v1 — esquema inicial */
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     pass_hash TEXT NOT NULL,
     salt TEXT NOT NULL,
     created INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created INTEGER NOT NULL,
     expires INTEGER NOT NULL,
     device TEXT
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   /* Cada respuesta del usuario: fuente única de verdad para estadísticas, rachas y récords. */
   CREATE TABLE attempts (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     id TEXT NOT NULL,
     seq INTEGER NOT NULL,
     ts INTEGER NOT NULL,
     day TEXT NOT NULL,
     module TEXT NOT NULL,
     technique TEXT,
     item TEXT,
     skill TEXT,
     score REAL NOT NULL,
     ms INTEGER,
     total INTEGER,
     correct INTEGER,
     meta TEXT,
     PRIMARY KEY (user_id, id)
   );
   CREATE INDEX attempts_user_seq ON attempts(user_id, seq);
   CREATE INDEX attempts_user_day ON attempts(user_id, day);
   /* Documentos por colección: tarjetas de repaso, palacios, PAO, objetivos, ajustes, sesiones interrumpidas… */
   CREATE TABLE docs (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     coll TEXT NOT NULL,
     id TEXT NOT NULL,
     data TEXT NOT NULL,
     updated INTEGER NOT NULL,
     seq INTEGER NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, coll, id)
   );
   CREATE INDEX docs_user_seq ON docs(user_id, seq);
   CREATE TABLE counters (user_id INTEGER PRIMARY KEY, seq INTEGER NOT NULL);`
];

const COLL_RE = /^[a-z][a-z0-9_-]{0,40}$/;
const ID_RE = /^[\w:.\-@#]{1,160}$/;
const MAX_DOC = 256 * 1024;

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (v INTEGER NOT NULL)');
  let row = db.prepare('SELECT v FROM schema_version').get();
  if (!row) { db.prepare('INSERT INTO schema_version (v) VALUES (0)').run(); row = { v: 0 }; }
  for (let v = row.v; v < MIGRATIONS.length; v++) {
    tx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.prepare('UPDATE schema_version SET v = ?').run(v + 1);
    });
  }
  return makeRepo(db, file);
}

function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (_) { /* ya revertida */ } throw e; }
}

function makeRepo(db, file) {
  const q = {
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    userById: db.prepare('SELECT id, username, created FROM users WHERE id = ?'),
    addUser: db.prepare('INSERT INTO users (username, pass_hash, salt, created) VALUES (?, ?, ?, ?)'),
    addSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created, expires, device) VALUES (?, ?, ?, ?, ?)'),
    session: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
    delSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    purgeSessions: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    getSeq: db.prepare('SELECT seq FROM counters WHERE user_id = ?'),
    setSeq: db.prepare('INSERT INTO counters (user_id, seq) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET seq = excluded.seq'),
    attemptExists: db.prepare('SELECT 1 FROM attempts WHERE user_id = ? AND id = ?'),
    addAttempt: db.prepare(`INSERT INTO attempts (user_id, id, seq, ts, day, module, technique, item, skill, score, ms, total, correct, meta)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    getDoc: db.prepare('SELECT updated FROM docs WHERE user_id = ? AND coll = ? AND id = ?'),
    putDoc: db.prepare(`INSERT INTO docs (user_id, coll, id, data, updated, seq, deleted) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(user_id, coll, id) DO UPDATE SET data = excluded.data, updated = excluded.updated, seq = excluded.seq, deleted = excluded.deleted`),
    docsSince: db.prepare('SELECT coll, id, data, updated, seq, deleted FROM docs WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?'),
    attemptsSince: db.prepare('SELECT * FROM attempts WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?'),
    allAttempts: db.prepare('SELECT * FROM attempts WHERE user_id = ? ORDER BY ts'),
    allDocs: db.prepare('SELECT coll, id, data, updated, deleted FROM docs WHERE user_id = ?'),
    countAttempts: db.prepare('SELECT COUNT(*) n FROM attempts WHERE user_id = ?')
  };

  function nextSeq(uid) {
    const r = q.getSeq.get(uid);
    const s = (r ? r.seq : 0) + 1;
    q.setSeq.run(uid, s);
    return s;
  }

  function cleanAttempt(a) {
    if (!a || typeof a !== 'object') throw new Error('intento inválido');
    if (typeof a.id !== 'string' || !ID_RE.test(a.id)) throw new Error('id de intento inválido');
    const ts = Number(a.ts);
    if (!Number.isFinite(ts) || ts < 1.5e12 || ts > Date.now() + 864e5) throw new Error('fecha de intento inválida');
    if (typeof a.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.day)) throw new Error('día inválido');
    if (typeof a.module !== 'string' || !COLL_RE.test(a.module)) throw new Error('módulo inválido');
    const score = Number(a.score);
    if (!(score >= 0 && score <= 1)) throw new Error('puntuación inválida');
    const str = (v, n) => (v == null ? null : String(v).slice(0, n));
    const int = v => (v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v))));
    const meta = a.meta == null ? null : JSON.stringify(a.meta);
    if (meta && meta.length > 16384) throw new Error('meta demasiado grande');
    return { id: a.id, ts, day: a.day, module: a.module, technique: str(a.technique, 60), item: str(a.item, 160), skill: str(a.skill, 30), score, ms: int(a.ms), total: int(a.total), correct: int(a.correct), meta };
  }

  return {
    file,
    raw: db,
    close: () => db.close(),
    tx: fn => tx(db, fn),
    findUser: name => q.userByName.get(name),
    getUser: id => q.userById.get(id),
    createUser(username, passHash, salt) {
      const r = q.addUser.run(username, passHash, salt, Date.now());
      return Number(r.lastInsertRowid);
    },
    createSession(tokenHash, uid, ttlMs, device) {
      const now = Date.now();
      q.purgeSessions.run(now);
      q.addSession.run(tokenHash, uid, now, now + ttlMs, device ? String(device).slice(0, 120) : null);
    },
    getSession(tokenHash) {
      const s = q.session.get(tokenHash);
      if (!s || s.expires < Date.now()) return null;
      return s;
    },
    deleteSession: h => q.delSession.run(h),

    /* Aplica un lote de operaciones de un usuario en UNA transacción.
       Idempotente: reenviar un intento ya guardado no lo duplica. */
    applyOps(uid, ops) {
      return tx(db, () => {
        const acked = [], rejected = [];
        for (const op of ops) {
          try {
            if (op.op === 'attempt') {
              const a = cleanAttempt(op.data);
              if (!q.attemptExists.get(uid, a.id)) {
                q.addAttempt.run(uid, a.id, nextSeq(uid), a.ts, a.day, a.module, a.technique, a.item, a.skill, a.score, a.ms, a.total, a.correct, a.meta);
              }
            } else if (op.op === 'put' || op.op === 'del') {
              if (!COLL_RE.test(op.coll || '') || !ID_RE.test(op.id || '')) throw new Error('colección o id inválido');
              const updated = Number(op.updated) || Date.now();
              const data = op.op === 'del' ? '{}' : JSON.stringify(op.data == null ? {} : op.data);
              if (data.length > MAX_DOC) throw new Error('documento demasiado grande');
              const cur = q.getDoc.get(uid, op.coll, op.id);
              // última escritura gana; una escritura más antigua no pisa una más nueva
              if (!cur || cur.updated <= updated) q.putDoc.run(uid, op.coll, op.id, data, updated, nextSeq(uid), op.op === 'del' ? 1 : 0);
            } else throw new Error('operación desconocida');
            acked.push(op.opid);
          } catch (e) { rejected.push({ opid: op.opid, error: e.message }); }
        }
        return { acked, rejected };
      });
    },
    changesSince(uid, seq, limit) {
      limit = Math.min(limit || 5000, 5000);
      const docs = q.docsSince.all(uid, seq, limit).map(d => ({ coll: d.coll, id: d.id, data: JSON.parse(d.data), updated: d.updated, seq: d.seq, deleted: !!d.deleted }));
      const attempts = q.attemptsSince.all(uid, seq, limit).map(rowToAttempt);
      const r = q.getSeq.get(uid);
      return { docs, attempts, seq: r ? r.seq : 0, more: docs.length === limit || attempts.length === limit };
    },
    exportUser(uid) {
      return {
        format: 'memory-lab-backup', v: 1, exported: Date.now(), user: q.userById.get(uid),
        attempts: q.allAttempts.all(uid).map(rowToAttempt),
        docs: q.allDocs.all(uid).map(d => ({ coll: d.coll, id: d.id, data: JSON.parse(d.data), updated: d.updated, deleted: !!d.deleted }))
      };
    },
    attemptsOf: uid => q.allAttempts.all(uid).map(rowToAttempt),
    countAttempts: uid => q.countAttempts.get(uid).n,
    /* Copia de seguridad consistente del archivo completo. */
    backup(dir) {
      if (file === ':memory:') return null;
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, 'memory-lab-' + new Date().toISOString().slice(0, 10) + '.db');
      if (fs.existsSync(out)) fs.unlinkSync(out);
      db.exec("VACUUM INTO '" + out.replace(/'/g, "''") + "'");
      // conservar solo las 14 copias más recientes
      const files = fs.readdirSync(dir).filter(f => /^memory-lab-.*\.db$/.test(f)).sort();
      while (files.length > 14) fs.unlinkSync(path.join(dir, files.shift()));
      return out;
    }
  };
}

function rowToAttempt(r) {
  return { id: r.id, seq: r.seq, ts: r.ts, day: r.day, module: r.module, technique: r.technique, item: r.item, skill: r.skill, score: r.score, ms: r.ms, total: r.total, correct: r.correct, meta: r.meta ? JSON.parse(r.meta) : null };
}

module.exports = { open };
