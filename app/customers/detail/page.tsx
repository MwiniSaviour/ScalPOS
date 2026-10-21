import { Suspense } from "react";
import CustomerDetailScreen from "../../customer-detail-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomerDetailScreen />
    </Suspense>
  );
}
