import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
