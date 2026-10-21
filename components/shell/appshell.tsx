"use client";

import { usePathname } from "next/navigation";
import { TabBar, willHaveTabBar } from "./tabbar";
import { NetStatus } from "@/components/ui/netstatus";
import { SyncStatus } from "@/components/ui/syncstatus";
import { Toaster } from "@/components/ui/toaster";
import { usePos } from "@/lib/store";
import { useEffect } from "react";
import { cn } from "@/lib/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasTabBar = willHaveTabBar(pathname);
  return (
    <div className={cn("mx-auto min-h-dvh max-w-[440px] sm:border-x sm:border-line", hasTabBar && "pb-[164px]")}>
      {children}
      <ChromeGate />
    </div>
  );
}

/** bottom chrome renders only after localStorage hydration → no SSR mismatch */
function ChromeGate() {
  const hydrated = usePos((s) => s.hydrated);
  const theme = usePos((s) => s.settings.theme);
  const hydrate = usePos((s) => s.rehydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // the Android status bar sits on top of the app: its icons must follow the
  // app theme, not the device's night mode
  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      try {
        const { Capacitor, SystemBars, SystemBarsStyle } = await import("@capacitor/core");
        if (cancelled) return;
        if (!Capacitor.isNativePlatform()) return;
        // "Light" = dark icons, for a light background
        await SystemBars.setStyle({ style: theme === "light" ? SystemBarsStyle.Light : SystemBarsStyle.Dark });
      } catch {
        /* not available on this platform */
      }
    };
    void apply();
    return () => {
      cancelled = true;
    };
  }, [theme]);

  if (!hydrated) return null;
  return (
    <>
      <TabBar />
      <NetStatus />
      <SyncStatus />
      <Toaster />
    </>
  );
}
