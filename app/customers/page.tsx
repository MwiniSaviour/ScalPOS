import { Suspense } from "react";
import CustomersScreen from "../customers-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomersScreen />
    </Suspense>
  );
}
