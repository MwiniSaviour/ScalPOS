"use client";

import { Suspense, useEffect } from "react";
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

function RootRoute() {
  const native = Capacitor.isNativePlatform();
  const router = useRouter();
  useEffect(() => {
    if (native) router.replace("/home");
  }, [native, router]);
  if (native) return null;
  return <LandingScreen />;
}
