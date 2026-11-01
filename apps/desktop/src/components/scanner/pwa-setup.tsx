"use client"

import { useEffect } from "react"

export function PWASetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        const unregisterPromises = regs.map((reg) => reg.unregister())
        return Promise.all(unregisterPromises)
      }).then(() => {
        return navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
      }).then((reg) => {
        reg.addEventListener("updatefound", () => {
          const installingWorker = reg.installing
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New PWA update available")
              }
            })
          }
        })
      }).catch((err) => console.error("SW registration failed:", err))
    }
  }, [])

  return null
}
