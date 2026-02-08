import {
  DB_NAME,
  STORE_NAME,
  DB_VERSION,
  NAME_INDEX_STORE,
} from "../constants";
import { openDB } from "idb";

interface FileRecord {
  id: string;
  name?: string;
  path: string;
  directory?: string;
  parent_id?: string | null;
  [key: string]: unknown;
}

interface NameIndexRecord {
  token: string;
  fileId: string | number;
  parent_id: string | number | null;
}

type NameIndexWritableStore = {
  put: (value: NameIndexRecord) => unknown;
};

async function openFileDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      const store = !db.objectStoreNames.contains(STORE_NAME)
        ? db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          })
        : tx.objectStore(STORE_NAME);

      // Ensure required indexes exist (safe to call conditionally).
      if (!store.indexNames.contains("byParentId")) {
        store.createIndex("byParentId", "parent_id", { unique: false });
      }

      if (!db.objectStoreNames.contains(NAME_INDEX_STORE)) {
        const indexStore = db.createObjectStore(NAME_INDEX_STORE, {
          keyPath: ["token", "fileId"],
        });
        indexStore.createIndex("byToken", "token", { unique: false });
        indexStore.createIndex("byTokenParent", ["token", "parent_id"], {
          unique: false,
        });
      } else {
        const indexStore = tx.objectStore(NAME_INDEX_STORE);
        if (!indexStore.indexNames.contains("byToken")) {
          indexStore.createIndex("byToken", "token", { unique: false });
        }
        if (!indexStore.indexNames.contains("byTokenParent")) {
          indexStore.createIndex("byTokenParent", ["token", "parent_id"], {
            unique: false,
          });
        }
      }
    },
  });
}

const TRIGRAM_SIZE = 3;
const INDEX_BUILD_BATCH_SIZE = 1000;
const indexedParents = new Set<string>();
const indexingInFlight = new Map<string, Promise<void>>();

const buildTrigrams = (name: string) => {
  const normalized = name.trim().toLowerCase();
  if (normalized.length < TRIGRAM_SIZE) return [];
  const tokens = new Set<string>();
  for (let i = 0; i <= normalized.length - TRIGRAM_SIZE; i += 1) {
    tokens.add(normalized.slice(i, i + TRIGRAM_SIZE));
  }
  return Array.from(tokens);
};

const updateNameIndexForItems = (
  indexStore: NameIndexWritableStore,
  items: FileRecord[]
) => {
  const tokenMap = new Map<string, Set<string | number>>();

  for (const item of items) {
    const name = String(item.name ?? "").trim();
    if (!name || !item.id) continue;
    const trigrams = buildTrigrams(name);
    if (trigrams.length === 0) continue;
    for (const token of trigrams) {
      const set = tokenMap.get(token) ?? new Set<string | number>();
      set.add(item.id);
      tokenMap.set(token, set);
    }
  }

  for (const [token, idsToAdd] of tokenMap) {
    for (const fileId of idsToAdd) {
      const parentId = items.find((item) => item.id === fileId)?.parent_id;
      indexStore.put({ token, fileId, parent_id: parentId ?? null });
    }
  }
};

export async function batchInsert(items: unknown[], batchSize = 1000) {
  const db = await openFileDB();

  let index = 0;

  while (index < items.length) {
    const batch = items.slice(index, index + batchSize);

    // Initial bootstrap load writes only primary records.
    // Name index entries are built lazily when folders are rendered.
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const item of batch) {
      store.put(item);
    }

    await tx.done;

    index += batchSize;
  }

  db.close();
}

export async function insertFiles(items: FileRecord[]) {
  const db = await openFileDB();
  try {
    const tx = db.transaction([STORE_NAME, NAME_INDEX_STORE], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const indexStore = tx.objectStore(NAME_INDEX_STORE);
    for (const item of items) {
      store.put(item);
    }
    updateNameIndexForItems(indexStore, items);
    await tx.done;
  } finally {
    db.close();
  }
}

export async function updateFiles(items: FileRecord[]) {
  // put() upserts by keyPath, so update is same as insert for existing ids
  return insertFiles(items);
}

export async function deleteFilesByIds(ids: (string | number)[]) {
  const db = await openFileDB();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    await tx.done;
  } finally {
    db.close();
  }
}

// Count total children of a directory by parent_id
// For root, parent_id is 0
export async function countChildrenByParentId(
  parentId: string | number = 0
): Promise<number> {
  const db = await openFileDB();

  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("byParentId");
    return await index.count(parentId);
  } catch (error) {
    console.error("Error counting children:", error);
    return 0;
  } finally {
    db.close();
  }
}

// Get children of a directory by parent_id
// Supports simple pagination via `offset` + `limit`
// For root, parent_id is 0
export async function getFilesByParentId(
  parentId: string | number = 0,
  limit: number = 150,
  offset: number = 0
) {
  const db = await openFileDB();

  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const items: FileRecord[] = [];
    const index = store.index("byParentId");

    let cursor = await index.openCursor(parentId);
    if (cursor && offset > 0) {
      // Jump directly to the requested offset within this parent group.
      cursor = await cursor.advance(offset);
    }

    while (cursor && items.length < limit) {
      items.push(cursor.value as FileRecord);
      cursor = await cursor.continue();
    }

    return items;
  } catch (error) {
    console.error("Error fetching files:", error);
    return [];
  } finally {
    db.close();
  }
}

export async function ensureParentIndexed(
  parentId: string | number = 0
): Promise<void> {
  const parentKey = String(parentId);
  if (indexedParents.has(parentKey)) return;

  const existing = indexingInFlight.get(parentKey);
  if (existing) {
    await existing;
    return;
  }

  const indexingPromise = (async () => {
    const db = await openFileDB();
    try {
      const tx = db.transaction([STORE_NAME, NAME_INDEX_STORE], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const indexStore = tx.objectStore(NAME_INDEX_STORE);
      const parentIndex = store.index("byParentId");

      let cursor = await parentIndex.openCursor(parentId);
      let batch: FileRecord[] = [];

      while (cursor) {
        batch.push(cursor.value as FileRecord);
        if (batch.length >= INDEX_BUILD_BATCH_SIZE) {
          updateNameIndexForItems(indexStore, batch);
          batch = [];
        }
        cursor = await cursor.continue();
      }

      if (batch.length > 0) {
        updateNameIndexForItems(indexStore, batch);
      }

      await tx.done;
      indexedParents.add(parentKey);
    } finally {
      db.close();
      indexingInFlight.delete(parentKey);
    }
  })();

  indexingInFlight.set(parentKey, indexingPromise);

  try {
    await indexingPromise;
  } catch (error) {
    console.error("Error indexing parent:", error);
  }
}

// Get a single file by id
export async function getFileById(id: string): Promise<FileRecord | null> {
  const db = await openFileDB();

  try {
    const file = (await db.get(STORE_NAME, id)) as FileRecord | undefined;
    return file || null;
  } catch (error) {
    console.error("Error fetching file by id:", error);
    return null;
  } finally {
    db.close();
  }
}

// Get all files from IndexedDB
export async function getAllFiles(limit: number = 150) {
  const db = await openFileDB();

  try {
    const allItems = await db.getAll(STORE_NAME);
    return allItems.slice(0, limit);
  } catch (error) {
    console.error("Error fetching all files:", error);
    return [];
  } finally {
    db.close();
  }
}

// Search files by name within a parent directory using trigram index.
export async function searchFilesByNameAndParentId(
  input: string,
  parentId: string | number | null = 0,
  limit: number = 150
): Promise<FileRecord[]> {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return [];
  if (normalized.length < TRIGRAM_SIZE) return [];
  await ensureParentIndexed(parentId ?? 0);

  const db = await openFileDB();

  try {
    const tx = db.transaction([STORE_NAME, NAME_INDEX_STORE], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const indexStore = tx.objectStore(NAME_INDEX_STORE);

    const tokens = buildTrigrams(normalized);
    if (tokens.length === 0) return [];

    const byTokenParent = indexStore.index("byTokenParent");
    let candidateIds: Set<string | number> | null = null;

    for (const token of tokens) {
      const records = (await byTokenParent.getAll(
        IDBKeyRange.only([token, parentId])
      )) as NameIndexRecord[];
      const ids = new Set(records.map((record) => record.fileId));

      if (!candidateIds) {
        candidateIds = ids;
      } else {
        const intersection = new Set<string | number>();
        for (const id of candidateIds) {
          if (ids.has(id)) intersection.add(id);
        }
        candidateIds = intersection;
      }

      if (!candidateIds || candidateIds.size === 0) break;
    }

    if (!candidateIds || candidateIds.size === 0) return [];

    const results: FileRecord[] = [];
    for (const id of candidateIds) {
      if (results.length >= limit) break;
      const item = (await store.get(id)) as FileRecord | undefined;
      if (!item) continue;
      const name = String(item.name ?? "").toLowerCase();
      if (name.includes(normalized)) {
        results.push(item);
      }
    }

    return results;
  } catch (error) {
    console.error("Error searching files:", error);
    return [];
  } finally {
    db.close();
  }
}

// Check if IndexedDB has data
export async function hasIndexedDBData(): Promise<boolean> {
  try {
    const db = await openFileDB();

    const count = await db.count(STORE_NAME);
    db.close();
    return count > 0;
  } catch (error) {
    console.error("Error checking IndexedDB:", error);
    return false;
  }
}
