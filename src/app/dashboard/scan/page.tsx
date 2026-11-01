"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Scan, PackagePlus, ShoppingCart, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCAN_MODES } from "@/lib/constants"

export default function ScanPage() {
  const pathname = usePathname()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barcode Scanner</h1>
        <p className="mt-1 text-sm text-muted">Choose a scanning mode</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/scan/receive"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <PackagePlus size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Receive Stock</h2>
            <p className="mt-1 text-sm text-muted">
              Scan products to add inventory stock
            </p>
          </div>
          <ArrowRight size={20} className="text-muted" />
        </Link>

        <Link
          href="/dashboard/pos"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <ShoppingCart size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">POS Scan</h2>
            <p className="mt-1 text-sm text-muted">
              Scan products to add to sale cart
            </p>
          </div>
          <ArrowRight size={20} className="text-muted" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Scan size={24} className="text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Quick Tips</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>• Point the camera at the barcode and hold steady</li>
              <li>• Ensure good lighting for best results</li>
              <li>• You can also type the barcode number manually</li>
              <li>• Bluetooth scanners work automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
