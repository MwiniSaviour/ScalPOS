import { Suspense } from "react";
import ShopCreateScreen from "../../shop-create-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ShopCreateScreen />
    </Suspense>
  );
}