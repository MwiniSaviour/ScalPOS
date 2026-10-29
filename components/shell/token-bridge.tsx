"use client";

import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { registerTokenProvider } from "@/lib/api/session";
import { SyncKeeper } from "./sync-keeper";

function TokenBridge() {
  const { isSignedIn, getToken } = useAuth();
  useEffect(() => {
    if (!isSignedIn) {
      registerTokenProvider(null);
      return;
    }
    registerTokenProvider(async () => {
      try {
        return (await getToken({ template: "supabase" })) ?? null;
      } catch (e) {
        console.warn("[nova] supabase token mint failed", e);
        return null;
      }
    });
  }, [isSignedIn, getToken]);
  return <SyncKeeper signedIn={Boolean(isSignedIn)} />;
}

export { TokenBridge };
