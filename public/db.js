const DB_NAME = "sleep_log_db";
const DB_VERSION = 1;
const ENTRIES_STORE = "entries";
const SETTINGS_STORE = "settings";

let dbPromise;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
          db.createObjectStore(ENTRIES_STORE, { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open IndexedDB"));
    });
  }
  return dbPromise;
}

export async function putEntry(entry) {
  const db = await openDb();
  const tx = db.transaction(ENTRIES_STORE, "readwrite");
  tx.objectStore(ENTRIES_STORE).put(entry);
  await transactionDone(tx);
}

export async function getEntry(date) {
  const db = await openDb();
  const tx = db.transaction(ENTRIES_STORE, "readonly");
  const value = await requestToPromise(tx.objectStore(ENTRIES_STORE).get(date));
  await transactionDone(tx);
  return value || null;
}

export async function getAllEntries() {
  const db = await openDb();
  const tx = db.transaction(ENTRIES_STORE, "readonly");
  const values = await requestToPromise(tx.objectStore(ENTRIES_STORE).getAll());
  await transactionDone(tx);
  return values.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntriesByRange(startDate, endDate) {
  const db = await openDb();
  const tx = db.transaction(ENTRIES_STORE, "readonly");
  const range = IDBKeyRange.bound(startDate, endDate);
  const values = await requestToPromise(tx.objectStore(ENTRIES_STORE).getAll(range));
  await transactionDone(tx);
  return values.sort((a, b) => b.date.localeCompare(a.date));
}

export async function setSetting(key, value) {
  const db = await openDb();
  const tx = db.transaction(SETTINGS_STORE, "readwrite");
  tx.objectStore(SETTINGS_STORE).put({ key, value });
  await transactionDone(tx);
}

export async function getSetting(key) {
  const db = await openDb();
  const tx = db.transaction(SETTINGS_STORE, "readonly");
  const row = await requestToPromise(tx.objectStore(SETTINGS_STORE).get(key));
  await transactionDone(tx);
  return row ? row.value : null;
}

export async function getAllSettings() {
  const db = await openDb();
  const tx = db.transaction(SETTINGS_STORE, "readonly");
  const rows = await requestToPromise(tx.objectStore(SETTINGS_STORE).getAll());
  await transactionDone(tx);
  return rows;
}

export async function clearAllData() {
  const db = await openDb();
  const tx = db.transaction([ENTRIES_STORE, SETTINGS_STORE], "readwrite");
  tx.objectStore(ENTRIES_STORE).clear();
  tx.objectStore(SETTINGS_STORE).clear();
  await transactionDone(tx);
}

export async function replaceAllData(entries = [], settings = []) {
  const db = await openDb();
  const tx = db.transaction([ENTRIES_STORE, SETTINGS_STORE], "readwrite");
  const entriesStore = tx.objectStore(ENTRIES_STORE);
  const settingsStore = tx.objectStore(SETTINGS_STORE);

  entriesStore.clear();
  settingsStore.clear();

  for (const entry of entries) {
    entriesStore.put(entry);
  }
  for (const setting of settings) {
    settingsStore.put(setting);
  }

  await transactionDone(tx);
}
