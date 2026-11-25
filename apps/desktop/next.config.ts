import type { NextConfig } from "next"
import path from "node:path"

const offlineDesktop = process.env.NEXT_PUBLIC_OFFLINE_DESKTOP === "1"

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_OFFLINE_DESKTOP: offlineDesktop ? "1" : "0" },
  outputFileTracingRoot: __dirname.replace(/[\\/]apps[\\/]desktop$/, ""),
  webpack(config) {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@pos": path.resolve(__dirname, "../../lib"),
    }
    config.resolve.modules = [
      ...(config.resolve.modules ?? []),
      path.resolve(__dirname, "node_modules"),
    ]
    return config
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // The Capacitor POS build ships a `/billing` screen, so this URL is
      // already known to customers and crawlers. The web app keeps the same
      // page under /dashboard/billing — send it there instead of 404ing.
      // 307 (not 308) so the browser does not cache it permanently.
      { source: "/billing", destination: "/dashboard/billing", permanent: false },
    ]
  },
}

export default nextConfig
