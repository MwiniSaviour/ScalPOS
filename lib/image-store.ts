"use client";

/**
 * Product image storage.
 *
 * Uploaded photos live in IndexedDB (disk-backed, survives restarts, offline).
 * Product.imageUrl stores a short reference: "idb:<uuid>".
 * Everything else ("/products/x.jpg", https://…, data:…) is passed through untouched.
 */

const DB_NAME = "nova-pos-images";
const DB_VERSION = 1;
const STORE = "images";
export const IMAGE_PREFIX = "idb:";

export function isLocalImageRef(ref: string | undefined | null): ref is string {
  return typeof ref === "string" && ref.startsWith(IMAGE_PREFIX);
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        let request: IDBRequest<T>;
        try {
          const transaction = db.transaction(STORE, mode);
          request = run(transaction.objectStore(STORE));
        } catch {
          return resolve(null);
        }
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      }),
  );
}

/** Store a blob and return its reference ("idb:<uuid>"). */
export async function saveImageBlob(blob: Blob): Promise<string> {
  const id = uuid();
  const ok = await tx("readwrite", (store) => store.put({ id, blob, savedAt: Date.now() }));
  if (!ok) throw new Error("Could not store the photo on this device");
  return IMAGE_PREFIX + id;
}

export async function getImageBlob(ref: string): Promise<Blob | null> {
  if (!isLocalImageRef(ref)) return null;
  const id = ref.slice(IMAGE_PREFIX.length);
  const row = await tx<{ id: string; blob: Blob } | undefined>("readonly", (store) => store.get(id));
  return row?.blob ?? null;
}

export async function deleteImageBlob(ref: string): Promise<void> {
  if (!isLocalImageRef(ref)) return;
  const id = ref.slice(IMAGE_PREFIX.length);
  await tx("readwrite", (store) => store.delete(id));
}

export async function listImageRefs(): Promise<string[]> {
  const rows = await tx<{ id: string }[]>("readonly", (store) => store.getAll());
  return (rows ?? []).map((r) => IMAGE_PREFIX + r.id);
}

/** Wipe every stored photo (used by "Load demo store"). */
export async function clearAllImages(): Promise<void> {
  await tx("readwrite", (store) => store.clear());
  if (dbPromise) {
    const db = await dbPromise;
    dbPromise = null;
    try {
      db?.close();
    } catch {
      /* already closed */
    }
  }
}

/**
 * Delete photos no longer referenced by any product or order line.
 * Orders snapshot the image reference, so a photo must survive product deletion.
 */
export async function pruneImages(referenced: string[]): Promise<void> {
  const keep = new Set(referenced.filter(isLocalImageRef).map((r) => r.slice(IMAGE_PREFIX.length)));
  const ids = await tx<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  if (!ids) return;
  const stale = (ids as IDBValidKey[]).map((k) => String(k)).filter((id) => !keep.has(id));
  for (const id of stale) {
    await tx("readwrite", (store) => store.delete(id));
  }
}

const MAX_EDGE = 512;
const MAX_BYTES = 4 * 1024 * 1024;

function readImageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 1, h: 1 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Downscale + re-encode a picked photo so it stays small enough to keep offline.
 * Decoding is resized (createImageBitmap resizeWidth/resizeHeight) so a 20MP
 * camera photo never materialises at full resolution.
 */
export async function processImageFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image");
  if (file.size > MAX_BYTES) throw new Error("That photo is too large (max 4 MB)");

  const { w, h } = await readImageSize(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeWidth: tw,
      resizeHeight: th,
      resizeQuality: "high",
    } as ImageBitmapOptions);
  } catch {
    bitmap = null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This device cannot process the photo");
  ctx.drawImage(bitmap ?? (await loadImageElement(file)), 0, 0, tw, th);
  bitmap?.close?.();

  // WebP when the encoder supports it, JPEG otherwise (a PNG fallback would be huge).
  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  }
  if (!blob) throw new Error("Could not process that photo");
  return blob;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo"));
    };
    img.src = url;
  });
}
