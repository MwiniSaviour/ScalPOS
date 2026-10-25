import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/appshell";
import { ClerkGate } from "@/components/shell/clerk-gate";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e17" },
  ],
};

/**
 * Applies the saved theme before the first paint so a light-theme shop never
 * sees a flash of the dark one. Reads a tiny mirror key (not the whole store)
 * and falls back to the device preference.
 */
const THEME_BOOTSTRAP = `(function(){try{
var t=localStorage.getItem("nova-pos-theme");
if(t!=="light"&&t!=="dark"){
t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
}
var r=document.documentElement;
r.dataset.theme=t;
r.style.colorScheme=t;
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkGate>
      <html lang="en" data-theme="dark" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        </head>
        <body>
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkGate>
  );
}
