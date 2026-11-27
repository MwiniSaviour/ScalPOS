import { Suspense } from "react";
import { UseCaseScreen } from "@/components/onboarding/use-case-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UseCaseScreen />
    </Suspense>
  );
}
