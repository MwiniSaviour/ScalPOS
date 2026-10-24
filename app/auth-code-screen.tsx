"use client";

import { getSupabase } from "@/lib/api/supabase";
import { bootstrapConnection } from "@/lib/api/bootstrap";
import { Button } from "@/components/ui/button";
import { markOnboarded } from "@/lib/first-run";
import { useNet } from "@/lib/net";
import { usePos } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EMPTY_DIGITS: string[] = ["", "", "", "", "", ""];

export default function AuthCodeScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") ?? "";
  const { online } = useNet();
  const [digits, setDigits] = useState<string[]>(EMPTY_DIGITS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  const cooling = cool > 0;

  useEffect(() => {
    if (!email) router.replace("/auth");
  }, [email, router]);

  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => setCool((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooling]);

  function setDigit(i: number, v: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const s = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!s) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let j = 0; j < s.length; j++) next[j] = s[j];
      return next;
    });
    refs.current[Math.min(s.length, 5)]?.focus();
  }

  async function resend() {
    const sb = getSupabase();
    if (!sb) {
      setError("No account server is configured in this build.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (e) throw new Error(e.message);
      setCool(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const sb = getSupabase();
    if (!sb) {
      setError("No account server is configured in this build.");
      return;
    }
    const code = digits.join("");
    if (!email || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const { error: ve } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
      if (ve) {
        setError(ve.message);
        return;
      }
      const { data } = await sb.auth.getSession();
      const sess = data?.session ?? null;
      if (sess?.access_token && sess.user) {
        try {
          await bootstrapConnection({
            access_token: sess.access_token,
            user_id: sess.user.id,
            email,
          });
          markOnboarded();
          usePos.getState().toast("Signed in — shop synced", "ok");
          router.replace("/home");
        } catch {
          usePos.getState().toast("Signed in, but setup wasn't complete", "warn");
          router.replace("/connect");
        }
      } else {
        setError("Couldn't confirm the code — try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
      <BrandMark />
      <h1 className="mt-5 text-[26px]/7 font-bold text-ink">Enter your code</h1>
      <p className="mt-1 text-[15px] text-ink3">
        Sent to {email}. The 6-digit code appears in the sign-in email, alongside the link.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <div className="flex gap-2" data-testid="code-row">
          {digits.map((d, i) => (
            <input
              key={i}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              size={1}
              aria-label={`Digit ${i + 1}`}
              value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                setDigit(i, v);
                if (v && i < 5) refs.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Backspace") return;
                if (!d && i > 0) {
                  e.preventDefault();
                  refs.current[i - 1]?.focus();
                  setDigit(i - 1, "");
                } else if (d) {
                  e.preventDefault();
                  setDigit(i, "");
                }
              }}
              onPaste={i === 0 ? handlePaste : undefined}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="press h-12 w-full min-w-0 flex-1 rounded-xl border bg-surface2 text-center text-[22px] font-bold text-ink outline-none border-line2 focus:border-accent/60"
            />
          ))}
        </div>
        <Button
          className="mt-4 h-12 rounded-full"
          size="lg"
          block
          loading={busy}
          disabled={digits.some((d) => !d) || busy || !online || !email}
          onClick={verify}
          data-testid="code-verify"
        >
          Verify &amp; continue
        </Button>
        <div className="mt-3 flex justify-between text-[14px]">
          <Button variant="ghost" size="sm" disabled={cooling || busy} onClick={resend}>
            {`Resend code${cool > 0 ? ` (${cool}s)` : ""}`}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => router.replace("/auth")}>
            Change email
          </Button>
        </div>
      </div>

      {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
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
