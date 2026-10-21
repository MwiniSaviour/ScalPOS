import { Suspense } from "react";
import SettingsScreen from "../settings-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsScreen />
    </Suspense>
  );
}
