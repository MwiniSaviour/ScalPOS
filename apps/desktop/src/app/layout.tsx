import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import { AffiliateRefCapture } from "@/components/affiliate-ref-capture"
import { LegacyServiceWorkerCleanup } from "@/components/legacy-sw-cleanup"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ScalPOS",
  description: "Point of sale for Ghanaian shops",
  icons: {
    icon: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "ScalPOS",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
      </head>
      <body className="min-h-screen antialiased">
        <LegacyServiceWorkerCleanup />
        <AffiliateRefCapture />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
