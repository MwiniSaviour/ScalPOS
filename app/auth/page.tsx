import { Suspense } from "react";
import AuthScreen from "../auth-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}
