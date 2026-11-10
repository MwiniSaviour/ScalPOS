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

const MAX_EDGE = 1024
const MAX_INPUT_BYTES = 15 * 1024 * 1024

function extOf(blob: Blob): string {
  const t = blob.type || "image/jpeg"
  if (t.includes("png")) return "png"
  if (t.includes("webp")) return "webp"
  if (t.includes("gif")) return "gif"
  return "jpg"
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality)
    } catch {
      resolve(null)
    }
  })
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read that photo"))
    }
    img.src = url
  })
}

/** Dimensions only; keeps decode cost off the main canvas. */
function imageSize(file: Blob): Promise<{ w: number; h: number }> {
  return loadImage(file).then((img) => ({
    w: img.naturalWidth || 1,
    h: img.naturalHeight || 1,
  }))
}

/**
 * Re-encode every upload as a small WebP (JPEG fallback) so cloud rows stay
 * light. Decoding is resized in one pass where the browser supports it, and
 * EXIF rotation is applied so phone photos arrive upright.
 */
async function normalizeImage(file: Blob): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large (max 15 MB)")
  const { w, h } = await imageSize(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))

  let bitmap: ImageBitmap | null = null
  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
        resizeWidth: tw,
        resizeHeight: th,
        resizeQuality: "high",
      } as ImageBitmapOptions)
    } catch {
      bitmap = null
    }
  }

  const canvas = document.createElement("canvas")
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  const source: CanvasImageSource = bitmap ?? (await loadImage(file))
  ctx.drawImage(source, 0, 0, tw, th)
  bitmap?.close?.()

  let out = await canvasToBlob(canvas, "image/webp", 0.82)
  if (!out || out.type !== "image/webp") {
    out = await canvasToBlob(canvas, "image/jpeg", 0.85)
  }
  return out ?? file
}

/**
 * Upload a product photo straight to the private "product-images" bucket and
 * return the "sb-product-images:<path>" ref the resolver understands. Uses a
 * random key instead of a content hash — crypto.subtle is unavailable on the
 * insecure LAN origin this app is served from.
 */
export async function uploadProductImage(file: File, org: string): Promise<string> {
  return uploadImage(file, org, "products")
}

export async function uploadStaffImage(file: File, org: string): Promise<string> {
  return uploadImage(file, org, "staff")
}

async function uploadImage(file: File, org: string, folder: "products" | "staff"): Promise<string> {
  const blob = await normalizeImage(file)
  const c = getSupabase()
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${org}/${folder}/desktop/${key}.${extOf(blob)}`
  const { error } = await c.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return CLOUD_IMAGE_PREFIX + path
}
