import { Suspense } from "react";
import ProductDetailScreen from "../../product-detail-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetailScreen />
    </Suspense>
  );
}
