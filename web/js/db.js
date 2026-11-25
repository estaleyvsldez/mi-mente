// Guardado en el navegador (IndexedDB): series, guiones y tomas generadas, para seguir otro día.
(function () {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open('mimente', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const r = fn(t.objectStore(store));
      t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }
  MM.db = {
    async get(key) { try { return await tx('kv', 'readonly', (s) => s.get(key)); } catch { return undefined; } },
    async set(key, value) { try { await tx('kv', 'readwrite', (s) => s.put(value, key)); } catch { /* sin espacio */ } },
    async del(key) { try { await tx('kv', 'readwrite', (s) => s.delete(key)); } catch { /* */ } },
    async keys() { try { return await tx('kv', 'readonly', (s) => s.getAllKeys()); } catch { return []; } },
    async getBlob(key) { try { return await tx('blobs', 'readonly', (s) => s.get(key)); } catch { return undefined; } },
    async setBlob(key, blob) { try { await tx('blobs', 'readwrite', (s) => s.put(blob, key)); } catch { /* sin espacio */ } },
  };
})();
