"use client"

import { useSyncExternalStore } from "react"
import { hasPin, sessionUnlocked, subscribeLock } from "@/lib/pin"
import { hasLocalShop } from "@/lib/offline/local-data"
import PinScreen from "./pin-screen"

/** Local-first gate: PIN blocks the desktop before any cloud auth is consulted. */
export default function PinGate({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(subscribeLock, sessionUnlocked, () => false)
  const locked = hasLocalShop() && hasPin() && !unlocked
  if (locked) return <PinScreen />
  return <>{children}</>
}
