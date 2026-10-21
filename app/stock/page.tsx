import { Suspense } from "react";
import StockScreen from "../stock-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockScreen />
    </Suspense>
  );
}
