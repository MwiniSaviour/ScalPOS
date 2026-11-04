"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";
import { captureAffiliateRefFromUrl } from "@/lib/affiliate";

export function AffiliateRefCapture() {
  useEffect(() => {
    captureAffiliateRefFromUrl(window.location.href);
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) return;

    let cancelled = false;
    let unregister: (() => void) | undefined;
    void import("@capacitor/app")
      .then(async (mod) => {
        const handle = await mod.App.addListener("appUrlOpen", (event) => {
          captureAffiliateRefFromUrl(event.url);
        });
        if (cancelled) {
          void handle.remove();
          return;
        }
        unregister = () => {
          void handle.remove();
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unregister?.();
    };
  }, []);

  return null;
}
