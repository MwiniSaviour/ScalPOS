import { Suspense } from "react";
import SellScreen from "../sell-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellScreen />
    </Suspense>
  );
}
