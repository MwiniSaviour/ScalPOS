"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, TextArea } from "@/components/ui/input";
import { ReceiptPreview } from "@/components/receipt/receipt-preview";
import { ScreenHeader } from "@/components/shell/screenheader";
import { CURRENCY_SYMBOL } from "@/lib/money";
import { useSettings, usePos } from "@/lib/store";
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
    <div className="anim-fade">
      <ScreenHeader title="Shop details" onBack />

      <section className="px-4 pb-3">
        <Card className="p-4">
          <div className="pb-3 text-[12px] font-semibold uppercase tracking-[.07em] text-ink3">Preview</div>
          <ReceiptPreview
            shopName={shopName.trim()}
            address={address.trim()}
            phone={phone.trim()}
            footer={footer.trim()}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-3.5 px-4 pb-28">
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
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-line bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
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
