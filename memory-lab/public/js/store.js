/* MEMORY LAB — persistencia en el cliente.
   La base de datos del servidor es la fuente de verdad. En el dispositivo hay:
     · una caché (IndexedDB) para arrancar rápido y funcionar sin conexión;
     · una cola de operaciones pendientes que se envía cuando hay conexión.
   Un resultado solo se muestra como «Guardado» cuando el servidor confirma (ack). */
(function () {
  'use strict';
  const listeners = new Set();
  const S = {
    token: null, user: null, seq: 0,
    docs: {},        // coll -> id -> {data, updated}
    attempts: [],    // ordenados por ts
    attemptIds: new Set(),
    queue: [],       // operaciones pendientes
    status: 'idle',  // idle | saving | saved | offline | error
    lastError: null, lastSaved: 0
  };
  const session = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- IndexedDB mínima ---------- */
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        const r = indexedDB.open('memory-lab', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }
  async function kvGet(k) {
    const db = await idb(); if (!db) return null;
    return new Promise(res => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); });
  }
  async function kvSet(k, v) {
    const db = await idb(); if (!db) return false;
    return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); });
  }
  async function kvDel(k) {
    const db = await idb(); if (!db) return;
    return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(); tx.onerror = () => res(); });
  }

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  function emit() { listeners.forEach(fn => { try { fn(S); } catch (e) { console.error(e); } }); }
  function setStatus(s, err) { S.status = s; S.lastError = err || null; if (s === 'saved') S.lastSaved = Date.now(); emit(); }

  async function api(path, opts) {
    opts = opts || {};
    const res = await fetch(path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: Object.assign({ 'Content-Type': 'application/json' }, S.token ? { Authorization: 'Bearer ' + S.token } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null; try { data = await res.json(); } catch (_) { /* sin cuerpo */ }
    if (res.status === 401 && S.token && !opts.auth) { logoutLocal(); throw Object.assign(new Error('Sesión caducada'), { status: 401 }); }
    if (!res.ok) throw Object.assign(new Error((data && data.error) || ('Error ' + res.status)), { status: res.status, data });
    return data;
  }

  /* ---------- caché local ---------- */
  let saveTimer = null;
  function persistCache() {
    if (!S.user) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      kvSet('cache:' + S.user.id, { seq: S.seq, docs: S.docs, attempts: S.attempts });
    }, 300);
  }
  async function persistQueue() {
    if (!S.user) return false;
    return kvSet('queue:' + S.user.id, S.queue);
  }

  function applyDoc(coll, id, data, updated, deleted) {
    const c = S.docs[coll] || (S.docs[coll] = {});
    const cur = c[id];
    if (cur && cur.updated > updated) return;
    if (deleted) delete c[id]; else c[id] = { data, updated };
  }
  function addAttemptLocal(a) {
    if (S.attemptIds.has(a.id)) return;
    S.attemptIds.add(a.id);
    S.attempts.push(a);
    if (S.attempts.length > 1 && S.attempts[S.attempts.length - 2].ts > a.ts) S.attempts.sort((x, y) => x.ts - y.ts);
  }

  /* ---------- sincronización ---------- */
  let flushing = false, retryTimer = null, backoff = 2000;
  async function flush() {
    if (!S.token || flushing) return;
    flushing = true;
    try {
      let more = true, guard = 0;
      while (more && guard++ < 50) {
        const batch = S.queue.slice(0, 500);
        if (batch.length) setStatus('saving');
        const r = await api('/api/sync', { body: { ops: batch, since: S.seq } });
        const acked = new Set(r.acked);
        r.rejected.forEach(x => { acked.add(x.opid); console.warn('Operación rechazada por el servidor:', x.error); });
        S.queue = S.queue.filter(op => !acked.has(op.opid));
        await persistQueue();
        r.docs.forEach(d => applyDoc(d.coll, d.id, d.data, d.updated, d.deleted));
        r.attempts.forEach(addAttemptLocal);
        S.seq = Math.max(S.seq, r.seq);
        more = r.more || S.queue.length > 0;
        if (r.rejected.length) S.lastError = r.rejected.length + ' operación(es) rechazada(s): ' + r.rejected[0].error;
      }
      persistCache();
      backoff = 2000;
      setStatus(S.queue.length ? 'offline' : 'saved', S.lastError);
    } catch (e) {
      if (e.status === 401) { flushing = false; return; }
      setStatus('offline', e.message);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(flush, backoff);
      backoff = Math.min(backoff * 2, 60000);
    } finally { flushing = false; }
  }
  let flushTimer = null;
  function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 150); }

  async function enqueue(op) {
    op.opid = uuid();
    S.queue.push(op);
    const ok = await persistQueue();
    if (!ok) S.lastError = 'No se pudo guardar la cola local; se enviará directamente.';
    scheduleFlush();
  }

  /* ---------- API pública ---------- */
  const Store = {
    S, session, api,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get loggedIn() { return !!S.token; },
    get pending() { return S.queue.length; },

    async init() {
      S.token = localStorage.getItem('ml.token');
      try { S.user = JSON.parse(localStorage.getItem('ml.user') || 'null'); } catch (_) { S.user = null; }
      if (!S.token || !S.user) { S.token = null; return false; }
      await loadCache();
      try { await api('/api/me'); } catch (e) { if (e.status === 401) return false; }
      await flush();
      return !!S.token;
    },
    async login(username, password, register) {
      const r = await api(register ? '/api/register' : '/api/login', { body: { username, password, device: navigator.userAgent.slice(0, 100) }, auth: true });
      S.token = r.token; S.user = r.user;
      localStorage.setItem('ml.token', r.token);
      localStorage.setItem('ml.user', JSON.stringify(r.user));
      await loadCache();
      await flush();
      return r.user;
    },
    async logout() {
      if (S.queue.length) await flush();
      if (S.queue.length && !confirm('Hay ' + S.queue.length + ' cambios sin enviar al servidor. Si cierras sesión ahora se conservarán en este dispositivo hasta que vuelvas a entrar. ¿Cerrar sesión?')) return false;
      try { await api('/api/logout', { body: {} }); } catch (_) { /* sin conexión */ }
      logoutLocal();
      return true;
    },

    /* Registrar un intento: la fuente de todas las estadísticas. */
    attempt(a) {
      const now = Date.now();
      const rec = Object.assign({ id: uuid(), ts: now, day: Stats.localDay(now) }, a);
      rec.score = Math.max(0, Math.min(1, Number(rec.score) || 0));
      rec.meta = Object.assign({ session }, a.meta || {});
      addAttemptLocal(rec);
      persistCache();
      enqueue({ op: 'attempt', data: rec });
      return rec;
    },
    put(coll, id, data) {
      const updated = Date.now();
      // solo datos serializables: los nodos DOM se guardan como texto
      data = JSON.parse(JSON.stringify(data, (k, v) => (v && typeof v === 'object' && v.nodeType ? v.textContent : v)));
      applyDoc(coll, id, data, updated, false);
      persistCache();
      enqueue({ op: 'put', coll, id, data, updated });
      emit();
    },
    del(coll, id) {
      const updated = Date.now();
      applyDoc(coll, id, null, updated, true);
      persistCache();
      enqueue({ op: 'del', coll, id, updated });
      emit();
    },
    get(coll, id) { const c = S.docs[coll]; return c && c[id] ? c[id].data : null; },
    list(coll) { const c = S.docs[coll] || {}; return Object.keys(c).map(id => Object.assign({ _id: id }, c[id].data)); },
    map(coll) { const c = S.docs[coll] || {}; const o = {}; Object.keys(c).forEach(k => { o[k] = c[k].data; }); return o; },
    attempts(filter) { return filter ? S.attempts.filter(filter) : S.attempts; },
    flush,
    async backup() { return api('/api/backup'); },
    async restore(obj) { const r = await api('/api/restore', { body: obj }); S.seq = 0; await flush(); return r; }
  };

  async function loadCache() {
    S.docs = {}; S.attempts = []; S.attemptIds = new Set(); S.seq = 0; S.queue = [];
    const cache = await kvGet('cache:' + S.user.id);
    if (cache) {
      S.seq = cache.seq || 0; S.docs = cache.docs || {};
      (cache.attempts || []).forEach(addAttemptLocal);
    }
    S.queue = (await kvGet('queue:' + S.user.id)) || [];
    // los intentos en cola también cuentan localmente
    S.queue.forEach(op => { if (op.op === 'attempt') addAttemptLocal(op.data); else if (op.op === 'put') applyDoc(op.coll, op.id, op.data, op.updated, false); else if (op.op === 'del') applyDoc(op.coll, op.id, null, op.updated, true); });
    emit();
  }
  function logoutLocal() {
    S.token = null; S.user = null; S.docs = {}; S.attempts = []; S.attemptIds = new Set(); S.seq = 0; S.queue = [];
    localStorage.removeItem('ml.token'); localStorage.removeItem('ml.user');
    emit();
    if (window.App) window.App.route();
  }

  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); else if (S.queue.length) flush(); });
  setInterval(() => { if (S.token) flush(); }, 60000);
  window.addEventListener('beforeunload', e => { if (S.queue.length && S.status !== 'saved') { e.preventDefault(); e.returnValue = ''; } });
  window.Store = Store;
  window._kvDel = kvDel;
})();
