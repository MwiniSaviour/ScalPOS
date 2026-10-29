"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePos } from "@/lib/store";
import { setSessionUnlocked, usePinLock, sessionUnlocked } from "@/lib/pin";
import { Lock, ClockCheck, Eye, EyeOff } from "lucide-react";

export default function PinScreen({ inline = false }: { inline?: boolean }) {
  const router = useRouter();

  const shopName = usePos((s) => s.settings.shopName);
  const { unlocked, attemptPin, setPin, hasPin } = usePinLock();
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  // Standalone /pin route: on unlock return to content. When the gate renders
  // this inline, unlocking already swaps the screen in place — stay put.
  useEffect(() => {
    if (unlocked && !inline) router.replace("/");
  }, [unlocked, inline, router]);

  if (sessionUnlocked()) return null;

  async function onAttempt() {
    setError(null);
    if (!pin.trim()) return;
    const ok = await attemptPin(pin.trim());
    if (!ok) setError("That PIN wasn't recognised.");
  }

  async function onSet() {
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
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your PIN.");
    }
  }

  const isPined = hasPin();

  if (isPined) {
    return (
      <div className="anim-fade flex min-h-dvh flex-col items-center px-5 py-10 text-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Lock className="size-6 text-accent" />
        </div>
        <h1 className="mt-5 text-[26px]/7 font-bold text-ink">Enter your PIN</h1>
        <p className="mt-1 text-[15px] text-ink3">
          Type your PIN to continue to {shopName}.
        </p>
        <Card className="mt-6 px-4 py-4">
          <Input
            label="PIN"
            value={pin}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder="••••"
            inputMode="numeric"
            maxLength={8}
            autoFocus
            type={show ? "text" : "password"}
            trailing={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="press text-ink3"
                aria-label={show ? "Hide PIN" : "Show PIN"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
        </Card>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={onAttempt} block>
            Unlock
          </Button>
          <Button variant="ghost" size="md" block onClick={() => router.replace("/pin/forgot")} data-testid="pin-forgot">
            Forgot PIN?
          </Button>
          {error && <p className="text-[14px] text-danger">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col items-center px-5 py-10 text-center">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/10">
        <ClockCheck className="size-6 text-accent" />
      </div>
      <h1 className="mt-5 text-[26px]/7 font-bold text-ink">Set your PIN</h1>
      <p className="mt-1 text-[15px] text-ink3">
        Choose a PIN to lock {shopName} on this device.
      </p>
      <Card className="mt-6 px-4 py-4">
        <Input
          label="PIN"
          value={pin}
          onChange={(e) => setPinValue(e.target.value)}
          placeholder="4+ digits"
          inputMode="numeric"
          maxLength={8}
          autoFocus
          type={show ? "text" : "password"}
          trailing={
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="press text-ink3"
              aria-label={show ? "Hide PIN" : "Show PIN"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <Input
          label="Confirm PIN"
          value={confirm}
          onChange={(e) => setConfirmValue(e.target.value)}
          placeholder="Repeat PIN"
          inputMode="numeric"
          maxLength={8}
          type={show ? "text" : "password"}
          error={pin !== confirm ? "PINs do not match" : undefined}
          className={pin !== confirm ? "border-danger/50" : undefined}
        />
      </Card>
      <div className="mt-4 flex flex-col gap-2">
        <Button onClick={onSet} block>
          Create shop &amp; continue
        </Button>
        {error && <p className="text-[14px] text-danger">{error}</p>}
      </div>
    </div>
  );
}


