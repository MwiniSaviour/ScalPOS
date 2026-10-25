import { Suspense } from "react";
import PinForgotScreen from "../../pin-forgot-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PinForgotScreen />
    </Suspense>
  );
}
