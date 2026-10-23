"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/shell/screenheader";
import { readConnection, type SyncConnection } from "@/lib/api/bootstrap";
import { getSubscription, startSubscription, type SubPlan, type SubscriptionState } from "@/lib/api/billing";
import { dateShort } from "@/lib/format";
import { usePos } from "@/lib/store";
import { BadgeCheck, Clock, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const noopSubscribe = () => () => {};

function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

function statusToast(s: SubscriptionState): string {
  if (s.status === "active") return "Payment confirmed";
  if (s.status === "pending") return "Still waiting for payment";
  if (s.status === "expired") return "Subscription expired";
  return "No plan yet";
}

function PlanCard({
  plan,
  title,
  price,
  bullets,
  busy,
  disabled,
  onSubscribe,
}: {
  plan: SubPlan;
  title: string;
  price: string;
  bullets: string[];
  busy: boolean;
  disabled: boolean;
  onSubscribe: () => void;
}) {
  return (
    <Card data-testid={`plan-${plan}`} className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-semibold text-ink">{title}</span>
        <span className="tabnum text-[15px] font-bold text-ink">{price}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
            <span className="text-[14px] leading-5 text-ink2">{b}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-4"
        variant="primary"
        block
        loading={busy}
        disabled={disabled}
        onClick={onSubscribe}
      >
        Subscribe
      </Button>
    </Card>
  );
}

export default function BillingScreen() {
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const conn = useClientValue<SyncConnection | null>(readConnection, null);
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(!!conn);
  const [busy, setBusy] = useState<SubPlan | "refresh" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conn) return;
    setBusy("refresh");
    setError(null);
    try {
      const next = await getSubscription(conn);
      setState(next);
      toast(statusToast(next), next.status === "active" ? "ok" : "warn");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }, [conn, toast]);

  useEffect(() => {
    if (!conn) return;
    let alive = true;
    getSubscription(conn)
      .then((s) => {
        if (alive) setState(s);
      })
      .catch((e: unknown) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [conn]);

  const subscribe = async (plan: SubPlan) => {
    if (!conn || busy) return;
    setBusy(plan);
    setError(null);
    try {
      await startSubscription(conn, plan);
      toast("Opening Paystack checkout…", "ok");
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const statusBody = () => {
    if (loading) {
      return <span className="text-[14px] text-ink3">Checking plan…</span>;
    }
    if (!conn) {
      return (
        <div data-testid="billing-status" className="flex w-full items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Not connected</span>
            <span className="mt-0.5 block text-[14px] text-ink3">
              Connect your shop to manage your plan
            </span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => router.push("/connect")}>
            Connect
          </Button>
        </div>
      );
    }
    const s = state;
    if (s && s.status === "active") {
      return (
        <div data-testid="billing-status" className="flex w-full items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <BadgeCheck className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-accent">Active</span>
            <span className="block text-[14px] text-ink3">
              {s.plan === "enterprise" ? "Enterprise" : "Standard"} plan
              {s.expires_at ? ` · Renews by ${dateShort(new Date(s.expires_at).getTime())}` : ""}
            </span>
          </span>
        </div>
      );
    }
    if (s && s.status === "pending") {
      return (
        <div data-testid="billing-status" className="flex w-full items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn/10 text-warn">
            <Clock className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-warn">Payment pending</span>
            <span className="block text-[14px] text-ink3">
              Finish checkout, then refresh to confirm
            </span>
          </span>
        </div>
      );
    }
    if (s && s.status === "expired") {
      return (
        <div data-testid="billing-status" className="flex w-full items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn/10 text-warn">
            <ShieldAlert className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-warn">Expired</span>
            <span className="block text-[14px] text-ink3">
              Subscribe again to keep cloud sync going
            </span>
          </span>
        </div>
      );
    }
    return (
      <div data-testid="billing-status" className="flex w-full items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">No plan yet</span>
          <span className="mt-0.5 block text-[14px] text-ink3">
            The app works offline regardless.
          </span>
        </span>
      </div>
    );
  };

  return (
    <>
      <ScreenHeader title="Plans & billing" onBack />
      <div className="anim-fade px-4 pt-3 pb-24">
        <Card className="px-4 py-3.5">
          <div className="flex items-center">{statusBody()}</div>
        </Card>
        <Button
          data-testid="billing-refresh"
          variant="secondary"
          size="sm"
          className="mt-2.5"
          icon={<RefreshCw className="size-[16px]" />}
          disabled={!conn || busy !== null || loading}
          loading={busy === "refresh"}
          onClick={() => void refresh()}
        >
          Refresh status
        </Button>
        {error && <p className="mt-2.5 text-[14px] leading-5 text-danger">{error}</p>}

        <section className="mt-6">
          <h2 className="text-[15px] font-medium text-ink2">Choose a plan</h2>
          <p className="mt-0.5 text-[14px] text-ink3">Both plans cover a full year. Pay once with Paystack.</p>
          <div className="mt-2.5 grid gap-2.5">
            <PlanCard
              plan="standard"
              title="Standard"
              price="GHS 120/year"
              bullets={["Single owner", "Unlimited sales", "Offline register"]}
              busy={busy === "standard"}
              disabled={!conn || busy !== null}
              onSubscribe={() => void subscribe("standard")}
            />
            <PlanCard
              plan="enterprise"
              title="Enterprise"
              price="GHS 360/year"
              bullets={[
                "Multi-user & roles",
                "Real-time sync",
                "Cloud backup",
                "Desktop access",
                "Notifications",
              ]}
              busy={busy === "enterprise"}
              disabled={!conn || busy !== null}
              onSubscribe={() => void subscribe("enterprise")}
            />
          </div>
          <p className="mt-4 text-[13px] leading-5 text-ink3">
            Payments handled by Paystack. By subscribing you agree to our{" "}
            <Link href="/legal" className="text-accent underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal" className="text-accent underline underline-offset-2">
              Refund Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
