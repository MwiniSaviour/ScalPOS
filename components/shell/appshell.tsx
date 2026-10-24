"use client";

import { usePathname } from "next/navigation";
import { TabBar, willHaveTabBar } from "./tabbar";
import { SyncStatus } from "@/components/ui/syncstatus";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/store";
import { Capacitor } from "@capacitor/core";
import { Smartphone } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
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
  const isLanding = norm === "/" || norm === "/landing";
  const hasTabBar = willHaveTabBar(pathname);
  const native = useNativeFlag();

  if (isLanding) {
    return (
      <div className="min-h-dvh w-full">
        {children}
        <ChromeGate isLanding />
      </div>
    );
  }

  if (native === null) {
    return <div className="min-h-dvh w-full" />;
  }

  if (native === false) {
    return <BrowserBlock />;
  }

  return (
    <div className={cn("mx-auto min-h-dvh max-w-[440px] sm:border-x sm:border-line", hasTabBar && "pb-[calc(var(--nova-sab)+136px)]")}>
      <PinGate>{children}</PinGate>
      <ChromeGate isLanding={false} />
    </div>
  );
}

function BrowserBlock() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Smartphone className="size-7" />
      </div>
      <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-ink">
        Nova POS lives on your phone
      </h1>
      <p className="mt-2 max-w-[300px] text-[15px]/6 text-ink3">
        The mobile app has the full register — sales, stock, customers and
        receipts. A browser version is on the way.
      </p>
      <a
        href="https://pos.scalmint.com"
        target="_blank"
        rel="noreferrer"
        className="mt-7 w-full max-w-[300px]"
      >
        <Button variant="secondary" size="lg" block>
          Visit pos.scalmint.com
        </Button>
      </a>
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
      <SyncStatus />
      <Toaster />
    </>
  );
}
