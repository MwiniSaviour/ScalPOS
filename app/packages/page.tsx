import { Suspense } from "react";
import PackagesScreen from "../packages-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PackagesScreen />
    </Suspense>
  );
}
