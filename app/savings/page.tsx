import { Suspense } from "react";
import SavingsScreen from "../savings-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SavingsScreen />
    </Suspense>
  );
}
