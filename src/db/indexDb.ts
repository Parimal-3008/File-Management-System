// db.js - helper for IndexedDB

import { DB_NAME, DB_VERSION, STORE_NAME } from "../constants";

export const initDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });

        store.createIndex("byParentId", "parent_id", { unique: false });
      } else {
        // Ensure new index exists on upgrade for existing stores.
        const tx = (event.target as IDBOpenDBRequest).transaction;
        const store = tx?.objectStore(STORE_NAME);
        if (store && !store.indexNames.contains("byParentId")) {
          store.createIndex("byParentId", "parent_id", { unique: false });
        }
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};
