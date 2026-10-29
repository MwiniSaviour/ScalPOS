"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, ShieldCheck } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePos } from "@/lib/store";
import { setSessionUnlocked, usePinLock, verifyPin } from "@/lib/pin";

/**
 * App-lock management: set, change or remove the device PIN without
 * re-running onboarding (which is hidden once a shop exists).
 */
export default function SecurityScreen() {
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const { hasPin, setPin, clearPin } = usePinLock();
  const pined = hasPin();

  const [current, setCurrent] = useState("");
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateNew(): string | null {
    if (pin.trim().length < 4) return "PIN must be at least 4 digits.";
    if (pin.trim().length > 8) return "PIN can be at most 8 digits.";
    if (!/^\d+$/.test(pin.trim())) return "Use digits only.";
    if (pin !== confirm) return "PINs do not match.";
    return null;
  }

  async function checkCurrent(): Promise<boolean> {
    if (!pined) return true;
    if (!current.trim()) {
      setError("Enter your current PIN.");
      return false;
    }
    const ok = await verifyPin(current.trim());
    if (!ok) setError("That PIN wasn't recognised.");
    return ok;
  }

  async function save() {
    setError(null);
    const problem = validateNew();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy("save");
    try {
      if (!(await checkCurrent())) return;
      await setPin(pin.trim());
      setSessionUnlocked(true);
      toast(pined ? "PIN updated" : "PIN set", "ok");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your PIN.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    try {
      if (!(await checkCurrent())) return;
      clearPin();
      setSessionUnlocked(true);
      toast("App lock turned off", "warn");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove your PIN.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="anim-fade px-5 pt-4 pb-32">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          App lock
        </h1>
      </header>

      <Card className="mt-5 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent">
            {pined ? <ShieldCheck className="size-[20px]" /> : <Lock className="size-[20px]" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold text-ink">
              {pined ? "PIN is on" : "No PIN yet"}
            </div>
            <p className="mt-0.5 text-[14px] leading-5 text-ink3">
              {pined
                ? "The PIN is asked every time the app starts. You can change it or turn it off below."
                : "Set a PIN to keep casual eyes off the register. It is asked every time the app starts."}
            </p>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">{pined ? "Change PIN" : "Set a PIN"}</h2>
        <Card className="mt-2.5 space-y-3 px-4 py-4">
          {pined && (
            <Input
              label="Current PIN"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••"
              inputMode="numeric"
              maxLength={8}
              type="password"
              data-testid="pin-current"
            />
          )}
          <Input
            label="New PIN"
            value={pin}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder="4–8 digits"
            inputMode="numeric"
            maxLength={8}
            type="password"
            data-testid="pin-new"
          />
          <Input
            label="Confirm PIN"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat PIN"
            inputMode="numeric"
            maxLength={8}
            type="password"
            data-testid="pin-confirm"
          />
        </Card>
        {error && <p className="mt-2.5 text-[14px] text-danger">{error}</p>}
        <Button
          className="mt-4 h-12 rounded-full"
          size="lg"
          block
          loading={busy === "save"}
          disabled={busy !== null}
          onClick={save}
          data-testid="pin-save"
        >
          {pined ? "Update PIN" : "Set PIN"}
        </Button>
      </section>

      {pined && (
        <section className="mt-6">
          <h2 className="text-[15px] font-medium text-ink2">Turn off app lock</h2>
          <Card className="mt-2.5 px-4 py-4">
            <p className="text-[14px] leading-5 text-ink3">
              The register will open without a PIN. You can turn it back on at any time.
            </p>
          </Card>
          <Button
            className="mt-4 h-12 rounded-full"
            size="lg"
            variant="danger"
            block
            loading={busy === "remove"}
            disabled={busy !== null}
            onClick={remove}
            data-testid="pin-remove"
          >
            Turn off PIN
          </Button>
        </section>
      )}
    </div>
  );
}
