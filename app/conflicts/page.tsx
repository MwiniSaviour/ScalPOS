import { Suspense } from "react";
import ConflictsScreen from "../conflicts-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConflictsScreen />
    </Suspense>
  );
}
