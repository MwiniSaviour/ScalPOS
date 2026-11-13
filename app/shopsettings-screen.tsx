"use client";

import { Button, IconButton } from "@/components/ui/button";
import {
  BusinessTypePicker,
  businessTypeLabel,
} from "@/components/ui/business-type-picker";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Input, TextArea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import {
  isFoodVendor,
  restaurantSetup,
  restaurantSetupFor,
} from "@/lib/restaurant";
import { ReceiptPreview } from "@/components/receipt/receipt-preview";
import { CURRENCY_SYMBOL } from "@/lib/money";
import { useSettings, usePos } from "@/lib/store";
import type { BusinessType } from "@/lib/types";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShopSettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = usePos((s) => s.updateSettings);
  const toast = usePos((s) => s.toast);

  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [footer, setFooter] = useState(settings.receiptFooter);
  const [nameError, setNameError] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [pendingType, setPendingType] = useState<BusinessType | null>(null);

  function chooseType(next: BusinessType) {
    setTypeOpen(false);
    if (next === settings.businessType) return;
    if (next === "retail") {
      updateSettings({ businessType: next, restaurantConfig: undefined });
      toast(`Business type changed to ${businessTypeLabel(next)}`);
      return;
    }
    setPendingType(next);
  }

  function confirmTypeChange() {
    if (!pendingType) return;
    updateSettings({
      businessType: pendingType,
      ...(pendingType === "restaurant"
        ? { restaurantConfig: restaurantSetup() }
        : { restaurantConfig: undefined }),
    });
    toast(`Business type changed to ${businessTypeLabel(pendingType)}`);
    setPendingType(null);
  }

  function save() {
    if (!shopName.trim()) {
      setNameError("Shop name is required");
      return;
    }
    updateSettings({
      shopName: shopName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      receiptFooter: footer.trim(),
    });
    toast("Shop details saved");
    router.back();
  }

  return (
    <div className="anim-fade px-5 pt-4">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Shop details
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">Appears on every receipt</p>

      {/* receipt preview */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Receipt preview</h2>
        <Card className="mt-2.5 p-4">
          <ReceiptPreview
            shopName={shopName.trim()}
            address={address.trim()}
            phone={phone.trim()}
            footer={footer.trim()}
          />
        </Card>
      </section>

      {/* details */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Details</h2>
        <Card className="mt-2.5 px-4 py-4">
          <div className="flex flex-col gap-3.5">
            <Input
              label="Shop name"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Community mini mart"
              error={nameError || undefined}
            />
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="024 000 0000"
              inputMode="tel"
              hint={`Shown on receipts with the ${CURRENCY_SYMBOL} totals and MoMo number`}
            />
            <TextArea
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area, city"
              className="[&_textarea]:min-h-[88px]"
            />
            <TextArea
              label="Receipt footer"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Thanks for shopping with us!"
              hint="Printed at the bottom of every receipt."
              className="[&_textarea]:min-h-[72px]"
            />
          </div>
        </Card>
      </section>

      {/* business type */}
      <section className="mt-6 pb-32">
        <h2 className="text-[15px] font-medium text-ink2">Business</h2>
        <Card inset className="mt-2.5">
          <button
            type="button"
            onClick={() => setTypeOpen(true)}
            className="press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <Store className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold text-ink">Business type</span>
              <span className="block truncate text-[14px] text-ink3">
                {businessTypeLabel(settings.businessType)} · sets wording and tools
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink3" />
          </button>
        </Card>
        {settings.businessType === "restaurant" && (
          <Card className="mt-2.5 px-4 py-4">
            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-[17px] font-semibold text-ink">Service style</span>
                <span className="block text-[14px] text-ink3">How customers order</span>
              </div>
              <Segmented
                value={isFoodVendor(settings.restaurantConfig) ? "vendor" : "full"}
                onChange={(v) => {
                  const next = restaurantSetupFor(v === "vendor");
                  updateSettings({ restaurantConfig: next });
                  toast(v === "vendor" ? "Takeaway only — tables hidden" : "Dine-in & tables enabled");
                }}
                options={[
                  { value: "full", label: "Dine-in & tables" },
                  { value: "vendor", label: "Takeaway only" },
                ]}
              />
              <p className="text-[14px] leading-5 text-ink3">
                {isFoodVendor(settings.restaurantConfig)
                  ? "Counter pickup only — no table map or open tickets."
                  : "Tables and open tabs on the register and kitchen board."}
              </p>
            </div>
          </Card>
        )}
      </section>

      <Sheet open={typeOpen} onClose={() => setTypeOpen(false)} height="auto" title="Business type">
        <p className="mb-3 text-[14px] leading-5 text-ink3">
          Sets the wording and tools across the app. Your data stays as it is.
        </p>
        <BusinessTypePicker value={settings.businessType} onChange={chooseType} className="pb-2" />
      </Sheet>

      <Confirm
        open={pendingType !== null}
        onClose={() => setPendingType(null)}
        onConfirm={confirmTypeChange}
        title={pendingType ? `Switch to ${businessTypeLabel(pendingType)}?` : "Change business type?"}
        body="Specialized pages for this type will unlock and terminology across the app will change. Your existing products, customers and orders stay exactly as they are."
        confirmLabel="Change type"
      />

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-line bg-surface px-4 pt-3 pb-[calc(var(--nova-sab)+12px)]">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" block onClick={() => router.back()}>
            Cancel
          </Button>
          <Button block onClick={save}>
            Save
          </Button>
        </div>
      </footer>
    </div>
  );
}
