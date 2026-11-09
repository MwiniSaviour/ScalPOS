"use client"

/**
 * Resolves a stored image reference to a renderable src on the desktop client.
 * - "sb-product-images:<path>" -> private storage bucket via the user session,
 *   downloaded to an object URL (cached, never revoked on unmount)
 * - everything else (https://, data:, plain paths) is passed through unchanged,
 *   "idb:" refs are local-device-only and resolve to null here.
 */
import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase/client"

const CLOUD_IMAGE_PREFIX = "sb-product-images:"
const BUCKET = "product-images"

const cache = new Map<string, string>()
const MAX_CACHE = 160

function trimCache() {
  if (cache.size <= MAX_CACHE) return
  const oldest = cache.keys().next().value
  if (!oldest) return
  const stale = cache.get(oldest)
  cache.delete(oldest)
  if (stale) URL.revokeObjectURL(stale)
}

export function useImageSrc(ref: string | null | undefined): string | null {
  const isCloud = ref?.startsWith(CLOUD_IMAGE_PREFIX) ?? false
  const preview = ref ? cache.get(ref) ?? null : null
  const [resolved, setResolved] = useState<{ ref: string; url: string } | null>(null)

  useEffect(() => {
    if (!ref || !isCloud) return
    if (cache.has(ref)) return
    let alive = true
    void (async () => {
      try {
        const c = getSupabase()
        const { data, error } = await c.storage.from(BUCKET).download(ref.slice(CLOUD_IMAGE_PREFIX.length))
        if (!alive) return
        if (error || !data) return
        const url = URL.createObjectURL(data as Blob)
        cache.set(ref, url)
        trimCache()
        setResolved({ ref, url })
      } catch {
        /* leave the fallback art in place */
      }
    })()
    return () => {
      alive = false
    }
  }, [ref, isCloud, preview])

  if (!ref) return null
  return resolved?.ref === ref ? resolved.url : preview
}

const MAX_PIXELS = 1600 * 1600

function extOf(blob: Blob): string {
  const t = blob.type || "image/jpeg"
  if (t.includes("png")) return "png"
  if (t.includes("webp")) return "webp"
  if (t.includes("gif")) return "gif"
  return "jpg"
}

/** Downscale large photos to keep uploads small; returns a JPEG blob at best. */
async function normalizeImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (bmp.width * bmp.height)))
    if (scale >= 1 && file.size < 1_500_000) return file
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82))
    return out ?? file
  } catch {
    return file
  }
}

/**
 * Upload a product photo straight to the private "product-images" bucket and
 * return the "sb-product-images:<path>" ref the resolver understands. Uses a
 * random key instead of a content hash — crypto.subtle is unavailable on the
 * insecure LAN origin this app is served from.
 */
export async function uploadProductImage(file: File, org: string): Promise<string> {
  const blob = await normalizeImage(file)
  const c = getSupabase()
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${org}/products/desktop/${key}.${extOf(blob)}`
  const { error } = await c.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return CLOUD_IMAGE_PREFIX + path
}
