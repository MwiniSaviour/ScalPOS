"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReceiptPreview } from "@/components/receipt/receipt-preview";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Segmented } from "@/components/ui/segmented";
import { useSettings, usePos } from "@/lib/store";
import { ChevronRight, Lock, Moon, Percent, Smartphone, Store, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

/** Ghana's standard VAT rate — only used when the shop turns tax on for the first time. */
const DEFAULT_TAX_RATE = 15;

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = usePos((s) => s.updateSettings);
  const toast = usePos((s) => s.toast);

  return (
    <div className="anim-fade">
      <ScreenHeader title="Settings" onBack />

      {/* appearance */}
      <section className="px-4 pb-4">
        <Card inset>
          <ThemeRows theme={settings.theme} onChange={(theme) => updateSettings({ theme })} />
        </Card>
      </section>

      {/* business */}
      <section className="px-4 pb-4">
        <Card inset>
          <Link href="/settings/shop" className="press flex min-h-[52px] items-center gap-3 px-4 py-3 hover:bg-surface2/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink2">
              <Store className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">Shop details</span>
              <span className="block truncate text-[12px] text-ink3">
                {settings.shopName} · {settings.phone || "No phone"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink4" />
          </Link>
        </Card>
      </section>

      {/* receipt — read-only echo, edited in Shop details */}
      <section className="px-4 pb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="text-[12px] font-semibold uppercase tracking-[.07em] text-ink3">Receipt</div>
            <Link
              href="/settings/shop"
              className="press inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-accent hover:bg-surface2"
            >
              Edit
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <ReceiptPreview
            shopName={settings.shopName}
            address={settings.address}
            phone={settings.phone}
            footer={settings.receiptFooter}
          />
          <p className="mt-2.5 text-[12px] leading-5 text-ink3">
            Shop name, contact details and the receipt footer are edited under Shop details.
          </p>
        </Card>
      </section>

      {/* payments */}
      <section className="px-4 pb-4">
        <Card className="p-4">
          <div className="flex items-center gap-2.5 pb-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Smartphone className="size-[18px]" />
            </span>
            <div className="text-[12px] font-semibold uppercase tracking-[.07em] text-ink3">MoMo payments</div>
          </div>
          <Input
            label="Merchant MoMo number"
            value={settings.momoNumber}
            onChange={(e) => updateSettings({ momoNumber: e.target.value })}
            placeholder="024 000 0000"
            inputMode="tel"
          />
          <div className="mt-3">
            <div className="mb-1.5 text-[13px] font-medium text-ink2">Network</div>
            <Segmented
              value={NETWORKS.find((n) => settings.momoNetwork.startsWith(n)) ?? "MTN"}
              onChange={(network) => updateSettings({ momoNetwork: network })}
              options={[
                { value: "MTN", label: "MTN" },
                { value: "Vodafone", label: "Vodafone" },
                { value: "AirtelTigo", label: "AirtelTigo" },
              ]}
            />
          </div>
          <p className="mt-2.5 text-[12px] leading-5 text-ink3">
            Customers can transfer to this number with *170# — you&apos;ll get an SMS to confirm before serving.
          </p>
        </Card>
      </section>

      {/* tax */}
      <section className="px-4 pb-4">
        <TaxCard />
      </section>

      {/* currency */}
      <section className="px-4 pb-28">
        <Card inset>
          <div className="flex min-h-[52px] items-center gap-3 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Lock className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">Currency</span>
              <span className="block text-[12px] text-ink3">GHS — Ghana Cedi ₵ built in, not changeable</span>
            </span>
            <Lock className="size-4 shrink-0 text-ink4" />
          </div>
        </Card>
      </section>

      {/* save footer */}
      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-line bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" block onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            block
            onClick={() => {
              toast("Settings saved");
              router.back();
            }}
          >
            Save
          </Button>
        </div>
      </footer>
    </div>
  );
}

function ThemeRows({ theme, onChange }: { theme: "dark" | "light"; onChange: (t: "dark" | "light") => void }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink2/10 text-ink2">
            {theme === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
          </span>
          <div>
            <div className="text-[14px] font-semibold text-ink">Appearance</div>
            <div className="text-[12px] text-ink3">Applies instantly across the app</div>
          </div>
        </div>
      </div>
      <Segmented
        className="mt-3"
        value={theme}
        onChange={onChange}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
        ]}
      />
    </div>
  );
}

/**
 * Tax is off until the shop turns it on: the rate is stored as a percentage and
 * 0 means "no tax", which is the state every existing register is already in.
 */
function TaxCard() {
  const settings = useSettings();
  const updateSettings = usePos((s) => s.updateSettings);
  const [rateStr, setRateStr] = useState<string | null>(null);
  // The switch is local UI state: typing "0" in the rate must not make the
  // rate field disappear mid-edit, and turning tax on must not silently
  // re-price a shop whose prices already include tax.
  const [taxOn, setTaxOn] = useState(settings.taxRate > 0);

  const rate = rateStr ?? String(settings.taxRate > 0 ? settings.taxRate : DEFAULT_TAX_RATE);
  const committedRate = settings.taxRate;

  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 100) / 100));

  const commitRate = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    updateSettings({ taxRate: clamp(n) });
  };

  const setOn = (next: boolean) => {
    setTaxOn(next);
    if (!next) {
      updateSettings({ taxRate: 0 });
      return;
    }
    const n = parseFloat(rate);
    updateSettings({ taxRate: Number.isFinite(n) ? clamp(n) : DEFAULT_TAX_RATE });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5 pb-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
          <Percent className="size-[18px]" />
        </span>
        <div className="text-[12px] font-semibold uppercase tracking-[.07em] text-ink3">Tax</div>
      </div>
      <Segmented
        value={taxOn ? "on" : "off"}
        onChange={(v) => setOn(v === "on")}
        options={[
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ]}
      />
      {taxOn && (
        <>
          <Input
            className="mt-3"
            label="Tax rate (%)"
            value={rate}
            onChange={(e) => {
              setRateStr(e.target.value);
              commitRate(e.target.value);
            }}
            onBlur={() => setRateStr(null)}
            inputMode="decimal"
            hint={
              committedRate > 0
                ? "Charged on the subtotal after discount."
                : "0% means no tax is charged."
            }
          />
          <div className="mb-1.5 mt-3 text-[13px] font-medium text-ink2">Tax applies</div>
          <Segmented
            value={settings.taxInclusive ? "incl" : "excl"}
            onChange={(v) => updateSettings({ taxInclusive: v === "incl" })}
            options={[
              { value: "excl", label: "Add at checkout" },
              { value: "incl", label: "Already in price" },
            ]}
          />
          <p className="mt-2.5 text-[12px] leading-5 text-ink3">
            {settings.taxInclusive
              ? "Prices already include tax — it is printed on the receipt but never added again."
              : "Tax is added on top of the subtotal after discount and is charged at checkout."}
          </p>
        </>
      )}
      {!taxOn && (
        <p className="mt-2.5 text-[12px] leading-5 text-ink3">
          No tax is charged. Totals are exactly the subtotal after discount.
        </p>
      )}
    </Card>
  );
}
