import { Suspense } from "react";
import HomeScreen from "./home-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeScreen />
    </Suspense>
  );
}
