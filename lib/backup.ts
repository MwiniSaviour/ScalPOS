"use client";

import { IMAGE_PREFIX, getImageBlob, isLocalImageRef, listImageRefs } from "./image-store";

/**
 * Backup / recovery.
 *
 * A backup is a single JSON document:
 *   { app: "nova-pos", schemaVersion: <copy of the store version>, createdAt,
 *     data: <the raw zustand persist blob, never rewritten>, images?: [...] }
 *
 * The persisted blob (`data`) is stored and restored verbatim — the store's
 * own rehydrate/migrations handle old versions, so schemaVersion is only ever
 * copied, never inferred or recomputed.
 */

/* localStorage keys (outside the store blob) */
export const STORE_KEY = "nova-pos-v1";
export const LAST_BACKUP_KEY = "nova-pos-last-backup";
export const GSI_CLIENT_KEY = "nova-pos-gsi-clientid";
export const DRIVE_TOKEN_KEY = "nova-pos-drive-token";
export const DRIVE_FILE_KEY = "nova-pos-drive-fileid";
export const BACKUP_FILENAME = "ScalPOS-backup.json";
/** pre-rebrand file name — still accepted on restore */
export const BACKUP_FILENAME_LEGACY = "NovaPOS-backup.json";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/* Google Identity Services token client (no server backend) */
const GSI_SRC = "https://accounts.google.com/gsi/client";

/* mirror of lib/image-store.ts module-private constants */
const IMG_DB_NAME = "nova-pos-images";
const IMG_DB_VERSION = 1;
const IMG_STORE = "images";

/* backups past ~10 MB skip photo export, with a clear warning */
const PHOTO_LIMIT_BYTES = 10 * 1024 * 1024;

export type PersistedPos = { state: Record<string, unknown>; version?: number };
export type BackupImage = { id: string; type: string; data: string };
export type BackupDoc = {
  app: "nova-pos";
  schemaVersion: number;
  createdAt: string;
  data: PersistedPos;
  images?: BackupImage[];
};
export type BackupPreview = {
  schemaVersion: number;
  createdAtMs: number;
  counts: { products: number; orders: number; customers: number; photos: number };
  imagesIncluded: boolean;
  data: PersistedPos;
  imagePayloads: BackupImage[];
};
export type ImageExport = { images: BackupImage[]; skipped: boolean; bytes: number };

/* ------------------------------ persisted blob ------------------------------ */

export function readPersisted(): PersistedPos | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedPos;
    if (!parsed || typeof parsed !== "object" || !parsed.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Version the app currently runs from its own persisted copy (0 = fresh). */
export function currentSchemaVersion(): number {
  const p = readPersisted();
  return typeof p?.version === "number" ? p.version : 0;
}

/* -------------------------------- image export ------------------------------ */

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    } catch {
      resolve(null);
    }
  });
}

/** Dump every photo in IndexedDB as base64 payloads; skips when the set is huge. */
export async function exportImages(): Promise<ImageExport> {
  const refs = await listImageRefs();
  const images: BackupImage[] = [];
  let bytes = 0;
  for (const ref of refs) {
    const blob = await getImageBlob(ref);
    if (!blob) continue;
    if (bytes + blob.size > PHOTO_LIMIT_BYTES) {
      return { images: [], skipped: true, bytes };
    }
    const data = await blobToDataUrl(blob);
    if (!data) continue;
    bytes += blob.size;
    images.push({ id: ref.slice(IMAGE_PREFIX.length), type: blob.type || "application/octet-stream", data });
  }
  return { images, skipped: false, bytes };
}

/** Unique "idb:" photo refs a store state actually points at. */
export function localImageRefs(state: unknown): string[] {
  const s = state as { products?: unknown[]; orders?: unknown[] } | null;
  const refs = new Set<string>();
  for (const p of Array.isArray(s?.products) ? s.products : []) {
    const url = (p as { imageUrl?: string })?.imageUrl;
    if (isLocalImageRef(url)) refs.add(url);
  }
  for (const o of Array.isArray(s?.orders) ? s.orders : []) {
    const items = (o as { items?: { imageUrl?: string }[] })?.items;
    for (const it of Array.isArray(items) ? items : []) {
      const url = (it as { imageUrl?: string })?.imageUrl;
      if (isLocalImageRef(url)) refs.add(url);
    }
  }
  return [...refs];
}

/* ----------------------------------- build ---------------------------------- */

export async function buildBackup(includePhotos = true): Promise<{ json: string; skipped: boolean }> {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
  if (!raw) throw new Error("There is nothing to back up on this device yet");
  let blob: PersistedPos;
  try {
    blob = JSON.parse(raw) as PersistedPos;
  } catch {
    throw new Error("This device's data could not be read");
  }
  if (!blob || typeof blob !== "object" || !blob.state) throw new Error("This device's data could not be read");

  const doc: BackupDoc = {
    app: "nova-pos",
    // a copy of the store's own version — never rewritten or inferred
    schemaVersion: typeof blob.version === "number" ? blob.version : 0,
    createdAt: new Date().toISOString(),
    data: blob,
  };

  let skipped = false;
  if (includePhotos) {
    const ex = await exportImages();
    if (ex.skipped) {
      skipped = true;
    } else if (ex.images.length > 0) {
      doc.images = ex.images;
    }
  }
  return { json: JSON.stringify(doc), skipped };
}

/* ----------------------------------- parse ---------------------------------- */

export function parseBackupText(text: string): BackupPreview {
  let doc: BackupDoc | null = null;
  try {
    doc = JSON.parse(text) as BackupDoc;
  } catch {
    /* handled below */
  }
  if (!doc || doc.app !== "nova-pos" || !doc.data || typeof doc.data !== "object" || !doc.data.state) {
    throw new Error("That file is not a ScalPOS backup");
  }
  const schemaVersion =
    typeof doc.schemaVersion === "number"
      ? doc.schemaVersion
      : typeof doc.data.version === "number"
        ? doc.data.version
        : -1;
  if (schemaVersion < 0) throw new Error("This backup is missing its schema version and cannot be applied");

  const imagePayloads = (Array.isArray(doc.images) ? doc.images : []).filter(
    (im): im is BackupImage => !!im && typeof im.id === "string" && im.id !== "" && typeof im.data === "string",
  );
  const created = Date.parse(doc.createdAt);
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

  return {
    schemaVersion,
    createdAtMs: Number.isFinite(created) ? created : 0,
    counts: {
      products: count(doc.data.state.products),
      orders: count(doc.data.state.orders),
      customers: count(doc.data.state.customers),
      photos: imagePayloads.length > 0 ? imagePayloads.length : localImageRefs(doc.data.state).length,
    },
    imagesIncluded: imagePayloads.length > 0,
    data: doc.data,
    imagePayloads,
  };
}

/* ---------------------------------- import --------------------------------- */

function openImageDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(IMG_DB_NAME, IMG_DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMG_STORE)) db.createObjectStore(IMG_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const head = dataUrl.slice(5, comma); // after "data:"
  const mime = head.includes(";") ? head.slice(0, head.indexOf(";")) : head;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime || "application/octet-stream" });
  } catch {
    return null;
  }
}

/** Import photos into IndexedDB keeping original ids — deduped by id. */
export async function importImages(images: BackupImage[]): Promise<number> {
  if (images.length === 0) return 0;
  const db = await openImageDb();
  if (!db) return 0;
  try {
    const existing = await new Promise<IDBValidKey[]>((resolve) => {
      try {
        const req = db.transaction(IMG_STORE, "readonly").objectStore(IMG_STORE).getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    const have = new Set(existing.map((k) => String(k)));
    const savedAt = Date.now();
    let n = 0;
    for (const img of images) {
      if (have.has(img.id)) continue;
      const blob = dataUrlToBlob(img.data);
      if (!blob) continue;
      await new Promise<void>((resolve) => {
        try {
          const req = db.transaction(IMG_STORE, "readwrite").objectStore(IMG_STORE).put({ id: img.id, blob, savedAt });
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      n++;
    }
    return n;
  } finally {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  }
}

/**
 * Full-data restore: photos first (ids preserved, deduped), then the store
 * blob, then a reload so rehydrate/migrations run fresh.
 */
export async function applyRestore(preview: BackupPreview): Promise<void> {
  if (preview.imagesIncluded) await importImages(preview.imagePayloads);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(preview.data));
  window.location.reload();
}

/* --------------------------------- markers --------------------------------- */

export function markBackupDone(): void {
  try {
    window.localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

export function lastBackupAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(window.localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

/* ------------------------------- Drive (GIS) -------------------------------- */

interface GsiTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (cfg: {
            client_id: string;
            callback: (r: GsiTokenResponse) => void;
            error_callback?: (e: { type: string }) => void;
            scope?: string;
          }) => TokenClient;
        };
      };
    };
  }
}

/** Thrown when the stored access token is declined — clear + re-prompt. */
export class DriveAuthError extends Error {
  constructor() {
    super("Google session ended — connect again");
    this.name = "DriveAuthError";
  }
}

export function clientId(): string {
  const builtin = builtinClientId();
  if (builtin) return builtin;
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(GSI_CLIENT_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * Web client id baked into the build via NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID.
 *
 * When set, shop owners never touch Google Cloud Console: tapping
 * "Back up to Google Drive" opens Google's own account chooser (pick an
 * email → allow) and the app handles everything else.
 *
 * Deployer setup (one-time, in Google Cloud Console):
 *   1. Create an OAuth client id, type "Web application".
 *   2. Authorised JavaScript origins: the Capacitor webview origin
 *      (https://localhost) plus the production site (https://pos.scalmint.com).
 *   3. Put the client id in .env.local as
 *      NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=<id>.apps.googleusercontent.com
 *   4. Publish the OAuth consent screen in "Production" (In testing shows a
 *      warning banner every 7 days for test users only).
 * When unset, the backend screen keeps the manual client-id entry flow.
 */
export function builtinClientId(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "").trim();
}

export function saveClientId(value: string): void {
  try {
    window.localStorage.setItem(GSI_CLIENT_KEY, value.trim());
  } catch {
    /* storage unavailable */
  }
}

export function getDriveToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (t.token && typeof t.expiresAt === "number" && Date.now() + 60_000 < t.expiresAt) return t.token;
    window.localStorage.removeItem(DRIVE_TOKEN_KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearDriveToken(): void {
  try {
    window.localStorage.removeItem(DRIVE_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

function setDriveToken(token: string, expiresInSeconds: number): void {
  try {
    window.localStorage.setItem(
      DRIVE_TOKEN_KEY,
      JSON.stringify({ token, expiresAt: Date.now() + expiresInSeconds * 1000 }),
    );
  } catch {
    /* storage unavailable */
  }
}

let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google sign-in needs the app"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error("Google sign-in could not load — check your connection"));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/** Ask GIS for an access token (implicit grant; no refresh handling by design). */
export async function connectDrive(): Promise<void> {
  const cid = clientId();
  if (!cid) throw new Error("Add a Google client ID first");
  await loadGsi();
  await new Promise<GsiTokenResponse>((resolve, reject) => {
    try {
      const client = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: cid,
        callback: (r) => resolve(r),
        error_callback: () => reject(new Error("Google sign-in was cancelled")),
        scope: DRIVE_SCOPE,
      });
      client?.requestAccessToken();
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Google sign-in failed"));
    }
  }).then((r) => {
    if (r.error) throw new Error("Google did not issue a token");
    if (!r.access_token || typeof r.expires_in !== "number") throw new Error("Google did not issue a token");
    setDriveToken(r.access_token, r.expires_in);
  });
}

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getDriveToken();
  if (!token) throw new DriveAuthError();
  const res = await fetch(url, {
    ...(init ?? {}),
    headers: {
      ...((init?.headers as Record<string, string>) ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    clearDriveToken();
    throw new DriveAuthError();
  }
  return res;
}

export async function findDriveBackup(): Promise<{ id: string; modifiedTime?: string } | null> {
  const q = encodeURIComponent(
    `(name = '${BACKUP_FILENAME}' or name = '${BACKUP_FILENAME_LEGACY}') and trashed = false`,
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&pageSize=10&orderBy=modifiedTime%20desc`,
  );
  if (!res.ok) throw new Error(`Could not list Drive backups (${res.status})`);
  const j = (await res.json()) as { files?: { id: string; modifiedTime?: string }[] };
  return j.files?.[0] ?? null;
}

function multipartBlob(meta: string, payload: string, boundary: string): Blob {
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`;
  const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${payload}\r\n--${boundary}--`;
  return new Blob([head, body], { type: `multipart/related; boundary=${boundary}` });
}

/** Create or update the single ScalPOS-backup.json in the user's Drive. */
export async function uploadDriveBackup(json: string): Promise<{ id: string; updated: boolean }> {
  const existing = await findDriveBackup();
  const boundary = `nova_pos_backup_${Date.now().toString(36)}`;
  const meta = JSON.stringify({ name: BACKUP_FILENAME, mimeType: "application/json" });
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  const res = await driveFetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipartBlob(meta, json, boundary),
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const j = (await res.json()) as { id: string };
  try {
    window.localStorage.setItem(DRIVE_FILE_KEY, j.id);
  } catch {
    /* storage unavailable */
  }
  return { id: j.id, updated: !!existing };
}

export async function downloadDriveBackup(fileId: string): Promise<string> {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.text();
}

/* ------------------------------- device file -------------------------------- */

/** Native: write into Documents and hand the file to the share sheet (iCloud/Files).
 *  Web: plain download link. */
export async function saveBackupFile(json: string): Promise<"shared" | "downloaded"> {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const write = await Filesystem.writeFile({
      path: BACKUP_FILENAME,
      data: json,
      directory: Directory.Documents,
    });
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: "ScalPOS backup", url: write.uri, dialogTitle: "Save your backup" });
    return "shared";
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = BACKUP_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
  return "downloaded";
}
