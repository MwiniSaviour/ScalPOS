"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readConnection, type SyncConnection } from "@/lib/api/bootstrap";
import { getSubscription } from "@/lib/api/billing";
import { recordSubscriptionState } from "@/lib/entitlement";
import { AlertCircle, BadgeCheck, Clock, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { useEffect } from "react";

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const noopSubscribe = () => () => {};

function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

type Phase = "checking" | "confirmed" | "failed" | "openapp" | "unconfirmed" | "error";

export default function PaystackCallbackScreen() {
  const params = useSearchParams();
  const payStatus = params.get("status") ?? "";
  const conn = useClientValue<SyncConnection | null>(readConnection, null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      await sleep(0);
      if (!alive) return;
      try {
        if (payStatus === "failed") {
          setPhase("failed");
          return;
        }
        if (!conn) {
          setPhase("openapp");
          return;
        }
        setPhase("checking");
        let active = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!alive) return;
          const s = await getSubscription(conn);
          recordSubscriptionState(s, conn.org_id);
          if (s.status === "active") {
            active = true;
            break;
          }
          if (attempt < 2) await sleep(1500);
        }
        if (!alive) return;
        setPhase(active ? "confirmed" : "unconfirmed");
      } catch (e) {
        if (!alive) return;
        setMessage(errorText(e));
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [conn, payStatus, runId]);

  function retry() {
    setMessage("");
    setRunId((r) => r + 1);
    setPhase("checking");
  }

  function openApp() {
    window.location.assign("novapos://open");
  }

  const art: Record<Phase, { icon: typeof BadgeCheck; cls: string }> = {
    checking: { icon: Clock, cls: "bg-accent/10 text-accent" },
    confirmed: { icon: BadgeCheck, cls: "bg-accent/10 text-accent" },
    failed: { icon: XCircle, cls: "bg-danger/10 text-danger" },
    openapp: { icon: Smartphone, cls: "bg-accent/10 text-accent" },
    unconfirmed: { icon: Clock, cls: "bg-warn/10 text-warn" },
    error: { icon: AlertCircle, cls: "bg-danger/10 text-danger" },
  };

  const copy: Record<Phase, { title: string; body: string }> = {
    checking: {
      title: "Checking your payment",
      body: "Hang on while we confirm the transaction with Paystack.",
    },
    confirmed: {
      title: "Payment confirmed",
      body: "Your plan is active. Head back to ScalPOS → Plans & billing.",
    },
    failed: {
      title: "Payment failed",
      body: "No charge was made. Subscribe again from ScalPOS → Plans & billing.",
    },
    openapp: {
      title: "Finishing in ScalPOS",
      body: "Payment received. Your plan activates next time you open ScalPOS.",
    },
    unconfirmed: {
      title: "Still confirming",
      body: "We haven't seen the payment yet. It usually lands within a minute — try again shortly.",
    },
    error: {
      title: "Something went wrong",
      body: "We couldn't reach the billing service. Check your connection and retry.",
    },
  };

  const Art = art[phase].icon;
  const busy = phase === "checking";

  return (
    <div data-testid="paystack-callback" className="anim-fade flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <div className={`flex size-12 items-center justify-center rounded-full ${art[phase].cls}`}>
            {busy ? <RefreshCw size={22} className="animate-spin" /> : <Art size={22} />}
          </div>
          <div data-testid={`cb-${phase}`} className="mt-4 flex w-full flex-col items-center">
            <h2 className="text-[17px] font-semibold text-ink">{copy[phase].title}</h2>
            <p className="mt-1.5 text-[14px] leading-5 text-ink2">{copy[phase].body}</p>
            {phase === "error" && message ? (
              <p className="mt-2 break-words text-[12px] leading-4 text-danger">{message}</p>
            ) : null}
          </div>
          <div className="mt-5 flex w-full flex-col gap-2">
            {phase === "checking" ? (
              <Button variant="secondary" size="md" disabled loading>
                Checking
              </Button>
            ) : phase === "confirmed" || phase === "openapp" ? (
              <Button variant="primary" size="md" block icon={<Smartphone size={16} />} onClick={openApp}>
                Open ScalPOS
              </Button>
            ) : phase === "failed" ? (
              <>
                <Button variant="primary" size="md" block icon={<Smartphone size={16} />} onClick={openApp}>
                  Open ScalPOS
                </Button>
                <p className="text-center text-[12px] leading-4 text-ink3">You can retry the payment from Plans &amp; billing.</p>
              </>
            ) : phase === "unconfirmed" || phase === "error" ? (
              <>
                <Button variant="primary" size="md" block icon={<RefreshCw size={16} />} onClick={retry}>
                  Try again
                </Button>
                <Button variant="ghost" size="md" block icon={<Smartphone size={16} />} onClick={openApp}>
                  Open ScalPOS
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
