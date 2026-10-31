"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import LandingScreen from "@/components/landing/landing-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RootRoute />
    </Suspense>
  );
}

const noopSubscribe = () => () => {};

/** Server snapshot is `false` because the static export prerenders the
 * landing page; resolving the native flag after hydration avoids a
 * hydration mismatch on every app launch. */
function useNativeFlag(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => Capacitor.isNativePlatform(),
    () => false,
  );
}

function RootRoute() {
  const native = useNativeFlag();
  const router = useRouter();
  useEffect(() => {
    if (native) {
      router.replace("/home");
      // failsafe: if the client navigation somehow doesn't land, clear the
      // boot flag so the user isn't stuck on a blank screen.
      const t = setTimeout(() => {
        delete document.documentElement.dataset.novaBoot;
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [native, router]);
  if (native) return null;
  return <LandingScreen />;
}
