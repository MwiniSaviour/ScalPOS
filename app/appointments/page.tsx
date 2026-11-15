import { Suspense } from "react";
import AppointmentsScreen from "../appointments-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppointmentsScreen />
    </Suspense>
  );
}
