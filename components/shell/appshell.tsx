"use client";

import { usePathname } from "next/navigation";
import { TabBar, willHaveTabBar } from "./tabbar";
import { NetStatus } from "@/components/ui/netstatus";
import { SyncStatus } from "@/components/ui/syncstatus";
import { Toaster } from "@/components/ui/toaster";
import { usePos } from "@/lib/store";
import { useEffect } from "react";
import { cn } from "@/lib/ui";
import { PinGate } from "@/components/pin-gate";
import { appChrome } from "@/lib/appchrome";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const norm = normalizePath(pathname);
  const isLanding = norm === "/" || norm === "/landing";
  const hasTabBar = willHaveTabBar(pathname);

  if (isLanding) {
    return (
      <div className="min-h-dvh w-full">
        {children}
        <ChromeGate isLanding />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto min-h-dvh max-w-[440px] sm:border-x sm:border-line", hasTabBar && "pb-[calc(var(--nova-sab)+136px)]")}>
      <PinGate>{children}</PinGate>
      <ChromeGate isLanding={false} />
    </div>
  );
}

/** bottom chrome renders only after localStorage hydration → no SSR mismatch */
function ChromeGate({ isLanding = false }: { isLanding?: boolean }) {
  const hydrated = usePos((s) => s.hydrated);
  const theme = usePos((s) => s.settings.theme);
  const hydrate = usePos((s) => s.rehydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
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
  }, [theme]);

  if (!hydrated) return null;
  if (isLanding) {
    return <Toaster />;
  }
  return (
    <>
      <TabBar />
      <NetStatus />
      <SyncStatus />
      <Toaster />
    </>
  );
}
