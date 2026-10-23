import { Suspense } from "react";
import BillingScreen from "./billing-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingScreen />
    </Suspense>
  );
}
