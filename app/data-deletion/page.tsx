import { Suspense } from "react";
import DataDeletionScreen from "../data-deletion-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DataDeletionScreen />
    </Suspense>
  );
}
