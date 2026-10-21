import { Suspense } from "react";
import CategoriesScreen from "../categories-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CategoriesScreen />
    </Suspense>
  );
}
