"use client";

import { ClerkProvider } from "@clerk/clerk-react";
import { TokenBridge } from "./token-bridge";

const KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export function ClerkGate({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={KEY}>
      <TokenBridge />
      {children}
    </ClerkProvider>
  );
}
