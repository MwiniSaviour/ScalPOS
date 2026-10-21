import { Suspense } from "react";
import PayScreen from "../pay-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PayScreen />
    </Suspense>
  );
}
