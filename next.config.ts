import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor ships static files — export the app as a pure SPA bundle
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
