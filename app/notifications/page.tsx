import { Suspense } from "react";
import NotificationsScreen from "../notifications-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NotificationsScreen />
    </Suspense>
  );
}
