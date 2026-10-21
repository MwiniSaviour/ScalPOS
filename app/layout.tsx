import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/appshell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova POS — Bright Corner Stores",
  description: "Offline-first point of sale for Ghanaian retail",
  applicationName: "Nova POS",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0e17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
