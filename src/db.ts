import { openDB, DBSchema } from 'idb';

export type DBItem = {
  id: string;
  title: string;
  description?: string;
  category: string;
  imageBlob: Blob;
};

export type DBOutfit = {
  headwear: string[];
  eyewear: string[];
  top: string[];
  bottom: string[];
  footwear: string[];
  leftArm: string[];
  rightArm: string[];
  accessories: string[];
};

export type DBSavedFit = {
  id: string;
  name: string;
  outfit: DBOutfit;
  order?: number;
};

interface WardrobeDB extends DBSchema {
  items: {
    key: string;
    value: DBItem;
  };
  fits: {
    key: string;
    value: DBSavedFit;
  };
}

const DB_NAME = 'wardrobe_db';
const DB_VERSION = 1;

export async function initDB() {
  return openDB<WardrobeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fits')) {
        db.createObjectStore('fits', { keyPath: 'id' });
      }
    },
  });
}

export async function getItems(): Promise<DBItem[]> {
  const db = await initDB();
  return db.getAll('items');
}

export async function addItem(item: DBItem): Promise<void> {
  const db = await initDB();
  await db.put('items', item);
}

export async function deleteItem(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('items', id);
}

export async function getFits(): Promise<DBSavedFit[]> {
  const db = await initDB();
  return db.getAll('fits');
}

export async function addFit(fit: DBSavedFit): Promise<void> {
  const db = await initDB();
  await db.put('fits', fit);
}

export async function deleteFit(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('fits', id);
}
