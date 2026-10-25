"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth, useSignIn, useUser } from "@clerk/clerk-react";
import { Input } from "@/components/ui/input";
import { useNet } from "@/lib/net";
import { usePos } from "@/lib/store";
import { setSessionUnlocked, usePinLock } from "@/lib/pin";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EMPTY_DIGITS: string[] = ["", "", "", "", "", ""];

function errMessage(e: unknown): string {
  if (e && typeof e === "object" && "errors" in e && Array.isArray((e as { errors: unknown[] }).errors)) {
    const first = (e as { errors: { message?: unknown }[] }).errors[0];
    if (first && typeof first.message === "string") return first.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * Forgotten PIN recovery. The PIN is a device lock; resetting it requires
 * proving identity with a 6-digit code sent to the account email.
 */
export default function PinForgotScreen() {
  const router = useRouter();
  const { online } = useNet();
  const toast = usePos((s) => s.toast);
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { user } = useUser();
  const { setPin } = usePinLock();
  const [stage, setStage] = useState<"code" | "newpin">("code");
  const [digits, setDigits] = useState<string[]>(EMPTY_DIGITS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirmValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [cool, setCool] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const codeSentRef = useRef(false);
  const cooling = cool > 0;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => setCool((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooling]);

  useEffect(() => {
    if (!isSignedIn || !signIn || !email || codeSentRef.current) return;
    codeSentRef.current = true;
    void (async () => {
      try {
        await signIn.create({ identifier: email, strategy: "email_code" });
        setCool(30);
      } catch (e) {
        setError(errMessage(e));
      }
    })();
  }, [isSignedIn, signIn, email]);

  async function reSend() {
    if (!signIn || cooling || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn.create({ identifier: email, strategy: "email_code" });
      setCool(30);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

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

  async function verifyCode() {
    const code = digits.join("");
    if (!email || code.length < 6 || !signIn) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (result.status === "complete") {
        setStage("newpin");
        setDigits(["", "", "", "", "", ""]);
        return;
      }
      setError("Couldn't confirm the code — try again.");
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    setError(null);
    if (pin.trim().length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("PINs do not match.");
      return;
    }
    try {
      await setPin(pin.trim());
      setSessionUnlocked(true);
      toast("PIN reset", "ok");
      router.replace("/home");
    } catch (e) {
      setError(errMessage(e));
    }
  }

  if (!isLoaded) return <div className="min-h-dvh" />;

  if (!isSignedIn) {
    return (
      <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
        <h1 className="text-[26px]/7 font-bold text-ink">Reset your PIN</h1>
        <p className="mt-1 text-[15px]/6 text-ink3">
          To prove the shop is yours, first sign in with the account email you
          used for cloud sync. Everyone can still use the register offline —
          the PIN only guards this device.
        </p>
        <Button className="mt-6 h-12 rounded-full" size="lg" block onClick={() => router.replace("/connect")} data-testid="pin-forgot-signin">
          Sign in first
        </Button>
      </div>
    );
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-10">
      <h1 className="text-[26px]/7 font-bold text-ink">
        {stage === "code" ? "Check your email" : "Choose a new PIN"}
      </h1>
      {stage === "code" ? (
        <>
          <p className="mt-1 text-[15px] text-ink3">
            Sent a 6-digit code to {email}. Enter it to reset the PIN.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <div className="flex gap-2">
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
              disabled={digits.some((d) => !d) || busy || !online}
              onClick={verifyCode}
              data-testid="pin-forgot-verify"
            >
              Verify code
            </Button>
            <div className="mt-3 flex justify-between text-[14px]">
              <Button variant="ghost" size="sm" disabled={cooling || busy} onClick={reSend}>
                {`Resend code${cool > 0 ? ` (${cool}s)` : ""}`}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => router.replace("/pin")}>
                Back to PIN
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[15px] text-ink3">
            Identity confirmed. Set a fresh PIN for {email}.
          </p>
          <Card className="mt-6 px-4 py-4">
            <Input
              label="New PIN"
              value={pin}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="4+ digits"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              type="password"
              data-testid="pin-forgot-new"
            />
            <Input
              label="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder="Repeat PIN"
              inputMode="numeric"
              maxLength={8}
              type="password"
              error={pin !== confirm ? "PINs do not match" : undefined}
              className={pin !== confirm ? "border-danger/50" : undefined}
              data-testid="pin-forgot-confirm"
            />
          </Card>
          <Button className="mt-4 h-12 rounded-full" size="lg" block loading={busy} onClick={savePin} data-testid="pin-forgot-save">
            Save new PIN
          </Button>
        </>
      )}
      {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
    </div>
  );
}
