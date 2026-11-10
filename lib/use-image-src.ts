"use client";

/**
 * Resolves a stored image reference to a renderable src.
 * - "idb:<uuid>" -> blob from IndexedDB -> object URL (cached, never revoked on unmount)
 * - "sb-product-images:<path>" -> local cache first, then the private storage
 *   bucket via the user session; downloads are also cached in IndexedDB.
 * - everything else -> passed through unchanged
 */
import { useEffect, useState } from "react";
import { getImageBlob, IMAGE_PREFIX } from "@/lib/image-store";
import { isCloudImageRef } from "@/lib/image-refs";
import { downloadCloudImage, locallyCachedImage, rememberDownloadedImage } from "@/lib/cloud-images";

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
  const kind = r ? (r.startsWith(IMAGE_PREFIX) ? "local" : isCloudImageRef(r) ? "cloud" : "plain") : "plain";
  const [resolved, setResolved] = useState<{ ref: string; url: string } | null>(null);

  useEffect(() => {
    if (kind === "plain" || !r) return;
    if (cache.has(r)) return;
    let alive = true;

    const show = (blob: Blob) => {
      if (!alive) return;
      const url = URL.createObjectURL(blob);
      cache.set(r, url);
      trimCache();
      setResolved({ ref: r, url });
    };

    const attempt = async () => {
      if (kind === "local") {
        const blob = await getImageBlob(r);
        if (blob) show(blob);
        return;
      }
      const cached = await locallyCachedImage(r);
      if (cached) {
        show(cached);
        return;
      }
      const blob = await downloadCloudImage(r);
      if (!blob) return;
      show(blob);
      rememberDownloadedImage(r, blob);
    };

    void attempt();

    const onOnline = () => {
      if (!cache.has(r)) void attempt();
    };
    window.addEventListener("online", onOnline);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
    };
  }, [r, kind, preview]);

  if (!r) return null;
  if (kind === "plain") return r;
  return resolved?.ref === r ? resolved.url : preview;
}
