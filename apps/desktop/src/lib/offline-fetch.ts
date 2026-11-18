"use client";

/**
 * Offline mirror for the desktop data layer.
 *
 * Every Supabase request already funnels through one `global.fetch` hook, so
 * that hook is the right place to cache reads and queue writes — no page or
 * data function has to change. Cached responses are served when the network
 * is down; writes are replayed in order once it returns.
 */

const DB_NAME = "nova-desktop-offline";
const DB_VERSION = 1;
const CACHE = "responses";
const OUTBOX = "outbox";

export type QueuedWrite = {
  id?: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  at: number;
};

function database(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(OUTBOX)) {
        db.createObjectStore(OUTBOX, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return database().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const request = fn(db.transaction(store, mode).objectStore(store));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** True when the browser reports no connection — used for local read-back. */
export function offlineMode(): boolean {
  return !isOnline();
}

function requestKey(method: string, url: string): string {
  return `${method}:${url}`;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

async function cachedResponse(key: string): Promise<Response | null> {
  const row = await tx<{ key: string; body: string; status: number; contentType: string }>(
    CACHE, "readonly", (s) => s.get(key) as IDBRequest<{ key: string; body: string; status: number; contentType: string }>,
  );
  if (!row) return null;
  return new Response(row.body, {
    status: row.status,
    headers: { "content-type": row.contentType || "application/json" },
  });
}

async function remember(key: string, response: Response): Promise<void> {
  if (!response.ok || response.status === 204) return;
  const body = await response.clone().text().catch(() => "");
  await tx(CACHE, "readwrite", (s) =>
    s.put({
      key,
      body,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "application/json",
      at: Date.now(),
    }),
  );
}

/**
 * The fetch hook used by the Supabase client. Reads fall back to the last
 * cached response; writes made offline are queued and acknowledged locally.
 */
export async function offlineFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = methodOf(input, init);
  const url = urlOf(input);
  const key = requestKey(method, url);

  if (method === "GET" || method === "HEAD") {
    try {
      const response = await fetch(input, init);
      if (response.ok) void remember(key, response);
      return response;
    } catch (error) {
      if (isOnline()) throw error;
      const cached = await cachedResponse(key);
      if (cached) return cached;
      throw error;
    }
  }

  if (!isOnline()) {
    const headers: Record<string, string> = {};
    new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined)).forEach((v, k) => {
      headers[k] = v;
    });
    await tx(OUTBOX, "readwrite", (s) =>
      s.add({ method, url, headers, body: init.body as string | undefined, at: Date.now() }),
    );
    return new Response(JSON.stringify({}), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  return fetch(input, init);
}

/** Replay queued writes in order; failures keep the queue intact for next time. */
export async function replayQueued(): Promise<number> {
  const rows = await tx<QueuedWrite[]>(OUTBOX, "readonly", (s) => s.getAll() as IDBRequest<QueuedWrite[]>);
  if (!rows || rows.length === 0) return 0;
  let sent = 0;
  for (const row of rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    try {
      const res = await fetch(row.url, {
        method: row.method,
        headers: row.headers,
        ...(row.body ? { body: row.body } : {}),
      });
      if (!res.ok) break;
      await tx(OUTBOX, "readwrite", (s) => s.delete(row.id!));
      sent++;
    } catch {
      break;
    }
  }
  return sent;
}

export async function pendingWrites(): Promise<number> {
  const rows = await tx<QueuedWrite[]>(OUTBOX, "readonly", (s) => s.getAll() as IDBRequest<QueuedWrite[]>);
  return rows?.length ?? 0;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void replayQueued();
  });
}
