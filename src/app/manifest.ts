import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopManager",
    short_name: "ShopManager",
    description: "Smart shop management system with barcode scanning",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f0f11",
    theme_color: "#6366f1",
    orientation: "portrait",
    icons: [
      { src: "/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  }
}
