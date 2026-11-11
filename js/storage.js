/* Speicherung der Rohläufe in IndexedDB, mit Arbeitsspeicher-Rückfall. */
(function (root) {
  const DB_NAME = 'gpx-lauf-analyse';
  const STORE = 'runs';

  function memoryStorage() {
    const runs = new Map();
    return {
      available: false,
      list: async () => Array.from(runs.values()),
      put: async (run) => void runs.set(run.id, run),
      remove: async (id) => void runs.delete(id),
    };
  }

  const promisify = (req) =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
  }

  async function open() {
    if (!root.indexedDB) return memoryStorage();
    let db;
    try {
      db = await openDb();
    } catch (e) {
      return memoryStorage();
    }
    const store = (mode) => db.transaction(STORE, mode).objectStore(STORE);
    return {
      available: true,
      list: () => promisify(store('readonly').getAll()),
      put: (run) => promisify(store('readwrite').put(run)).then(() => undefined),
      remove: (id) => promisify(store('readwrite').delete(id)).then(() => undefined),
    };
  }

  (root.GpxApp = root.GpxApp || {}).storage = { open };
})(window);
