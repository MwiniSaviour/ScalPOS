import { Suspense } from "react";
import { FinanceEntryScreen } from "@/components/finance/entry-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FinanceEntryScreen kind="funds" />
    </Suspense>
  );
}
