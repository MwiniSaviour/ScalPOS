import { Suspense } from "react";
import AuthCodeScreen from "../../auth-code-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthCodeScreen />
    </Suspense>
  );
}
