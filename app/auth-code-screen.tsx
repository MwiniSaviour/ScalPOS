"use client";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brandmark";
import { markOnboarded } from "@/lib/first-run";
import { bootstrapConnection, writeConnection } from "@/lib/api/bootstrap";
import { useNet } from "@/lib/net";
import { usePos } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp, useClerk } from "@clerk/clerk-react";

const EMPTY_DIGITS: string[] = ["", "", "", "", "", ""];

const DRAWER_PASSWORD: string =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${crypto.randomUUID()}${crypto.randomUUID()}`
    : `${Date.now()}${Math.random()}`;

export default function AuthCodeScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") ?? "";
  const isNew = sp.get("new") === "1";
  const fromParam = sp.get("from") === "connect" ? "connect" : "auth";
  const { online } = useNet();
  const { getToken, userId } = useAuth();
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const [digits, setDigits] = useState<string[]>(EMPTY_DIGITS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  const cooling = cool > 0;
  const emailSentRef = useRef(false);

  function errMessage(e: unknown): string {
    if (e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: unknown[] }).errors)) {
      const first = (e as { errors: { message?: unknown }[] }).errors[0];
      if (first && typeof first.message === "string") return first.message;
    }
    return e instanceof Error ? e.message : String(e);
  }

  function errorCode(e: unknown): string | null {
    if (e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: unknown[] }).errors)) {
      const first = (e as { errors: { code?: unknown }[] }).errors[0];
      if (first && typeof first.code === "string") return first.code;
    }
    return null;
  }

  useEffect(() => {
    if (!email) router.replace("/auth");
  }, [email, router]);

  useEffect(() => {
    if (!isNew || !signUp || !email || emailSentRef.current) return;
    emailSentRef.current = true;
    void (async () => {
      try {
        // This page may be remounted while a sign-up is already waiting for
        // its code. Recreating it would invalidate the code the user got.
        const pending =
          signUp.status === "missing_requirements" &&
          signUp.unverifiedFields.includes("email_address") &&
          (signUp.emailAddress ?? "").toLowerCase() === email.toLowerCase();
        if (pending) {
          setCool(30);
          return;
        }
        await signUp.create({ emailAddress: email, password: DRAWER_PASSWORD });
        await signUp.prepareVerification({ strategy: "email_code" });
        setCool(30);
      } catch (e) {
        if (errorCode(e) === "form_identifier_exists") {
          router.replace(`/auth/code?email=${encodeURIComponent(email)}&from=${fromParam}`);
          return;
        }
        setError(errMessage(e));
      }
    })();
  }, [isNew, signUp, email, router, fromParam]);

  const signInStartedRef = useRef(false);

  useEffect(() => {
    if (isNew || !signIn || !email || signInStartedRef.current) return;
    signInStartedRef.current = true;
    const id = setTimeout(() => {
      if (signIn.status) return;
      void (async () => {
        try {
          await signIn.create({ identifier: email, strategy: "email_code" });
          setCool(30);
        } catch (e) {
          const code = errorCode(e);
          if (code === "form_identifier_not_found" || code === "identifier_not_found") {
            router.replace(`/auth/code?email=${encodeURIComponent(email)}&new=1&from=${fromParam}`);
            return;
          }
          signInStartedRef.current = false;
          setError(errMessage(e));
        }
      })();
    }, 400);
    return () => clearTimeout(id);
  }, [isNew, signIn, email, router, fromParam]);

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
    if (cooling || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        if (!signUp) throw new Error("Sign-up is still loading. Try again.");
        const pending =
          signUp.status === "missing_requirements" &&
          (signUp.emailAddress ?? "").toLowerCase() === email.toLowerCase();
        if (pending) {
          try {
            await signUp.prepareVerification({ strategy: "email_code" });
          } catch {
            await signUp.create({ emailAddress: email, password: DRAWER_PASSWORD });
            await signUp.prepareVerification({ strategy: "email_code" });
          }
        } else {
          await signUp.create({ emailAddress: email, password: DRAWER_PASSWORD });
          await signUp.prepareVerification({ strategy: "email_code" });
        }
      } else {
        if (!signIn) throw new Error("Sign-in is still loading. Try again.");
        await signIn.create({ identifier: email, strategy: "email_code" });
      }
      setCool(30);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const code = digits.join("");
    if (!email || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        if (!signUp) {
          setError("Sign-up is still loading. Try again.");
          return;
        }
        const result = await signUp.attemptEmailAddressVerification({ code });
        if (result.status !== "complete") {
          setError("Couldn't confirm the code — try again.");
          return;
        }
        if (result.createdSessionId) {
          await clerk.setActive({ session: result.createdSessionId });
        }
      } else {
        if (!signIn) {
          setError("Sign-in state unavailable.");
          return;
        }
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (result.status !== "complete") {
          setError("Couldn't confirm the code — try again.");
          return;
        }
        if (result.createdSessionId) {
          await clerk.setActive({ session: result.createdSessionId });
        }
      }
      markOnboarded();
      usePos.getState().toast(
        isNew ? "Account created — connecting your shop" : "Signed in — connecting your shop",
        "ok",
      );
      if (isNew) {
        // Arrived from the Create-your-shop flow with an optional email: create
        // the owner account and immediately bootstrap the new shop onto it.
        let created = false;
        try {
          const token = await getToken({ template: "supabase" });
          const uid = userId ?? "";
          if (token && uid) {
            const c = await bootstrapConnection({ access_token: token, user_id: uid, email, action: "create" });
            writeConnection(c);
            created = true;
          }
        } catch {
          /* fall through to connect */
        }
        router.replace(created ? "/" : "/connect");
        return;
      }
      router.replace("/connect");
    } catch (e) {
      if (errorCode(e) === "form_code_incorrect") {
        setError("That code isn't correct — double-check the latest email, or tap Resend code.");
        return;
      }
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
      <BrandMark />
      <h1 className="mt-5 text-[26px]/7 font-bold text-ink">Enter your code</h1>
      <p className="mt-1 text-[15px] text-ink3">
        {isNew ? "Check your email — enter the 6-digit code to create your account." : `Sent to ${email}. Enter the 6-digit code to sign in.`}
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
                const v = e.target.value.replace(/\D/g, "");
                if (!v) {
                  setDigit(i, "");
                  return;
                }
                // Android/email autofill often drops the whole one-time code
                // into the first box. Spread it across the remaining boxes.
                if (v.length > 1) {
                  setDigits((prev) => {
                    const next = [...prev];
                    for (let j = 0; j < v.length && i + j < 6; j++) next[i + j] = v[j];
                    return next;
                  });
                  refs.current[Math.min(5, i + v.length - 1)]?.focus();
                  return;
                }
                setDigit(i, v);
                if (i < 5) refs.current[i + 1]?.focus();
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
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => router.replace(fromParam === "connect" ? "/connect" : "/auth")}
          >
            Change email
          </Button>
        </div>
      </div>

      {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
    </div>
  );
}

