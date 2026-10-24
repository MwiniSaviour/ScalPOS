"use client";

import { getSupabase } from "@/lib/api/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useNet } from "@/lib/net";
import { markOnboarded } from "@/lib/first-run";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mode = "signin" | "shop";

export default function AuthScreen() {
  const router = useRouter();
  const { online } = useNet();
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mod = await import("@/lib/api/supabase");
      const sb = mod.getSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      const sess = data?.session ?? null;
      if (sess?.user) setSignedInEmail(sess.user.email ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function send() {
    const sb = getSupabase();
    if (!sb) {
      setError("No account server is configured in this build.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await sb.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false },
      });
      if (e) {
        setError(e.message);
        return;
      }
      router.push(`/auth/code?email=${encodeURIComponent(trimmed)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (signedInEmail) {
    return (
      <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
        <BrandMark />
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[14px] text-ink3">Signed in as {signedInEmail}</p>
          <Button className="mt-3 h-12 rounded-full" size="lg" block onClick={() => router.replace("/home")}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
      <BrandMark />
      <h1 className="mt-5 text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Welcome to Nova POS</h1>
      <p className="mt-1 text-[15px] text-ink3">Sell, track stock and sync your whole team.</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "signin", label: "Sign in" },
            { value: "shop", label: "Create shop" },
          ]}
        />
        {mode === "shop" ? (
          <Button block size="lg" onClick={() => router.push("/shop/create")}>
            Create your shop
          </Button>
        ) : (
          <>
            <Input
              className="mt-3"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              inputMode="email"
            />
            <Button
              className="mt-3 h-12 rounded-full"
              size="lg"
              block
              loading={busy}
              disabled={!online || busy}
              onClick={send}
              data-testid="auth-send"
            >
              Email me a code
            </Button>
            {!online && (
              <p className="mt-3 rounded-card bg-surface2 px-3 py-2 text-[14px] text-ink3">
                You're offline — connect to Wi-Fi or data to sign in.
              </p>
            )}
          </>
        )}
      </div>

      {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}

      <div className="mt-4 pb-8">
        <Button
          variant="secondary"
          block
          onClick={() => {
            markOnboarded();
            router.replace("/home");
          }}
          data-testid="auth-offline"
        >
          Continue on this device
        </Button>
        <p className="mt-2 text-center text-[13px] text-ink3">
          Sell on this device first — connect a shop account later from Settings.
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="size-12">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#0a0e17" />
      <rect x="22" y="26" width="56" height="16" rx="5" fill="url(#g)" />
      <path d="M30 50h40l-4 24a4 4 0 0 1-4 3.4H38a4 4 0 0 1-4-3.4Z" fill="url(#g)" opacity=".9" />
      <circle cx="40" cy="66" r="3.4" fill="#0a0e17" />
      <circle cx="60" cy="66" r="3.4" fill="#0a0e17" />
    </svg>
  );
}
