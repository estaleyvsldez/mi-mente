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
    if (Store.mode === 'artifact') return artifactApi(path, opts);
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
    if (Store.mode === 'artifact') return flushArtifact();
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
    mode: 'server',
    S, session, api,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get loggedIn() { return !!S.token; },
    get pending() { return S.queue.length; },

    async init() {
      if (window.claude && typeof window.claude.use === 'function' && location.protocol !== 'file:') {
        const ok = await initArtifact();
        if (ok !== null) return ok;
      }
      try { S.token = localStorage.getItem('ml.token'); S.user = JSON.parse(localStorage.getItem('ml.user') || 'null'); } catch (_) { S.token = null; S.user = null; }
      if (!S.token || !S.user) { S.token = null; return false; }
      await loadCache();
      try { await api('/api/me'); } catch (e) { if (e.status === 401) return false; }
      await flush();
      return !!S.token;
    },
    async login(username, password, register) {
      const r = await api(register ? '/api/register' : '/api/login', { body: { username, password, device: navigator.userAgent.slice(0, 100) }, auth: true });
      S.token = r.token; S.user = r.user;
      try { localStorage.setItem('ml.token', r.token); localStorage.setItem('ml.user', JSON.stringify(r.user)); } catch (_) { /* sesión solo en memoria */ }
      await loadCache();
      await flush();
      return r.user;
    },
    async logout() {
      if (S.queue.length) await flush();
      if (S.queue.length && !window.__forceLogout) { UI.toast('Hay ' + S.queue.length + ' cambios sin enviar. Se conservarán en este dispositivo; pulsa otra vez para cerrar sesión igualmente.', 'bad'); window.__forceLogout = true; return false; }
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
    try { localStorage.removeItem('ml.token'); localStorage.removeItem('ml.user'); } catch (_) { /* almacenamiento bloqueado */ }
    emit();
    if (window.App) window.App.route();
  }

  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); else if (S.queue.length) flush(); });
  setInterval(() => { if (S.token) flush(); }, 60000);
  window.addEventListener('beforeunload', e => { if (S.queue.length && S.status !== 'saved') { e.preventDefault(); e.returnValue = ''; } });

  /* ================= MODO ARTIFACT (claude.ai) =================
     Sin servidor propio: la base de datos es el almacén `db` del artifact, en el subárbol privado
     de cada persona (data/users/<id>/). Los intentos se agrupan en documentos por día y por pestaña
     (nadie sobrescribe los de otro dispositivo); los demás datos son un documento cada uno. */
  let CL = null; const art = { db: null, uid: null, col: null, chunks: {}, dl: null };
  const enc = x => String(x).replace(/[^A-Za-z0-9_-]/g, c => '_' + c.charCodeAt(0).toString(16) + '_');
  async function initArtifact() {
    CL = window.claude;
    const [db, user] = await Promise.all([CL.use('db'), CL.use('user')]);
    if (!db || !user) { Store.mode = 'artifact'; Store.signedOut = true; return false; }
    const uid = await user.id();
    if (!uid) { Store.mode = 'artifact'; Store.signedOut = true; return false; }
    Store.mode = 'artifact';
    art.db = db; art.uid = uid; art.col = db.collection('data/users/' + uid);
    let name = 'Tú';
    try { const me = await user.me(); if (me && me.name) name = me.name.split(' ')[0]; } catch (_) { /* sin nombre */ }
    S.user = { id: 'a-' + uid.slice(0, 12), username: name };
    S.token = 'artifact';
    await loadCache();
    setStatus('saving');
    const timer = setTimeout(() => { if (S.status === 'saving') setStatus('offline', 'El almacén tarda en responder; tus cambios quedan en cola.'); }, 10000);
    try {
      const snap = await art.col.get();
      clearTimeout(timer);
      S.docs = {}; S.attempts = []; S.attemptIds = new Set();
      snap.docs.forEach(d => {
        const b = d.data(); if (!b) return;
        if (b.k === 'doc') applyDoc(b.coll, b.id, b.data, b.updated, false);
        else if (b.k === 'att') { (b.list || []).forEach(addAttemptLocal); art.chunks[d.id] = (b.list || []).slice(); }
      });
      S.queue.forEach(op => { if (op.op === 'attempt') addAttemptLocal(op.data); else if (op.op === 'put') applyDoc(op.coll, op.id, op.data, op.updated, false); else if (op.op === 'del') applyDoc(op.coll, op.id, null, op.updated, true); });
      persistCache();
      setStatus(S.queue.length ? 'saving' : 'saved');
      flushArtifact();
    } catch (e) { clearTimeout(timer); setStatus('offline', e.message || String(e)); }
    return true;
  }
  let artBusy = false;
  async function flushArtifact() {
    if (artBusy || !art.col || !S.queue.length) { if (art.col && !S.queue.length && S.status !== 'error') setStatus('saved'); return; }
    artBusy = true; setStatus('saving');
    try {
      while (S.queue.length) {
        const batch = S.queue.slice(0, 50);
        const touched = new Set();
        for (const op of batch) {
          if (op.op === 'attempt') {
            const a = op.data;
            let key = Object.keys(art.chunks).filter(k => k.startsWith('a_' + a.day + '_' + session)).sort().pop();
            if (!key || art.chunks[key].length >= 300) key = 'a_' + a.day + '_' + session + '_' + Object.keys(art.chunks).filter(k => k.startsWith('a_' + a.day + '_' + session)).length;
            const list = art.chunks[key] || (art.chunks[key] = []);
            if (!list.some(x => x.id === a.id)) list.push(a);
            touched.add(key);
          } else {
            const key = 'd_' + enc(op.coll) + '__' + enc(op.id);
            if (op.op === 'del') await art.col.doc(key).delete();
            else await art.col.doc(key).set({ k: 'doc', coll: op.coll, id: op.id, data: op.data == null ? {} : op.data, updated: op.updated });
          }
        }
        for (const key of touched) await art.col.doc(key).set({ k: 'att', list: art.chunks[key] });
        const done = new Set(batch.map(o => o.opid));
        S.queue = S.queue.filter(o => !done.has(o.opid));
        await persistQueue();
      }
      persistCache();
      setStatus('saved');
    } catch (e) {
      setStatus('offline', (e && (e.message || e.code)) || String(e));
      clearTimeout(retryTimer); retryTimer = setTimeout(flushArtifact, 5000);
    } finally { artBusy = false; }
  }
  async function artifactApi(path, opts) {
    if (path === '/api/ai/status') return { enabled: false, reason: 'En la versión web (claude.ai) la IA del servidor no está disponible. Usa la versión local con ANTHROPIC_API_KEY.' };
    if (path === '/api/backup') return { format: 'memory-lab-backup', v: 1, exported: Date.now(), user: S.user, attempts: S.attempts, docs: Object.keys(S.docs).flatMap(c => Object.keys(S.docs[c]).map(id => ({ coll: c, id, data: S.docs[c][id].data, updated: S.docs[c][id].updated, deleted: false }))) };
    if (path === '/api/restore') {
      const b = opts.body; let n = 0;
      (b.attempts || []).forEach(a => { if (!S.attemptIds.has(a.id)) { addAttemptLocal(a); S.queue.push({ opid: uuid(), op: 'attempt', data: a }); n++; } });
      (b.docs || []).forEach(d => { if (!d.deleted) { applyDoc(d.coll, d.id, d.data, d.updated, false); S.queue.push({ opid: uuid(), op: 'put', coll: d.coll, id: d.id, data: d.data, updated: d.updated }); n++; } });
      await persistQueue(); flushArtifact(); return { acked: n, rejected: 0 };
    }
    throw Object.assign(new Error('Función no disponible en la versión web.'), { status: 501 });
  }
  /* Descarga de archivos en el artifact (el marco bloquea los enlaces de descarga). */
  Store.download = async function (filename, text) {
    if (Store.mode === 'artifact') {
      const d = await CL.use('downloads');
      if (!d) throw new Error('Las descargas no están disponibles en esta vista.');
      return d.save({ filename, data: text });
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = filename; document.body.append(a); a.click(); a.remove();
  };
  window.Store = Store;
  window._kvDel = kvDel;
})();
