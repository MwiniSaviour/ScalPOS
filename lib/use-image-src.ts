"use client";

import { useEffect, useState } from "react";
import { getImageBlob, isLocalImageRef } from "@/lib/image-store";

/**
 * Resolves a stored image reference to a renderable src.
 * - "idb:<uuid>" -> blob from IndexedDB -> object URL (cached, never revoked on unmount)
 * - everything else -> passed through unchanged
 */
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
  const local = isLocalImageRef(ref);
  const [resolved, setResolved] = useState<{ ref: string; url: string } | null>(null);

  useEffect(() => {
    if (!local || !ref) return;
    if (cache.has(ref)) return;
    let alive = true;
    getImageBlob(ref).then((blob) => {
      if (!alive || !blob) return;
      const url = URL.createObjectURL(blob);
      cache.set(ref, url);
      trimCache();
      setResolved({ ref, url });
    });
    return () => {
      alive = false;
    };
  }, [ref, local]);

  if (!ref) return null;
  if (!local) return ref;
  if (resolved?.ref === ref) return resolved.url;
  return cache.get(ref) ?? null;
}
