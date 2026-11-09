import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScalPOS",
    short_name: "ScalPOS",
    description: "Point of sale for Ghanaian shops",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f0f11",
    theme_color: "#047857",
    orientation: "landscape",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
