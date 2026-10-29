import type { Op, Conflict } from "./types";

const DB_NAME = "nova-pos-outbox-v1";
const DB_VERSION = 1;
const STORE = "ops";

const DEPS: Record<string, string[]> = {
  orgs: [],
  memberships: ["orgs"],
  categories: [],
  products: ["categories"],
  customers: [],
  orders: ["customers"],
  order_items: ["orders", "products"],
  stock_moves: ["products", "orders"],
  settings: [],
  staff: [],
};

function computeRanks(): Record<string, number> {
  const rank: Record<string, number> = {};
  const visiting = new Set<string>();
  function visit(t: string): number {
    if (Object.prototype.hasOwnProperty.call(rank, t)) return rank[t];
    if (visiting.has(t)) return 0;
    visiting.add(t);
    const deps = DEPS[t] ?? [];
    const r = deps.length ? Math.max(...deps.map(visit)) + 1 : 0;
    visiting.delete(t);
    rank[t] = r;
    return r;
  }
  for (const t of Object.keys(DEPS)) visit(t);
  return rank;
}

const RANKS = computeRanks();

function sortOps(ops: Op[]): Op[] {
  return [...ops].sort((a, b) => {
    const ra = RANKS[a.table] ?? 500;
    const rb = RANKS[b.table] ?? 500;
    if (ra !== rb) return ra - rb;
    return (a.created_at ?? 0) - (b.created_at ?? 0);
  });
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "op_id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    let request: IDBRequest<T>;
    try {
      const transaction = db.transaction(STORE, mode);
      request = fn(transaction.objectStore(STORE));
    } catch {
      resolve(null);
      return;
    }
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function enqueue(op: Op): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(op);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function peek(): Promise<Op[]> {
  const result = await runTx<Op[]>("readonly", (store) => store.getAll() as IDBRequest<Op[]>);
  return Array.isArray(result) ? result : [];
}

export async function clear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function remove(opId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(opId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function defaultApply(op: Op): Promise<void> {
  const engine = await import("./engine");
  const rowId = (op.row as { id?: string } | undefined)?.id ?? op.id ?? "";
  if (op.kind === "delete") {
    await engine.softDeleteRemote(op.table as Parameters<typeof engine.softDeleteRemote>[0], rowId);
    return;
  }
  await engine.pushLocalRow(op.table as Parameters<typeof engine.pushLocalRow>[0], rowId);
}

export async function drain(
  apply?: (op: Op) => Promise<void>,
): Promise<{ applied: number; failed: Op[] }> {
  const ops = await peek();
  const sorted = sortOps(ops);
  const applier = apply ?? defaultApply;
  let applied = 0;
  const failed: Op[] = [];
  for (const op of sorted) {
    try {
      await applier(op);
      await remove(op.op_id);
      applied++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Nothing exists to push any more — retire the op instead of letting it
      // fail ten times and surface as a sync error.
      if (msg === "row deleted locally" || msg === "order deleted locally") {
        await remove(op.op_id);
        applied++;
        continue;
      }
      const attempts = (op.attempts ?? 0) + 1;
      if (attempts >= 10) {
        await remove(op.op_id);
        failed.push({ ...op, attempts, last_error: msg });
        continue;
      }
      const updated: Op = {
        ...op,
        attempts,
        last_error: msg,
      };
      await enqueue(updated);
      failed.push(updated);
    }
  }
  return { applied, failed };
}

const CONFLICT_DB = "nova-pos-conflicts-v1";
const CONFLICT_STORE = "conflicts";

function openConflictDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(CONFLICT_DB, 1);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        db.createObjectStore(CONFLICT_STORE, { keyPath: ["table", "id"] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

export async function listConflicts(): Promise<Conflict[]> {
  const db = await openConflictDb();
  if (!db) return [];
  return new Promise<Conflict[]>((resolve) => {
    try {
      const tx = db.transaction(CONFLICT_STORE, "readonly");
      const req = tx.objectStore(CONFLICT_STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as Conflict[]) : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function addConflict(conflict: Conflict): Promise<void> {
  const db = await openConflictDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(CONFLICT_STORE, "readwrite");
      tx.objectStore(CONFLICT_STORE).put(conflict);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function removeConflict(table: string, id: string): Promise<void> {
  const db = await openConflictDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(CONFLICT_STORE, "readwrite");
      tx.objectStore(CONFLICT_STORE).delete([table, id]);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
