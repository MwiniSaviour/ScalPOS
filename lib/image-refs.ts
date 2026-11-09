"use client";

/**
 * Shared helpers for product-image references.
 *
 * Local uploads live in IndexedDB ("idb:<uuid>" refs). The cloud sync layer
 * publishes the blob bytes to the private "product-images" storage bucket and
 * stores cloud refs as "sb-product-images:<org>/<folder>/<key>/<hash>.<ext>"
 * in `image_path`. The hash in the path lets a resolver verify whether a
 * locally cached copy is still the same bytes before preferring it.
 */

export const CLOUD_IMAGE_PREFIX = "sb-product-images:";
export const PRODUCT_IMAGES_BUCKET = "product-images";
export const IMG_MAP_KEY = "nova-pos-image-map-v1";

export function isCloudImageRef(ref: string | undefined | null): ref is string {
  return typeof ref === "string" && ref.startsWith(CLOUD_IMAGE_PREFIX);
}

export function cloudImagePath(ref: string): string {
  return ref.slice(CLOUD_IMAGE_PREFIX.length);
}

export function cloudImageHash(ref: string): string {
  const file = cloudImagePath(ref).split("/").pop() ?? "";
  return file.split(".")[0] ?? "";
}

export function readImageMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(IMG_MAP_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeImageMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IMG_MAP_KEY, JSON.stringify(map));
}

export function rememberCloudImage(cloudRef: string, idbRef: string) {
  const map = readImageMap();
  if (map[cloudRef] === idbRef) return;
  map[cloudRef] = idbRef;
  writeImageMap(map);
}
