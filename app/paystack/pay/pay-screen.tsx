"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePos } from "@/lib/store";
import type { CheckoutPayload } from "@/lib/api/billing";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore, useEffect, useState } from "react";

const CHECKOUT_KEY = "nova-pos-checkout-v1";

type PaystackEvent = { message?: string };

type PaystackResumeOptions = {
  accessCode?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (event: PaystackEvent) => void;
};

type PaystackInstance = {
  resumeTransaction: (options: PaystackResumeOptions) => void;
};

type PaystackConstructor = new (publicKey: string) => PaystackInstance;

function paystackFromWindow(): PaystackConstructor | null {
  return (window as unknown as { PaystackPop?: PaystackConstructor }).PaystackPop ?? null;
}

let paystackLoad: Promise<PaystackConstructor> | null = null;

export function resetPaystackForReload(): void {
  paystackLoad = null;
  const tags = document.querySelectorAll("script[data-paystack-inline]");
  for (const tag of Array.from(tags)) tag.remove();
}

export function ensurePaystack(): Promise<PaystackConstructor> {
  const existing = paystackFromWindow();
  if (existing) return Promise.resolve(existing);
  if (paystackLoad) return paystackLoad;
  paystackLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.setAttribute("data-paystack-inline", "true");
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const value = paystackFromWindow();
      if (value) {
        resolve(value);
      } else {
        reject(new Error("Couldn't load Paystack. Check your connection and try again."));
      }
    };
    script.onerror = () => {
      reject(new Error("Couldn't load Paystack. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return paystackLoad;
}

function parsePayload(raw: string): CheckoutPayload | null {
  try {
    const value = JSON.parse(raw) as Partial<CheckoutPayload>;
    const public_key = typeof value.public_key === "string" ? value.public_key : "";
    const access_code = typeof value.access_code === "string" ? value.access_code : "";
    const reference = typeof value.reference === "string" ? value.reference : "";
    if (!public_key || !access_code || !reference) {
      return null;
    }
    return {
      public_key,
      access_code,
      reference,
      email: typeof value.email === "string" ? value.email : "",
      amount: typeof value.amount === "number" ? value.amount : 0,
      currency: typeof value.currency === "string" ? value.currency : "GHS",
      metadata: value.metadata && typeof value.metadata === "object" ? (value.metadata as Record<string, unknown>) : {},
    };
  } catch {
    return null;
  }
}

type CheckoutDetails = { payload: CheckoutPayload | null; raw: string | null };

const EMPTY_DETAILS: CheckoutDetails = { payload: null, raw: null };

let cachedRaw: string | null = null;
let cachedDetails: CheckoutDetails = EMPTY_DETAILS;

function checkoutFromStorage(): CheckoutDetails {
  const raw = sessionStorage.getItem(CHECKOUT_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDetails = { payload: raw !== null ? parsePayload(raw) : null, raw };
  }
  return cachedDetails;
}

/** getSnapshot must be Object.is-stable, so the parse is memoized per raw value. */
function useCheckoutValue(): CheckoutDetails {
  return useSyncExternalStore(() => () => {}, checkoutFromStorage, () => EMPTY_DETAILS);
}

type Phase = "loading" | "open" | "missing" | "error";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function amountStyle(amount: number, currency: string): string {
  if (amount > 0) {
    const value = amount / 100;
    return `${currency} ${value.toFixed(2)}`;
  }
  return "";
}

export default function PaystackPayScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const details = useCheckoutValue();
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      await sleep(0);
      if (!alive) return;
      const payload = checkoutFromStorage().payload;
      if (!payload) {
        setPhase("missing");
        return;
      }
      try {
        const PaystackPop = await ensurePaystack();
        if (!alive) return;
        setPhase("open");
        const checkout = new PaystackPop(payload.public_key);
        checkout.resumeTransaction({
          accessCode: payload.access_code,
          onSuccess: () => {
            sessionStorage.removeItem(CHECKOUT_KEY);
            router.push(`/paystack/callback?reference=${encodeURIComponent(payload.reference)}`);
          },
          onCancel: () => {
            sessionStorage.removeItem(CHECKOUT_KEY);
            toast("Checkout cancelled", "warn");
            router.push("/billing");
          },
          onError: (event) => {
            if (!alive) return;
            setMessage(event.message ?? "Payment could not be started.");
            setPhase("error");
          },
        });
      } catch (e) {
        if (!alive) return;
        setMessage(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, toast, runId]);

  function retry() {
    setMessage("");
    setPhase("loading");
    setRunId((r) => r + 1);
  }

  const requestRef = params.get("ref") ?? "";
  const payload = details.payload;
  const email = payload && payload.email ? payload.email : "";
  const amountLine = payload ? amountStyle(payload.amount, payload.currency) : "";

  const copy: Record<Phase, { title: string; body: string }> = {
    loading: {
      title: "Starting checkout",
      body: "Connecting to Paystack’s secure checkout…",
    },
    open: {
      title: "Secure checkout",
      body: "Complete the payment in the Paystack window. Do not close this page.",
    },
    missing: {
      title: "Checkout expired",
      body: "No active checkout was found. Start a new subscription from Plans & billing.",
    },
    error: {
      title: "Payment could not start",
      body: "Paystack failed to initialise this session.",
    },
  };

  return (
    <div data-testid="paystack-pay" className="anim-fade flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            {phase === "error" || phase === "missing" ? (
              <AlertCircle size={22} />
            ) : (
              <ShieldCheck size={22} />
            )}
          </div>
          <div data-testid={`pay-${phase}`} className="mt-4 flex w-full flex-col items-center">
            <h2 className="text-[17px] font-semibold text-ink">{copy[phase].title}</h2>
            <p className="mt-1.5 text-[14px] leading-5 text-ink2">{copy[phase].body}</p>
            {email ? <p className="mt-2 break-words text-[12px] leading-4 text-ink3">{email}</p> : null}
            {amountLine ? (
              <p className="mt-1 text-[15px] font-semibold text-ink">{amountLine}</p>
            ) : null}
            {requestRef ? (
              <p className="mt-1 break-all text-[11px] leading-4 text-ink3">Ref {requestRef}</p>
            ) : null}
            {phase === "error" && message ? (
              <p className="mt-2 break-words text-[12px] leading-4 text-danger">{message}</p>
            ) : null}
          </div>
          <div className="mt-5 flex w-full flex-col gap-2">
            {phase === "open" ? (
              <Button variant="secondary" size="md" block disabled>
                Waiting for payment…
              </Button>
            ) : phase === "missing" ? (
              <Button variant="primary" size="md" block onClick={() => router.push("/billing")}>
                Back to Plans &amp; billing
              </Button>
            ) : phase === "error" ? (
              <>
                <Button variant="primary" size="md" block onClick={retry}>
                  Try again
                </Button>
                <Button variant="ghost" size="md" block onClick={() => router.push("/billing")}>
                  Back to Plans &amp; billing
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="md" disabled loading>
                Starting checkout
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
