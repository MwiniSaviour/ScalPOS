import { Suspense } from "react";
import AuthCallbackScreen from "../../auth-callback-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackScreen />
    </Suspense>
  );
}
