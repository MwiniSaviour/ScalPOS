"use client";

/**
 * Resolves a stored image reference to a renderable src.
 * - "idb:<uuid>" -> blob from IndexedDB -> object URL (cached, never revoked on unmount)
 * - "sb-product-images:<path>" -> storage bucket via the user session; the blob
 *   is also written into IndexedDB afterwards so later renders (and offline
 *   ones) resolve from the device store.
 * - everything else -> passed through unchanged
 */
import { useEffect, useState } from "react";
import { getImageBlob, saveImageBlob, isLocalImageRef, IMAGE_PREFIX } from "@/lib/image-store";
import {
  CLOUD_IMAGE_PREFIX,
  cloudImageHash,
  cloudImagePath,
  readImageMap,
  rememberCloudImage,
} from "@/lib/image-refs";
import { getSupabase } from "@/lib/api/supabase";
import { freshToken } from "@/lib/api/session";

const cache = new Map<string, string>();
const MAX_CACHE = 160;

function trimCache() {
  if (cache.size <= MAX_CACHE) return;
  const oldest = cache.keys().next().value;
  if (!oldest) return;
  const stale = cache.get(oldest);
  cache.delete(oldest);
  if (stale) URL.revokeObjectURL(stale);
}

export function useImageSrc(ref: string | undefined | null): string | null {
  const r = typeof ref === "string" ? ref : null;
  const preview = r ? (cache.get(r) ?? null) : null;
  const kind = r ? (r.startsWith(IMAGE_PREFIX) ? "local" : r.startsWith(CLOUD_IMAGE_PREFIX) ? "cloud" : "plain") : "plain";
  const [resolved, setResolved] = useState<{ ref: string; url: string } | null>(null);

  useEffect(() => {
    if (kind === "plain" || !r) return;
    if (cache.has(r)) return;
    let alive = true;
    if (kind === "local") {
      getImageBlob(r).then((blob) => {
        if (!alive || !blob) return;
        const url = URL.createObjectURL(blob);
        cache.set(r, url);
        trimCache();
        setResolved({ ref: r, url });
      });
    } else {
      void (async () => {
        const idbRef = readImageMap()[r];
        if (isLocalImageRef(idbRef)) {
          const blob = await getImageBlob(idbRef);
          if (blob) {
            const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
            const hex = [...new Uint8Array(digest).subarray(0, 8)]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            if (hex === cloudImageHash(r)) {
              const url = URL.createObjectURL(blob);
              cache.set(r, url);
              trimCache();
              if (!alive) {
                URL.revokeObjectURL(url);
                return;
              }
              setResolved({ ref: r, url });
              return;
            }
          }
        }
        const c = getSupabase((await freshToken()) ?? undefined);
        if (!c) return;
        const { data, error } = await c.storage.from("product-images").download(cloudImagePath(r));
        if (!alive) return;
        if (error || !data) return;
        const blob = data as Blob;
        const url = URL.createObjectURL(blob);
        cache.set(r, url);
        trimCache();
        setResolved({ ref: r, url });
        try {
          const idbRef = await saveImageBlob(blob);
          rememberCloudImage(r, idbRef);
        } catch {
          /* cache future renders are online instead */
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [r, kind, preview]);

  if (!r) return null;
  if (kind === "plain") return r;
  return resolved?.ref === r ? resolved.url : preview;
}
