"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { hasPin, sessionUnlocked, subscribeLock } from "@/lib/pin";
import PinScreen from "@/components/pin-screen";

/**
 * Global content gate. After a shop has been created (`hasOnboarded`) and a
 * PIN is set, every content route requires the user to have unlocked the
 * current app session. Setup / auth routes are exempt.
 *
 * The lock renders in place (synchronously) instead of redirecting from an
 * effect: content is never visible before the gate runs, and the PIN still
 * appears when client-side navigation/hydration is slow.
 */
const EXEMPT = ["/auth", "/auth/code", "/auth/callback", "/shop/create", "/onboarding", "/pin"];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const unlocked = useSyncExternalStore(subscribeLock, sessionUnlocked, () => false);
  const normalized = normalize(pathname);
  const exempt = EXEMPT.some((route) => normalized.startsWith(route));
  const locked = !exempt && hasPin() && !unlocked;

  if (locked) return <PinScreen inline />;
  return <>{children}</>;
}
