import { Suspense } from "react";
import ConnectScreen from "../connect-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConnectScreen />
    </Suspense>
  );
}
