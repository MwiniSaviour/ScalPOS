"use client";

/**
 * Desktop local-first store.
 *
 * The app is usable from a cold start with no account and no network: shops,
 * products, clients, staff, appointments, packages and sales live here in
 * IndexedDB. When an account connects, the existing outbox in offline-fetch
 * mirrors writes to Supabase and realtime pulls remote changes back.
 */

const DB_NAME = "nova-desktop-local";
const DB_VERSION = 1;

export const STORES = [
  "settings", "products", "categories", "customers", "staff",
  "appointments", "packages", "orders", "sequences",
] as const;

export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!req.result.objectStoreNames.contains(name)) {
          req.result.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = fn(db.transaction(store, mode).objectStore(store));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function localAll<T>(store: StoreName): Promise<T[]> {
  const rows = await run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
  return rows ?? [];
}

export async function localGet<T extends { id: string }>(store: StoreName, id: string): Promise<T | null> {
  return (await run<T>(store, "readonly", (s) => s.get(id) as IDBRequest<T>)) ?? null;
}

export async function localPut<T extends { id: string }>(store: StoreName, row: T): Promise<T> {
  await run(store, "readwrite", (s) => s.put(row));
  return row;
}

export async function localDelete(store: StoreName, id: string): Promise<void> {
  await run(store, "readwrite", (s) => s.delete(id));
}

export function localAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Monotonic local order number, independent of any cloud settings row. */
export async function nextLocalOrderNo(): Promise<number> {
  const row = await localGet<{ id: string; value: number }>("sequences", "orderNo");
  const value = (row?.value ?? 0) + 1;
  await localPut("sequences", { id: "orderNo", value });
  return value;
}
