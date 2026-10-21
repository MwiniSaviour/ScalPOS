import { Suspense } from "react";
import InventoryScreen from "../inventory-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InventoryScreen />
    </Suspense>
  );
}
