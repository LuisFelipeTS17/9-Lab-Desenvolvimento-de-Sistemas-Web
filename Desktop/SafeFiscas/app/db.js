/* Camada de armazenamento local (IndexedDB).
   Guarda todas as notas no proprio aparelho, inclusive as fotos.
   Expoe um objeto global `DB` usado pelo app.js. */
(function () {
  const DB_NAME = 'safefiscas';
  const STORE = 'kv';
  const VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function set(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  window.DB = {
    async loadNotas() {
      try {
        return (await get('notas')) || null;
      } catch (e) {
        // Fallback para localStorage caso IndexedDB nao esteja disponivel.
        const raw = localStorage.getItem('safefiscas_notas');
        return raw ? JSON.parse(raw) : null;
      }
    },
    async saveNotas(notas) {
      try {
        await set('notas', notas);
      } catch (e) {
        localStorage.setItem('safefiscas_notas', JSON.stringify(notas));
      }
    }
  };
})();
