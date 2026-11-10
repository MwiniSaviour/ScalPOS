"use client"

import { useEffect } from "react"

const RELOAD_KEY = "scalpos-sw-cleanup-v1"

export function LegacyServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    let cancelled = false

    navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        if (!registrations.length || cancelled) return
        await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)))
        if (typeof caches !== "undefined") {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
        if (cancelled) return
        let canReload = false
        try {
          canReload = sessionStorage.getItem(RELOAD_KEY) !== "1"
          sessionStorage.setItem(RELOAD_KEY, "1")
        } catch {
          canReload = false
        }
        if (canReload) window.location.reload()
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
