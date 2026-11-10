"use client"

import { useEffect } from "react"
import { captureAffiliateRefFromUrl } from "@/lib/affiliate"

export function AffiliateRefCapture() {
  useEffect(() => {
    captureAffiliateRefFromUrl(window.location.href)
  }, [])

  return null
}
