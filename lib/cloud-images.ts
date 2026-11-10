"use client";

/**
 * Cross-device image cache.
 *
 * Shared rows store portable refs ("sb-product-images:<bucket path>").
 * Downloads need a live Clerk token, which may not exist yet when a screen
 * first paints — so this waits for the token, retries once, and writes every
 * downloaded blob into IndexedDB so later renders work offline.
 */

import { getSupabase } from "@/lib/api/supabase";
import { freshToken, onTokenReady } from "@/lib/api/session";
import { getImageBlob, isLocalImageRef, saveImageBlob } from "@/lib/image-store";
import {
  cloudImageHash,
  cloudImagePath,
  isCloudImageRef,
  readImageMap,
  rememberCloudImage,
} from "@/lib/image-refs";

const BUCKET = "product-images";
const inflight = new Map<string, Promise<Blob | null>>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function waitForToken(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    let off = () => {};
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      off();
      resolve(token);
    };
    void freshToken().then((token) => {
      if (token) finish(token);
    });
    off = onTokenReady((token) => finish(token));
    setTimeout(() => finish(null), 10_000);
  });
}

async function fetchCloudBlob(ref: string): Promise<Blob | null> {
  const existing = inflight.get(ref);
  if (existing) return existing;
  const run = (async () => {
    const token = await waitForToken();
    if (!token) return null;
    try {
      const c = getSupabase(token);
      if (!c) return null;
      const { data, error } = await c.storage.from(BUCKET).download(cloudImagePath(ref));
      if (error || !data) return null;
      return data as Blob;
    } catch {
      return null;
    }
  })();
  inflight.set(ref, run);
  try {
    return await run;
  } finally {
    inflight.delete(ref);
  }
}

export async function downloadCloudImage(
  ref: string | null | undefined,
): Promise<Blob | null> {
  if (!isCloudImageRef(ref)) return null;
  const first = await fetchCloudBlob(ref);
  if (first) return first;
  await sleep(1500);
  return fetchCloudBlob(ref);
}

/**
 * Local copy behind a cloud ref, if the bytes still match the ref's content
 * hash. Desktop upload paths use random keys, so they are trusted as-is.
 */
export async function locallyCachedImage(
  ref: string | null | undefined,
): Promise<Blob | null> {
  if (!isCloudImageRef(ref)) return null;
  const idbRef = readImageMap()[ref];
  if (!isLocalImageRef(idbRef)) return null;
  const blob = await getImageBlob(idbRef);
  if (!blob) return null;
  const expected = cloudImageHash(ref);
  if (!/^[0-9a-f]{16}$/.test(expected)) return blob;
  try {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const hex = [...new Uint8Array(digest).subarray(0, 8)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === expected ? blob : null;
  } catch {
    return null;
  }
}

export function rememberDownloadedImage(ref: string, blob: Blob) {
  void saveImageBlob(blob)
    .then((idbRef) => rememberCloudImage(ref, idbRef))
    .catch(() => {
      /* storage unavailable — re-download on the next view */
    });
}

export async function cacheCloudImage(ref: string | null | undefined): Promise<void> {
  if (!isCloudImageRef(ref)) return;
  if (await locallyCachedImage(ref)) return;
  const blob = await downloadCloudImage(ref);
  if (!blob) return;
  try {
    rememberCloudImage(ref, await saveImageBlob(blob));
  } catch {
    /* storage unavailable — re-download on the next view */
  }
}

export async function warmCloudImages(
  refs: Iterable<string | null | undefined>,
  concurrency = 3,
): Promise<void> {
  const queue = [...new Set([...refs].filter(isCloudImageRef))];
  if (queue.length === 0) return;
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (index < queue.length) {
      const ref = queue[index++];
      await cacheCloudImage(ref);
    }
  });
  await Promise.all(workers);
}
