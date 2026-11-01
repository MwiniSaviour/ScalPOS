"use client";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { readConnection } from "@/lib/api/bootstrap";
import { useEntitlement } from "@/lib/entitlement";
import { dateShort } from "@/lib/format";
import { usePos } from "@/lib/store";
import { useAuth } from "@clerk/clerk-react";
import { CloudOff, Download, LockKeyhole, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Full-app wall shown once the 7-day trial ends without an active plan.
 * Deliberately keeps backup reachable so shop data is never held hostage.
 */
export function SubscriptionLock() {
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const expiresAt = useEntitlement((s) => s.expiresAt);
  const refreshing = useEntitlement((s) => s.refreshing);
  const refresh = useEntitlement((s) => s.refresh);
  const [connected] = useState(() => readConnection() !== null);
  const { isSignedIn } = useAuth();

  async function retry() {
    await refresh(true);
    const status = useEntitlement.getState().status;
    if (status === "locked") {
      toast("No active subscription found yet", "warn");
    } else {
      toast("Subscription active — welcome back", "ok");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-[400px] text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <LockKeyhole className="size-7" />
        </span>
        <h1 className="mt-5 text-[24px]/8 font-bold tracking-[-0.02em] text-ink">
          Your free trial has ended
        </h1>
        <p className="mt-2 text-[15px]/6 text-ink3">
          {expiresAt
            ? `The 7-day trial ended ${dateShort(expiresAt)}. `
            : ""}
          Your shop data is still safe on this device. Subscribe to keep selling with ScalPOS.
        </p>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-left">
          <p className="text-[15px] font-semibold text-ink">Yearly plans</p>
          <div className="mt-2 flex items-baseline justify-between text-[14px] text-ink3">
            <span>Standard</span>
            <span className="tabnum font-semibold text-ink">₵120 / year</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-[14px] text-ink3">
            <span>Enterprise</span>
            <span className="tabnum font-semibold text-ink">₵360 / year</span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[12px]/5 text-ink3">
            <CloudOff className="mt-0.5 size-3.5 shrink-0" />
            Paying needs an internet connection. Ask the shop owner to renew if you&rsquo;re a
            cashier.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            size="lg"
            block
            onClick={() => router.push(connected ? "/billing" : "/connect")}
          >
            {connected ? "Choose a plan" : "Connect & subscribe"}
          </Button>
          {connected && (
            <Button
              variant="secondary"
              size="lg"
              block
              loading={refreshing}
              icon={<RefreshCw className="size-4" />}
              onClick={() => void retry()}
            >
              I&rsquo;ve paid — check again
            </Button>
          )}
          <Button
            variant="ghost"
            block
            icon={<Download className="size-4" />}
            onClick={() => router.push("/backup")}
          >
            Export a backup first
          </Button>
          {isSignedIn && (
            <Button
              variant="ghost"
              block
              icon={<Trash2 className="size-4" />}
              onClick={() => router.push("/account")}
            >
              Delete my account
            </Button>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
