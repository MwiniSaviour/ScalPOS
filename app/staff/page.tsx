import { Suspense } from "react";
import StaffScreen from "../staff-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StaffScreen />
    </Suspense>
  );
}
