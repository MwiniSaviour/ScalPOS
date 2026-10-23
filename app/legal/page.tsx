import { Suspense } from "react";
import LegalScreen from "../legal-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LegalScreen />
    </Suspense>
  );
}
