"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./tabbar";
import { Toaster } from "@/components/ui/toaster";
import { usePos } from "@/lib/store";
import { useEffect } from "react";
import { cn } from "@/lib/ui";

/** the tab bar exists only on these routes — everything else owns its own bottom space */
const TAB_ROUTES = ["/", "/orders", "/inventory", "/more"];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasTabBar = TAB_ROUTES.includes(normalize(pathname));
  return (
    <div className={cn("mx-auto min-h-dvh max-w-[440px] sm:border-x sm:border-line", hasTabBar && "pb-28")}>
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

  if (!hydrated) return null;
  return (
    <>
      <TabBar />
      <Toaster />
    </>
  );
}
