import { Suspense } from "react";
import SecurityScreen from "../security-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SecurityScreen />
    </Suspense>
  );
}
