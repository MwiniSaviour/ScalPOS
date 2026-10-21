import { Suspense } from "react";
import ProductEditScreen from "../../product-edit-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductEditScreen />
    </Suspense>
  );
}
