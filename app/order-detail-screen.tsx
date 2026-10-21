"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Segmented } from "@/components/ui/segmented";
import { NumberPad } from "@/components/ui/numberpad";
import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/statuspill";
import { ScreenHeader } from "@/components/shell/screenheader";
import { ProductArt } from "@/components/ui/productart";
import { ReceiptSheet, orderTax } from "@/components/receipt/receipt";
import {
  Banknote,
  CreditCard,
  Receipt as ReceiptIcon,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { dateShort, timeOf } from "@/lib/format";
import { CURRENCY_SYMBOL, fmtMoney } from "@/lib/money";
import * as store from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";

const methodMeta: Record<PaymentMethod, { label: string; icon: ReactNode }> = {
  cash: { label: "Cash", icon: <Banknote className="size-4" /> },
  momo: { label: "MoMo", icon: <Smartphone className="size-4" /> },
  card: { label: "Card", icon: <CreditCard className="size-4" /> },
  credit: { label: "Credit", icon: <ReceiptIcon className="size-4" /> },
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const oid = params.get("id") ?? "";

  const hydrated = store.usePos((s) => s.hydrated);
  const orders = store.usePos((s) => s.orders);
  const customers = store.usePos((s) => s.customers);
  const settings = store.useSettings();
  const addPaymentsToOrder = store.usePos((s) => s.addPaymentsToOrder);
  const refundOrder = store.usePos((s) => s.refundOrder);

  const [refundOpen, setRefundOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amountStr, setAmountStr] = useState("");

  const order = hydrated ? orders.find((o) => o.id === oid) : undefined;
  const due = order ? store.dueOf(order) : 0;
  const payStatus = order ? store.payStatusOf(order) : null;
  const tax = order ? orderTax(order) : null;
  const canRecord = !!order && order.status !== "refunded" && due > 0;
  const customer = order?.customerId ? customers.find((c) => c.id === order.customerId) : undefined;

  const closePay = () => {
    setPayOpen(false);
    setAmountStr("");
  };

  const onDigit = (d: string) => {
    setAmountStr((cur) => {
      if (d === ".") {
        if (cur.includes(".")) return cur;
        return cur === "" ? "0." : cur + ".";
      }
      if (cur.length >= 9) return cur;
      return (cur === "0" ? "" : cur) + d;
    });
  };

  const onDelete = () => setAmountStr((cur) => cur.slice(0, -1));

  const savePayment = () => {
    if (!order) return;
    const amount = Math.round(parseFloat(amountStr || "0") * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return;
    addPaymentsToOrder(order.id, [{ method, amount }]);
    closePay();
  };

  if (!hydrated) return null;

  if (!order) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Order" onBack />
        <section className="px-5 pt-4">
          <EmptyState
            icon={<ReceiptIcon className="size-7" />}
            title="Order not found"
            hint="This order may have been removed."
            action={<Button onClick={() => router.push("/orders")}>Back to orders</Button>}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <ScreenHeader
        title={`Order ${order.id.slice(-4)}`}
        subtitle={`${dateShort(order.createdAt)} · ${timeOf(order.createdAt)}`}
        onBack
        right={
          order.status !== "refunded" ? (
            <IconButton label="Refund order" onClick={() => setRefundOpen(true)} className="text-danger">
              <Trash2 className="size-[19px]" />
            </IconButton>
          ) : (
            <StatusPill status="refunded" />
          )
        }
      />

      {due > 0 && order.status !== "refunded" && (
        <section className="px-5 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-warn/10 px-4 py-3.5 text-warn">
            <span>
              <span className="block text-[15px] font-medium">Balance due</span>
              <span className="tabnum block text-[20px]/7 font-bold">{fmtMoney(due)}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          </div>
        </section>
      )}

      <main className="flex flex-col gap-3 px-5 pt-3 pb-32">
        <Card inset>
          <CardTitle>{order.items.length} item{order.items.length === 1 ? "" : "s"}</CardTitle>
          {order.items.map((i) => (
            <div key={i.productId} className="flex items-center gap-3 px-4 py-3">
              <ProductArt imageUrl={i.imageUrl} name={i.name} className="size-10 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">
                  {i.name} <span className="text-ink3">× {i.qty}</span>
                </span>
                <span className="tabnum block text-[13px] text-ink3">@ {fmtMoney(i.price)}</span>
              </span>
              <span className="tabnum shrink-0 text-[15px] font-bold text-ink">{fmtMoney(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14px] text-ink3">Subtotal</span>
            <span className="tabnum text-[15px] font-semibold text-ink">{fmtMoney(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-ink3">Discount</span>
              <span className="tabnum text-[15px] font-semibold text-accent">−{fmtMoney(order.discount)}</span>
            </div>
          )}
          {tax && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-ink3">{tax.label}</span>
              <span className="tabnum text-[15px] font-semibold text-ink">{fmtMoney(tax.amount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[15px] font-bold text-ink">Total</span>
            <span className="tabnum text-[18px] font-extrabold text-ink">{fmtMoney(order.total)}</span>
          </div>
        </Card>

        <Card inset>
          <CardTitle>Payments</CardTitle>
          {order.payments.length === 0 ? (
            <div className="px-4 py-3.5 text-[14px] text-ink3">
              {payStatus === "paid" ? "No payments on file" : "No payments yet"}
            </div>
          ) : (
            order.payments.map((p) => {
              const meta = methodMeta[p.method] ?? methodMeta.credit;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink2">
                    {meta.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-ink">{meta.label}</span>
                    <span className="block truncate text-[13px] text-ink3">
                      {timeOf(p.t)}
                      {p.ref ? ` · ${p.ref}` : ""}
                    </span>
                  </span>
                  <span className="tabnum shrink-0 text-[15px] font-bold text-ink">{fmtMoney(p.amount)}</span>
                </div>
              );
            })
          )}
        </Card>

        <Card inset>
          <CardTitle>Customer</CardTitle>
          <div className="flex items-center gap-3 px-4 py-3.5">
            {customer ? (
              <>
                <Avatar name={customer.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{customer.name}</span>
                  {customer.phone && <span className="block truncate text-[14px] text-ink3">{customer.phone}</span>}
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">Walk-in</span>
                <span className="block text-[14px] text-ink3">No customer attached</span>
              </span>
            )}
          </div>
        </Card>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-5 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3">
        {canRecord ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              icon={<ReceiptIcon className="size-4" />}
              onClick={() => setReceiptOpen(true)}
            >
              View receipt
            </Button>
            <Button icon={<Banknote className="size-4" />} onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            block
            icon={<ReceiptIcon className="size-4" />}
            onClick={() => setReceiptOpen(true)}
          >
            View receipt
          </Button>
        )}
      </div>

      <ReceiptSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        order={order}
        settings={settings}
      />

      <Sheet
        open={payOpen}
        onClose={closePay}
        title="Record payment"
        height="tall"
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={closePay}>
              Cancel
            </Button>
            <Button block disabled={!Number.isFinite(parseFloat(amountStr)) || parseFloat(amountStr) <= 0} onClick={savePayment}>
              Save
            </Button>
          </div>
        }
      >
        <Segmented
          className="mb-4"
          value={method}
          onChange={setMethod}
          options={[
            { value: "cash", label: "Cash" },
            { value: "momo", label: "MoMo" },
            { value: "card", label: "Card" },
          ]}
        />
        <p className="text-[15px] font-medium text-ink2">Amount received</p>
        <p className="tabnum my-3 text-center text-[32px]/9 font-extrabold tracking-[-0.02em] text-ink">
          {CURRENCY_SYMBOL}
          {amountStr || "0.00"}
        </p>
        <div className="mb-4 flex justify-center">
          {due > 0 && (
            <Chip
              active={amountStr === trimAmount(due)}
              onClick={() => setAmountStr(trimAmount(due))}
            >
              Full balance · {fmtMoney(due)}
            </Chip>
          )}
        </div>
        <NumberPad onDigit={onDigit} onDelete={onDelete} />
      </Sheet>

      <Confirm
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={() => refundOrder(order.id)}
        title="Refund order"
        body={`Refund order ${order.id}? All items return to stock and the sale is marked refunded. Payments already collected stay in the ledger.`}
        confirmLabel="Refund"
        tone="danger"
      />
    </div>
  );
}

function trimAmount(n: number): string {
  return String(Math.round(n * 100) / 100);
}
