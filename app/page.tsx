import { Suspense } from "react";
import LandingScreen from "@/components/landing/landing-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingScreen />
    </Suspense>
  );
}
