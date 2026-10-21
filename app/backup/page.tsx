import { Suspense } from "react";
import BackupScreen from "../backup-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BackupScreen />
    </Suspense>
  );
}
