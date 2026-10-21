import { Suspense } from "react";
import AccountScreen from "../account-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountScreen />
    </Suspense>
  );
}
