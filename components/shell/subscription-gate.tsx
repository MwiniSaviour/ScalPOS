"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useEntitlement } from "@/lib/entitlement";
import { SubscriptionLock } from "./subscription-lock";

/** Routes that must stay usable when the plan lapses: setup, auth, paying,
 * reconnecting, PIN recovery and data export. */
const EXEMPT = [
  "/auth",
  "/shop/create",
  "/onboarding",
  "/pin",
  "/connect",
  "/billing",
  "/paystack",
  "/accept-invite",
  "/backup",
  "/account",
];

function normalizePath(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ready = useEntitlement((s) => s.ready);
  const status = useEntitlement((s) => s.status);
  const syncLocal = useEntitlement((s) => s.syncLocal);
  const refresh = useEntitlement((s) => s.refresh);

  useEffect(() => {
    syncLocal();
    void refresh();
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => void refresh(true);
    const tick = window.setInterval(() => syncLocal(), 60_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncLocal, refresh, pathname]);

  const path = normalizePath(pathname);
  const exempt = EXEMPT.some((route) => path === route || path.startsWith(`${route}/`));
  if (exempt) return <>{children}</>;
  if (!ready) return null;
  if (status === "locked") return <SubscriptionLock />;
  return <>{children}</>;
}
