"use client";

import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import {
  clearSavedPrinter,
  getSavedPrinter,
  listPaired,
  printRaw,
  savePrinter,
  type PrinterDevice,
} from "@/lib/bluetooth";
import { receiptToEscposBytes, type ReceiptPrintData } from "@/lib/escpos-print";
import { dateShort, timeOf } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { dueOf, paidOf, usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import type { Order, PaymentMethod, Settings } from "@/lib/types";
import { Printer, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
  credit: "Credit",
};

/**
 * Print isolation. The app chrome cannot be edited from this module, so the
 * receipt is rendered a second time into a print-only container and the rest
 * of the page is hidden while the receipt sheet is open.
 */
const PRINT_CSS = `@media print {
  body.nova-receipt-open * { visibility: hidden !important; }
  body.nova-receipt-open .nova-receipt-print,
  body.nova-receipt-open .nova-receipt-print * { visibility: visible !important; }
  .nova-receipt-print {
    display: block !important;
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
  .nova-receipt-print .receipt-paper,
  .nova-receipt-print .receipt-rule { border-color: var(--ink3) !important; }
}`;

/**
 * Tax carried by an order. Orders persisted before tax existed have no `tax`
 * field, so they render exactly as before (no tax line).
 */
export function orderTax(order: Order): { amount: number; label: string } | null {
  const amount = order.tax ?? 0;
  if (!(amount > 0)) return null;
  const net = order.subtotal - order.discount;
  // the tax was added to the total unless the total is still the net amount
  const added = Math.abs(order.total - (net + amount)) < 0.005;
  return { amount, label: added ? "Tax" : "Tax (incl.)" };
}

/**
 * Plain-text receipt — this is what the shop copies and sends to the customer,
 * so it must carry the same information as the printed receipt: shop details,
 * subtotal, discount, tax, total, payments and the balance.
 */
export function receiptText(order: Order, settings?: Settings): string {
  const paid = paidOf(order);
  const due = dueOf(order);
  const tax = orderTax(order);
  const lines: string[] = [];
  if (settings) {
    lines.push(settings.shopName);
    if (settings.address?.trim()) lines.push(settings.address.trim());
    if (settings.phone?.trim()) lines.push(settings.phone.trim());
    if (settings.momoNumber?.trim()) {
      lines.push(`MoMo ${settings.momoNumber.trim()}${settings.momoNetwork ? ` (${settings.momoNetwork})` : ""}`);
    }
    lines.push("");
  }
  lines.push("ScalPOS receipt");
  lines.push(order.id);
  lines.push(`${dateShort(order.createdAt)} ${timeOf(order.createdAt)}`);
  lines.push("");
  for (const i of order.items) lines.push(`${i.name} × ${i.qty} — ${fmtMoney(i.price * i.qty)}`);
  lines.push("");
  lines.push(`Subtotal ${fmtMoney(order.subtotal)}`);
  if (order.discount > 0) lines.push(`Discount -${fmtMoney(order.discount)}`);
  if (tax) lines.push(`${tax.label} ${fmtMoney(tax.amount)}`);
  lines.push(`Total ${fmtMoney(order.total)}`);
  for (const p of order.payments) {
    lines.push(`Paid (${METHOD_LABEL[p.method] ?? p.method}) ${fmtMoney(p.amount)}`);
  }
  if (order.payments.length === 0) lines.push(`Paid ${fmtMoney(paid)}`);
  lines.push(due > 0 ? `Balance due ${fmtMoney(due)}` : "Fully paid");
  if (settings?.receiptFooter?.trim()) {
    lines.push("");
    lines.push(settings.receiptFooter.trim());
  }
  return lines.join("\n");
}

export function Receipt({
  order,
  settings,
  className,
}: {
  order: Order;
  settings: Settings;
  className?: string;
}) {
  const due = dueOf(order);
  const tax = orderTax(order);

  return (
    <div
      className={cn(
        "receipt-paper mx-auto w-full max-w-[360px] rounded-2xl border border-line bg-surface px-4 py-5 text-ink",
        className,
      )}
    >
      <div className="text-center">
        <p className="text-[16px] font-bold leading-6 text-ink">{settings.shopName}</p>
        {settings.address && (
          <p className="mt-1 text-[12px] leading-5 text-ink2">{settings.address}</p>
        )}
        {settings.phone && (
          <p className="tabnum text-[12px] leading-5 text-ink2">{settings.phone}</p>
        )}
        {settings.momoNumber && (
          <p className="tabnum text-[12px] leading-5 text-ink3">
            MoMo {settings.momoNumber} · {settings.momoNetwork}
          </p>
        )}
        {order.status === "refunded" && (
          <p className="mt-2 text-[12px] font-bold uppercase tracking-[.08em] text-ink3">
            Refunded
          </p>
        )}
      </div>

      <div className="receipt-rule my-3 border-t border-dashed border-line" />

      <div className="flex items-start justify-between gap-3 text-[12px] leading-5 text-ink3">
        <span className="tabnum">{order.id}</span>
        <span className="tabnum text-right">
          {dateShort(order.createdAt)} · {timeOf(order.createdAt)}
        </span>
      </div>

      <div className="receipt-rule my-3 border-t border-dashed border-line" />

      <div className="flex flex-col gap-1.5">
        {order.items.map((i) => (
          <div
            key={`${i.productId}-${i.name}`}
            className="flex items-start justify-between gap-3"
          >
            <span className="min-w-0 flex-1 text-[13px] leading-5 text-ink">
              {i.name} <span className="text-ink3">× {i.qty}</span>
            </span>
            <span className="tabnum shrink-0 text-[13px] leading-5 font-semibold text-ink">
              {fmtMoney(i.price * i.qty)}
            </span>
          </div>
        ))}
      </div>

      <div className="receipt-rule my-3 border-t border-dashed border-line" />

      <div className="flex flex-col gap-1.5">
        <Line label="Subtotal" value={fmtMoney(order.subtotal)} />
        {order.discount > 0 && (
          <Line label="Discount" value={`−${fmtMoney(order.discount)}`} tone="accent" />
        )}
        {tax && <Line label={tax.label} value={fmtMoney(tax.amount)} />}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-bold text-ink">Total</span>
        <span className="tabnum text-[18px] font-extrabold text-ink">
          {fmtMoney(order.total)}
        </span>
      </div>

      {(order.payments.length > 0 || due > 0) && (
        <>
          <div className="receipt-rule my-3 border-t border-dashed border-line" />
          <div className="flex flex-col gap-1.5">
            {order.payments.map((p) => (
              <Line key={p.id} label={METHOD_LABEL[p.method]} value={fmtMoney(p.amount)} />
            ))}
            {due > 0 && <Line label="Balance due" value={fmtMoney(due)} tone="warn" />}
          </div>
        </>
      )}

      {settings.receiptFooter.trim() && (
        <>
          <div className="receipt-rule my-3 border-t border-dashed border-line" />
          <p className="text-center text-[12px] leading-5 text-ink3">
            {settings.receiptFooter.trim()}
          </p>
        </>
      )}

      <p className="mt-3 text-center text-[13px] font-bold text-ink">
        Thank you for your purchase.
      </p>
    </div>
  );
}

export function receiptToPrintData(order: Order, settings: Settings): ReceiptPrintData {
  const due = dueOf(order);
  const tax = orderTax(order);
  return {
    shopName: settings.shopName,
    address: settings.address?.trim() ?? "",
    phone: settings.phone?.trim() ?? "",
    momo: settings.momoNumber?.trim()
      ? `MoMo ${settings.momoNumber.trim()}${
          settings.momoNetwork?.trim() ? ` - ${settings.momoNetwork.trim()}` : ""
        }`
      : "",
    refunded: order.status === "refunded",
    orderId: order.id,
    orderDate: `${dateShort(order.createdAt)} - ${timeOf(order.createdAt)}`,
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      amount: fmtMoney(i.price * i.qty),
    })),
    subtotal: fmtMoney(order.subtotal),
    discount: order.discount > 0 ? fmtMoney(order.discount) : null,
    tax: tax ? { label: tax.label, amount: fmtMoney(tax.amount) } : null,
    total: fmtMoney(order.total),
    payments: order.payments.map((p) => ({
      label: METHOD_LABEL[p.method] ?? p.method,
      amount: fmtMoney(p.amount),
    })),
    balance: due > 0 ? fmtMoney(due) : null,
    footer: settings.receiptFooter.trim(),
  };
}

export function ReceiptSheet({
  open,
  onClose,
  order,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  settings: Settings;
}) {
  const toast = usePos((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [savedPrinter, setSavedPrinter] = useState<PrinterDevice | null>(null);
  const [devices, setDevices] = useState<PrinterDevice[] | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("nova-receipt-open");
    return () => document.body.classList.remove("nova-receipt-open");
  }, [open]);

  const share = async () => {
    const text = receiptText(order, settings);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Receipt ${order.id}`, text });
      } catch {
        /* share sheet dismissed */
      }
      return;
    }
    // Android WebView has no Web Share API — copy the receipt so the shop can
    // paste it into WhatsApp/SMS instead of failing silently.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast("Receipt copied to the clipboard", "ok");
        return;
      }
    } catch {
      /* clipboard blocked */
    }
    toast("Copy the receipt text from the screen", "warn");
  };

  const sendToPrinter = async (printer: PrinterDevice) => {
    if (busy) return;
    setBusy(true);
    try {
      await printRaw(printer.address, receiptToEscposBytes(receiptToPrintData(order, settings)));
      toast("Receipt sent to printer", "ok");
    } catch {
      toast(`Couldn't reach ${printer.name} — make sure the printer is on/paired`, "error");
    } finally {
      setBusy(false);
    }
  };

  const openPicker = async () => {
    setPickOpen(true);
    setDevices(null);
    try {
      const list = await listPaired();
      setDevices(list);
      if (list.length === 0) toast("No paired Bluetooth printers found", "warn");
    } catch (error) {
      setDevices([]);
      toast(
        error instanceof Error ? error.message : "Bluetooth is not available",
        "error",
      );
    }
  };

  const pickPrinter = (device: PrinterDevice) => {
    savePrinter(device);
    setSavedPrinter(device);
    setPickOpen(false);
    void sendToPrinter(device);
  };

  const disconnectPrinter = () => {
    clearSavedPrinter();
    setSavedPrinter(null);
  };

  const print = () => {
    if (!isNative) {
      if (typeof window === "undefined" || typeof window.print !== "function") {
        toast("Printing is not available on this device", "warn");
        return;
      }
      const previous = document.title;
      document.title = receiptText(order, settings);
      try {
        window.print();
      } finally {
        document.title = previous;
      }
      return;
    }
    const saved = getSavedPrinter();
    setSavedPrinter(saved);
    if (saved) {
      void sendToPrinter(saved);
      return;
    }
    void openPicker();
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <Sheet
        open={open}
        onClose={onClose}
        title="Receipt"
        height="tall"
        footer={
          <div className="grid gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                icon={<Printer className="size-4" />}
                onClick={print}
                loading={busy}
                disabled={busy}
                data-testid="print-bt"
              >
                Print
              </Button>
              <Button icon={<Share2 className="size-4" />} onClick={share}>
                Share
              </Button>
            </div>
            {isNative && savedPrinter && (
              <button
                onClick={disconnectPrinter}
                className="press h-9 w-full rounded-lg text-[13px] font-medium text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Disconnect printer ({savedPrinter.name})
              </button>
            )}
          </div>
        }
      >
        <Receipt order={order} settings={settings} className="mb-2" />
      </Sheet>
      <Sheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Choose printer"
        height="auto"
      >
        {devices === null ? (
          <p className="pb-4 text-[14px] text-ink2">Looking for paired devices…</p>
        ) : devices.length === 0 ? (
          <p className="pb-4 text-[14px] text-ink2">
            No paired devices. Pair the printer in Android settings first.
          </p>
        ) : (
          <div className="flex flex-col pb-4">
            {devices.map((d) => (
              <button
                key={d.address}
                data-testid="printer-row"
                onClick={() => pickPrinter(d)}
                className="press -mx-1 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-surface3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                  {d.name}
                </span>
                <span className="shrink-0 text-[12px] text-ink3">{d.address}</span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
      {open && (
        <div className="nova-receipt-print hidden" data-theme="light" aria-hidden="true">
          <Receipt order={order} settings={settings} />
        </div>
      )}
    </>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "warn";
}) {
  const labelClass = cn(
    "text-[13px] leading-5",
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-ink2",
  );
  const valueClass = cn(
    "tabnum text-[13px] leading-5 font-semibold",
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-ink",
  );
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
