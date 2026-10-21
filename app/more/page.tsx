import { Suspense } from "react";
import MoreScreen from "../more-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MoreScreen />
    </Suspense>
  );
}
