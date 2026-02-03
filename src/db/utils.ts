import { DB_NAME, STORE_NAME, DB_VERSION } from "../constants";
import { openDB } from "idb";

interface FileRecord {
  id: string;
  path: string;
  directory?: string;
  parent_id?: string | null;
  [key: string]: unknown;
}

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
    },
  });
}

export async function batchInsert(items: unknown[], batchSize = 1000) {
  const db = await openFileDB();

  let index = 0;

  while (index < items.length) {
    const batch = items.slice(index, index + batchSize);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const item of batch) {
        // const { id, ...rest } = item;
        store.put(item);
      }

      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    index += batchSize;
  }

  db.close();
}

export async function insertFiles(items: FileRecord[]) {
  const db = await openFileDB();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.put(item);
    }
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
