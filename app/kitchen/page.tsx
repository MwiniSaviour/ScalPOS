import { Suspense } from "react";
import KitchenScreen from "../kitchen-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <KitchenScreen />
    </Suspense>
  );
}
