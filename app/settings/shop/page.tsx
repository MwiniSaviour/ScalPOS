import { Suspense } from "react";
import ShopSettingsScreen from "../../shopsettings-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ShopSettingsScreen />
    </Suspense>
  );
}
