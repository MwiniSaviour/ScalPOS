"use client"

import { useSyncExternalStore } from "react"
import { hasPin, sessionUnlocked, subscribeLock } from "@/lib/pin"
import { desktopCanBootLocally } from "@/lib/auth/offline-gate"
import PinScreen from "./pin-screen"

/** Local-first gate: PIN blocks the desktop before any cloud auth is consulted. */
export default function PinGate({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(subscribeLock, sessionUnlocked, () => false)
  const locked = desktopCanBootLocally() && hasPin() && !unlocked
  if (locked) return <PinScreen />
  return <>{children}</>
}
