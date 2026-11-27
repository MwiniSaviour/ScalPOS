import { Suspense } from "react";
import ExpensesScreen from "../expenses-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExpensesScreen />
    </Suspense>
  );
}
