import { Suspense } from "react";
import OnboardingScreen from "../onboarding-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OnboardingScreen />
    </Suspense>
  );
}
