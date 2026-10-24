"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isContentLocked, sessionUnlocked } from "@/lib/pin";

/**
 * Global content gate. After a shop has been created (`hasOnboarded`) and a
 * PIN is set, every content route requires the user to have unlocked the
 * current tab. Setup / auth routes are exempt.
 */
const EXEMPT = ["/auth", "/auth/code", "/shop/create", "/onboarding", "/pin"];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const normalized = normalize(pathname);
    // Never gate the setup / auth flows themselves.
    if (EXEMPT.some((route) => normalized.startsWith(route))) return;
    if (isContentLocked() && !sessionUnlocked()) {
      router.replace("/pin");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
