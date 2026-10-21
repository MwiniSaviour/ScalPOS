import { Suspense } from "react";
import ReportsScreen from "../reports-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportsScreen />
    </Suspense>
  );
}
