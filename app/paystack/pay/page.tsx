import { Suspense } from "react";
import PaystackPayScreen from "./pay-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaystackPayScreen />
    </Suspense>
  );
}
