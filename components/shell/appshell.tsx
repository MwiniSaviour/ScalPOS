"use client";

import { usePathname } from "next/navigation";
import { TabBar, willHaveTabBar } from "./tabbar";
import { SyncStatus } from "@/components/ui/syncstatus";
import { Toaster } from "@/components/ui/toaster";
import { usePos } from "@/lib/store";
import { Capacitor } from "@capacitor/core";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/ui";
import { initDeepLinking } from "@/lib/deep-link";
import { PinGate } from "@/components/pin-gate";
import { SubscriptionGate } from "./subscription-gate";
import { appChrome } from "@/lib/appchrome";
import { hasPin, sessionUnlocked, subscribeLock } from "@/lib/pin";

/** paints the window chrome (decor + bar zones) — no-op when unsupported */
async function applyBarColor(color: string): Promise<void> {
  try {
    await appChrome.setBarBackgroundColor({ color });
  } catch {
    /* not available on this platform */
  }
}

function normalizePath(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

const noopSubscribe = () => () => {};

function useNativeFlag(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => Capacitor.isNativePlatform(),
    () => null,
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const norm = normalizePath(pathname);
  const isMarketing = norm === "/" || norm === "/landing" || norm === "/legal" || norm === "/data-deletion";
  const hasTabBar = willHaveTabBar(pathname);
  const native = useNativeFlag();

  useEffect(() => {
    let un: (() => void) | null = null;
    void initDeepLinking().then((handle) => {
      un = handle?.unregister ?? null;
    });
    return () => {
      if (un) un();
    };
  }, []);

  if (isMarketing) {
    return (
      <div className="min-h-dvh w-full">
        {children}
        <ChromeGate isLanding legal />
      </div>
    );
  }

  if (native === null) {
    return <div className="min-h-dvh w-full" />;
  }

  return (
    <div className={cn("mx-auto min-h-dvh max-w-[440px] sm:border-x sm:border-line", hasTabBar && "pb-[calc(var(--nova-sab)+136px)]")}>
      <SubscriptionGate>
        <PinGate>{children}</PinGate>
        <ChromeGate isLanding={false} />
      </SubscriptionGate>
    </div>
  );
}

/** bottom chrome renders only after localStorage hydration → no SSR mismatch */
function ChromeGate({
  isLanding = false,
  legal = false,
}: {
  isLanding?: boolean;
  /** marketing legal route — hides chrome like landing, but is a real
   *  destination (deep links can cold-start here), so the boot-hide flag
   *  must clear */
  legal?: boolean;
}) {
  const hydrated = usePos((s) => s.hydrated);
  const theme = usePos((s) => s.settings.theme);
  const hydrate = usePos((s) => s.rehydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const unlocked = useSyncExternalStore(subscribeLock, sessionUnlocked, () => false);
  const locked = hasPin() && !unlocked;
  useEffect(() => {
    // boot-hide flag served its purpose (native launch suppressed the landing
    // SSR paint) — clear it only once we're past the landing route, so a slow
    // hydration on "/" can't re-expose the marketing page before the route
    // replacement to /home lands
    if (!isLanding || legal) delete document.documentElement.dataset.novaBoot;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    // bars can be tinted from theme-color metas or the native window decor —
    // both must follow the in-app theme, not the device's night mode
    const barColor = theme === "light" ? "#eef1f6" : "#0a0e17";
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", barColor));

    let cancelled = false;
    const apply = async () => {
      const { Capacitor, SystemBars, SystemBarsStyle } = await import("@capacitor/core");
      if (cancelled) return;
      if (!Capacitor.isNativePlatform()) return;
      try {
        // "Light" = dark icons, for a light background
        await SystemBars.setStyle({
          style: theme === "light" ? SystemBarsStyle.Light : SystemBarsStyle.Dark,
        });
      } catch {
        /* style call is best-effort */
      }
      if (cancelled) return;
      // SetStyle() repaints the decorView from the activity theme's
      // windowBackground (white whenever the device is in light mode) — so this
      // paint must come AFTER it, ending the window in our color, not cap's.
      void applyBarColor(barColor).catch(() => {});
    };
    void apply().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [theme, isLanding, legal]);

  if (!hydrated) return null;
  if (isLanding || legal || locked) {
    // locked (PIN screen up) or landing: no tab bar / sync pill — chrome only
    // returns once the app is unlocked
    return <Toaster />;
  }
  return (
    <>
      <TabBar />
      <SyncStatus />
      <Toaster />
    </>
  );
}
