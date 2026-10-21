import { Suspense } from "react";
import OrdersScreen from "../orders-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrdersScreen />
    </Suspense>
  );
}
