"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePos } from "@/lib/store";
import { createStaff, setCurrentStaff } from "@/lib/staff";
import { markOnboarded, useHasOnboarded } from "@/lib/first-run";
import { savePin, setSessionUnlocked } from "@/lib/pin";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

const SHOP_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShopCreateScreen() {
  const router = useRouter();
  const toast = usePos((s) => s.toast);
  const updateSettings = usePos((s) => s.updateSettings);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onboarded = useHasOnboarded();
  const [email, setEmail] = useState("");

  const shopNameOk = shopName.trim().length > 0;
  const ownerNameOk = ownerName.trim().length > 0;
  const pinOk = pin.trim().length >= 4 && pin === confirm;
  const emailTrim = email.trim();
  const emailOk = emailTrim === "" || SHOP_EMAIL_RE.test(emailTrim);

  function handleBack() {
    router.back();
  }

  async function submit() {
    if (!shopNameOk || !ownerNameOk || !pinOk) {
      setError("Shop name, owner name and a 4+ digit PIN (confirmed) are required.");
      return;
    }
    if (emailTrim && !emailOk) {
      setError("Enter a valid email address or leave it empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Owner is the first member of the shop — device-local, no email needed.
      const owner = createStaff({ name: ownerName.trim(), phone: phone.trim(), role: "owner" });
      setCurrentStaff(owner.id);

      // 2. Shop settings (receipts, MoMo).
      updateSettings({
        shopName: shopName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        ownerId: owner.name.trim(),
      });

      // 3. Persist the PIN so the next launch asks for it.
      await savePin(pin.trim());
      markOnboarded();

      // 4. Unlock this session; the PIN prompt returns on later launches.
      setSessionUnlocked(true);
      toast("Shop created — protected with your PIN");

      if (emailTrim) {
        // The code screen owns sign-up creation and sends the single
        // verification email, so this shop is never double-registered.
        router.push(`/auth/code?email=${encodeURIComponent(emailTrim)}&new=1&from=shop-create`);
        return;
      }

      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create your shop.");
    } finally {
      setBusy(false);
    }
  }


  // An existing shop is detected silently: route straight into it instead of
  // showing a "shop already exists" interstitial to first-time installers.
  useEffect(() => {
    if (onboarded) router.replace("/home");
  }, [onboarded, router]);

  if (onboarded) return null;

  return (
    <div className="anim-fade px-5 pt-4 pb-[calc(var(--nova-sab)+110px)]">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={handleBack} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Create your shop
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">
        Everything is saved on this device. Add an email later to unlock cloud sync from Settings.
      </p>

      <Card className="mt-6 px-4 py-4">
        <div className="flex flex-col gap-4">
          <Input
            label="Shop name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g. Community mini mart"
            error={!shopNameOk ? "Shop name is required" : undefined}
            leading={<span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/10"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg></span>}
          />
          <TextArea
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, area, city"
            className="[&_textarea]:min-h-[88px]"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024 000 0000"
            inputMode="tel"
            hint="Shown on receipts and for MoMo"
          />
          <Input
            label="Owner name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Ama Serwaa"
            error={!ownerNameOk ? "Owner name is required" : undefined}
          />
          <Input
            label="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="shop@example.com"
            inputMode="email"
            hint="Add an email to create a shop account and enable cloud sync."
            error={emailTrim && !emailOk ? "Enter a valid email address" : undefined}
          />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink2">PIN</p>
            <p className="mb-2 text-[13px] text-ink3">
              Used to unlock the shop on this device — 4+ digits, no letters.
            </p>
            <div className="flex gap-2">
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                inputMode="numeric"
                maxLength={8}
                type={show ? "text" : "password"}
                error={
                  pin !== confirm
                    ? pin.length < 4
                      ? "PIN must be 4+ digits"
                      : undefined
                    : undefined
                }
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
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm PIN"
                inputMode="numeric"
                maxLength={8}
                type={show ? "text" : "password"}
              />
            </div>
            {pin !== confirm && pin.length > 0 && (
              <p className="mt-1 text-[12px] text-danger">PINs do not match</p>
            )}
          </div>
        </div>
      </Card>

      <p className="mt-5 text-center text-[14px] text-ink3">
        Have a ScalPOS account?{" "}
        <button
          type="button"
          onClick={() => router.push("/connect")}
          className="font-medium text-accent press"
        >
          Sign in to link this device
        </button>
      </p>

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-line bg-surface px-4 pt-3 pb-[calc(var(--nova-sab)+12px)]">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" block onClick={handleBack}>
            Cancel
          </Button>
          <Button
            block
            loading={busy}
            disabled={!shopNameOk || !ownerNameOk || !pinOk || busy}
            onClick={submit}
          >
            Create shop
          </Button>
        </div>
        {error && <p className="mt-2 text-[14px] text-danger">{error}</p>}
      </footer>
    </div>
  );
}

