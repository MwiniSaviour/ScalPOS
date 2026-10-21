"use client";

import { useEffect, useState } from "react";

/**
 * Live connectivity. SSR-safe: starts optimistic (true), corrected on mount —
 * native gets @capacitor/network's networkStatusChange, web gets the
 * window online/offline events.
 */
export function useNet(): { online: boolean } {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let off: () => void = () => {};

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        if (Capacitor.isNativePlatform()) {
          const { Network } = await import("@capacitor/network");
          const status = await Network.getStatus();
          if (cancelled) return;
          setOnline(status.connected);
          const handle = await Network.addListener("networkStatusChange", (s) => {
            setOnline(s.connected);
          });
          if (cancelled) {
            void handle.remove();
            return;
          }
          off = () => void handle.remove();
        } else {
          const update = () => setOnline(navigator.onLine);
          update();
          window.addEventListener("online", update);
          window.addEventListener("offline", update);
          off = () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
          };
        }
      } catch {
        /* no connectivity source — keep the optimistic default */
      }
    })();

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  return { online };
}
