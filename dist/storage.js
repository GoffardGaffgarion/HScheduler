'use strict';

const diaryStorage = (() => {
    let database;
    const storeName = 'diary';
    const key = 'local';

    function open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('hscheduler', 1);
            request.onupgradeneeded = () => request.result.createObjectStore(storeName);
            request.onsuccess = () => {
                database = request.result;
                database.onversionchange = () => database.close();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    function update(transform) {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            let result;
            request.onsuccess = () => {
                result = transform(request.result);
                if (result && result !== request.result) store.put(result, key);
            };
            transaction.oncomplete = () => resolve(result);
            transaction.onabort = () => reject(transaction.error || new Error('Gravação interrompida'));
        });
    }

    async function load(defaults, legacyKey) {
        let legacy;
        try { legacy = JSON.parse(localStorage.getItem(legacyKey)); } catch { }
        const migrated = Array.isArray(legacy?.schools) && legacy.schools.length ? {
            ...defaults,
            schools: legacy.schools,
            records: legacy.records ?? {},
            rules: legacy.rules ?? [],
            selected: legacy.selected ?? {}
        } : defaults;
        await open();
        return update(current => current ?? { revision: 0, data: migrated });
    }

    function save(revision, data) {
        return update(current => current?.revision === revision ? { revision: revision + 1, data } : null);
    }

    return { load, save };
})();
