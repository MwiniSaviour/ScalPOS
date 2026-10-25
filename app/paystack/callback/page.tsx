import { Suspense } from "react";
import PaystackCallbackScreen from "./callback-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaystackCallbackScreen />
    </Suspense>
  );
}
