"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, TextArea } from "@/components/ui/input";
import { ReceiptPreview } from "@/components/receipt/receipt-preview";
import { CURRENCY_SYMBOL } from "@/lib/money";
import { useSettings, usePos } from "@/lib/store";
import { ChevronLeft } from "lucide-react";
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
      <section className="mt-6 pb-32">
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
              placeholder="Bright Corner Stores"
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
