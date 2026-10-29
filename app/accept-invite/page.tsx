import { Suspense } from "react";
import AcceptInviteScreen from "../accept-invite-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteScreen />
    </Suspense>
  );
}
