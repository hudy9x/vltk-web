import type { PotentialAllocation } from './potential-worker-client';
export interface PotentialStore {
  get(key: string): Promise<PotentialAllocation | undefined>;
  put(key: string, result: PotentialAllocation): Promise<void>;
}
/** Best-effort bounded storage: denied/quota/blocked IndexedDB never blocks recruitment. */
export function createPotentialStore(factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB): PotentialStore {
  let opening: Promise<IDBDatabase | undefined> | undefined;
  function database() {
    return opening ||= new Promise<IDBDatabase | undefined>(resolve => {
      if (!factory) { resolve(undefined); return; }
      try {
        const request = factory.open('vltk-potential-cache', 1);
        const timer = setTimeout(() => resolve(undefined), 1500);
        request.onupgradeneeded = () => request.result.createObjectStore('allocations', { keyPath: 'key' });
        request.onerror = request.onblocked = () => { clearTimeout(timer); resolve(undefined); };
        request.onsuccess = () => { clearTimeout(timer); const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
      } catch { resolve(undefined); }
    });
  }
  return {
    async get(key) {
      const db = await database(); if (!db) return;
      return new Promise(resolve => {
        const timer = setTimeout(() => resolve(undefined), 1500);
        try {
          const tx = db.transaction('allocations', 'readonly'), request = tx.objectStore('allocations').get(key);
          request.onsuccess = () => { clearTimeout(timer); resolve(request.result?.result); };
          tx.onerror = tx.onabort = () => { clearTimeout(timer); resolve(undefined); };
        } catch { clearTimeout(timer); resolve(undefined); }
      });
    },
    async put(key, result) {
      const db = await database(); if (!db) return;
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 1500);
        try {
          const tx = db.transaction('allocations', 'readwrite'), store = tx.objectStore('allocations');
          store.put({ key, result, savedAt: Date.now() });
          const all = store.getAll();
          all.onsuccess = () => {
            const rows = all.result.sort((a, b) => a.savedAt - b.savedAt);
            for (const row of rows.slice(0, Math.max(0, rows.length - 512))) store.delete(row.key);
          };
          tx.oncomplete = tx.onerror = tx.onabort = () => { clearTimeout(timer); resolve(); };
        } catch { clearTimeout(timer); resolve(); }
      });
    },
  };
}
