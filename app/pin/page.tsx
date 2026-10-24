import { Suspense } from "react";
import PinScreen from "../../components/pin-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PinScreen />
    </Suspense>
  );
}
