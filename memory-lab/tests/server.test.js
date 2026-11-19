/* Pruebas de persistencia, sincronización, aislamiento y seguridad del servidor. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server/server');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mlab-'));
const dbFile = path.join(tmp, 'test.db');

function start() {
  const app = createApp({ dbFile, backups: false });
  return new Promise(r => app.server.listen(0, '127.0.0.1', () => r(Object.assign(app, { base: 'http://127.0.0.1:' + app.server.address().port }))));
}
async function stop(app) { await new Promise(r => app.server.close(r)); app.repo.close(); }
async function call(app, method, url, body, token) {
  const res = await fetch(app.base + url, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const day = () => new Date().toISOString().slice(0, 10);

test('persistencia completa: cuenta, ejercicios, nivel, racha, asociaciones, reinicio', async () => {
  let app = await start();
  const reg = await call(app, 'POST', '/api/register', { username: 'ana_test', password: 'clave-segura-1' });
  assert.strictEqual(reg.status, 201);
  const token = reg.body.token;
  const now = Date.now();
  const ops = [];
  for (let i = 0; i < 12; i++) ops.push({ opid: 'o' + i, op: 'attempt', data: { id: 'att-' + i, ts: now - i * 1000, day: day(), module: 'english', item: 'en:i-want-to', skill: 'rec', score: 1, ms: 2000 } });
  ops.push({ opid: 'p1', op: 'put', coll: 'palaces', id: 'casa', data: { name: 'Mi casa', loci: ['puerta', 'sofá', 'cocina'] }, updated: now });
  ops.push({ opid: 'p2', op: 'put', coll: 'srs', id: 'en:i-want-to', data: { S: 3.2, D: 5, reps: 2, lvl: 3 }, updated: now });
  ops.push({ opid: 'p3', op: 'put', coll: 'major', id: '23', data: { word: 'nemo' }, updated: now });
  const s1 = await call(app, 'POST', '/api/sync', { ops, since: 0 }, token);
  assert.strictEqual(s1.status, 200);
  assert.strictEqual(s1.body.acked.length, ops.length);
  assert.strictEqual(s1.body.rejected.length, 0);
  // reenviar el mismo lote (reintento tras corte de red) no duplica
  await call(app, 'POST', '/api/sync', { ops, since: 0 }, token);
  await stop(app);

  // "cerrar completamente la aplicación" y volver a entrar
  app = await start();
  const login = await call(app, 'POST', '/api/login', { username: 'ANA_TEST', password: 'clave-segura-1' });
  assert.strictEqual(login.status, 200);
  const s2 = await call(app, 'POST', '/api/sync', { ops: [], since: 0 }, login.body.token);
  assert.strictEqual(s2.body.attempts.length, 12, 'los intentos siguen intactos y sin duplicar');
  const palace = s2.body.docs.find(d => d.coll === 'palaces' && d.id === 'casa');
  assert.deepStrictEqual(palace.data.loci, ['puerta', 'sofá', 'cocina']);
  assert.strictEqual(s2.body.docs.find(d => d.coll === 'srs').data.lvl, 3);
  assert.strictEqual(s2.body.docs.find(d => d.coll === 'major').data.word, 'nemo');
  await stop(app);
});

test('sincronización entre dispositivos: cambios incrementales y última escritura gana', async () => {
  const app = await start();
  const a = (await call(app, 'POST', '/api/register', { username: 'multi', password: 'clave-segura-2', device: 'pc' })).body.token;
  const b = (await call(app, 'POST', '/api/login', { username: 'multi', password: 'clave-segura-2', device: 'movil' })).body.token;
  const r1 = await call(app, 'POST', '/api/sync', { ops: [{ opid: 'x', op: 'put', coll: 'settings', id: 'main', data: { rate: 1 }, updated: 2000000000000 }] }, a);
  const seq = r1.body.seq;
  const r2 = await call(app, 'POST', '/api/sync', { ops: [], since: 0 }, b);
  assert.strictEqual(r2.body.docs[0].data.rate, 1, 'el móvil recibe lo guardado en el PC');
  // una escritura más antigua no pisa la nueva
  await call(app, 'POST', '/api/sync', { ops: [{ opid: 'y', op: 'put', coll: 'settings', id: 'main', data: { rate: 0.5 }, updated: 1900000000000 }] }, b);
  const r3 = await call(app, 'POST', '/api/sync', { ops: [], since: 0 }, a);
  assert.strictEqual(r3.body.docs[0].data.rate, 1);
  const r4 = await call(app, 'POST', '/api/sync', { ops: [], since: seq }, a);
  assert.strictEqual(r4.body.docs.length, 0, 'sin cambios nuevos después de seq');
  await stop(app);
});

test('seguridad: aislamiento entre usuarios, tokens, validación', async () => {
  const app = await start();
  const t1 = (await call(app, 'POST', '/api/register', { username: 'user_uno', password: 'clave-segura-3' })).body.token;
  const t2 = (await call(app, 'POST', '/api/register', { username: 'user_dos', password: 'clave-segura-4' })).body.token;
  await call(app, 'POST', '/api/sync', { ops: [{ opid: 'a', op: 'put', coll: 'palaces', id: 'secreto', data: { name: 'privado' }, updated: Date.now() }, { opid: 'b', op: 'attempt', data: { id: 'z1', ts: Date.now(), day: day(), module: 'numbers', score: 1 } }] }, t1);
  const other = await call(app, 'POST', '/api/sync', { ops: [], since: 0 }, t2);
  assert.strictEqual(other.body.docs.length, 0, 'user_dos no ve documentos de user_uno');
  assert.strictEqual(other.body.attempts.length, 0, 'user_dos no ve intentos de user_uno');
  // mismo id de intento en otro usuario no colisiona ni filtra
  const r = await call(app, 'POST', '/api/sync', { ops: [{ opid: 'c', op: 'attempt', data: { id: 'z1', ts: Date.now(), day: day(), module: 'numbers', score: 0 } }] }, t2);
  assert.strictEqual(r.body.attempts.length, 1); assert.strictEqual(r.body.attempts[0].score, 0);
  assert.strictEqual((await call(app, 'POST', '/api/sync', { ops: [] })).status, 401, 'sin token');
  assert.strictEqual((await call(app, 'POST', '/api/sync', { ops: [] }, 'token-falso-token-falso-123')).status, 401, 'token falso');
  assert.strictEqual((await call(app, 'POST', '/api/login', { username: 'user_uno', password: 'mala-clave-xx' })).status, 401);
  assert.strictEqual((await call(app, 'POST', '/api/register', { username: 'user_uno', password: 'otra-clave-123' })).status, 409);
  assert.strictEqual((await call(app, 'POST', '/api/register', { username: 'x', password: 'corta' })).status, 400);
  // datos inválidos se rechazan sin romper el lote
  const bad = await call(app, 'POST', '/api/sync', { ops: [{ opid: 'd', op: 'attempt', data: { id: 'q', ts: 5, day: 'x', module: 'n', score: 9 } }, { opid: 'e', op: 'put', coll: '../x', id: 'a', data: {} }] }, t1);
  assert.strictEqual(bad.body.rejected.length, 2);
  // logout invalida el token
  await call(app, 'POST', '/api/logout', {}, t1);
  assert.strictEqual((await call(app, 'GET', '/api/me', null, t1)).status, 401);
  // los archivos fuera de /public no se sirven
  const trav = await fetch(app.base + '/..%2fserver%2fdb.js');
  assert.notStrictEqual(trav.status, 200);
  await stop(app);
});

test('respaldo y restauración idempotente', async () => {
  const app = await start();
  const t = (await call(app, 'POST', '/api/register', { username: 'respaldo', password: 'clave-segura-5' })).body.token;
  await call(app, 'POST', '/api/sync', { ops: [{ opid: 'a', op: 'attempt', data: { id: 'r1', ts: Date.now(), day: day(), module: 'words', score: 0.5, total: 10, correct: 5 } }] }, t);
  const bk = await call(app, 'GET', '/api/backup', null, t);
  assert.strictEqual(bk.body.attempts.length, 1);
  const t2 = (await call(app, 'POST', '/api/register', { username: 'respaldo2', password: 'clave-segura-6' })).body.token;
  await call(app, 'POST', '/api/restore', bk.body, t2);
  await call(app, 'POST', '/api/restore', bk.body, t2);
  const s = await call(app, 'POST', '/api/sync', { ops: [], since: 0 }, t2);
  assert.strictEqual(s.body.attempts.length, 1, 'restaurar dos veces no duplica');
  await stop(app);
});

test('copia de seguridad del archivo de base de datos', () => {
  const { open } = require('../server/db');
  const repo = open(path.join(tmp, 'bk.db'));
  const out = repo.backup(path.join(tmp, 'backups'));
  assert.ok(fs.existsSync(out));
  repo.close();
});
