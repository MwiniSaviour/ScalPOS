"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, SearchBar } from "@/components/ui/input";
import { NumberPad } from "@/components/ui/numberpad";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { ReceiptSheet, orderTax } from "@/components/receipt/receipt";
import { id } from "@/lib/format";
import { cashierDenominations, fmtMoney, fmtMoneyCompact, parsePrice } from "@/lib/money";
import { useCartTotals, usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import { useNow } from "@/lib/now";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Plus,
  Receipt,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Order, Payment, PaymentMethod } from "@/lib/types";

type PayMethod = "cash" | "momo" | "card";
type Row = { key: string; method: PayMethod; amount: number; ref?: string };

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
  credit: "Credit",
};
const METHOD_TINT: Record<PaymentMethod, string> = {
  cash: "bg-gold/10 text-gold",
  momo: "bg-info/10 text-info",
  card: "bg-violet/10 text-violet",
  credit: "bg-warn/10 text-warn",
};

function MethodIcon({ method }: { method: PaymentMethod }) {
  if (method === "momo") return <Smartphone className="size-[17px]" />;
  if (method === "card") return <CreditCard className="size-[17px]" />;
  return <Banknote className="size-[17px]" />;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function trimNum(n: number): string {
  return String(Number.isInteger(n) ? n : Number(n.toFixed(2)));
}

export default function PayScreen() {
  const router = useRouter();
  const hydrated = usePos((s) => s.hydrated);
  const settings = usePos((s) => s.settings);
  const now = useNow();
  const totals = useCartTotals();
  const customers = usePos((s) => s.customers);
  const cartCustomerId = usePos((s) => s.cartCustomerId);
  const setCartCustomer = usePos((s) => s.setCartCustomer);

  const [method, setMethod] = useState<PayMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [entered, setEntered] = useState<Row[]>([]);
  const [momoRef, setMomoRef] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [done, setDone] = useState<{ order: Order; change: number } | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");

  const custFiltered = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    return customers.filter(
      (c) => q === "" || c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [customers, custQuery]);

  if (!hydrated) return null;

  if (done) {
    return (
      <SuccessView
        done={done}
        onNew={() => router.push("/sell")}
        onHome={() => router.push("/")}
      />
    );
  }

  if (totals.count === 0) {
    return (
      <div className="anim-fade">
        <header className="border-b border-line2 bg-bg">
          <div className="safe-t" />
          <div className="flex h-14 items-center gap-2 px-2">
            <IconButton label="Back" onClick={() => router.push("/sell")}>
              <ChevronLeft className="size-[22px] text-ink" strokeWidth={2.2} />
            </IconButton>
            <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold tracking-[-0.02em] text-ink">
              Payment
            </h1>
          </div>
        </header>
        <section className="px-5 pt-4">
          <EmptyState
            icon={<Receipt className="size-7" />}
            title="Nothing to pay"
            hint="The cart is empty — add items from the register first."
            action={<Button onClick={() => router.push("/sell")}>Back to register</Button>}
          />
        </section>
      </div>
    );
  }

  const activeCustomer = customers.find((c) => c.id === cartCustomerId) ?? null;

  const pick = (cid: string | null) => {
    setCartCustomer(cid);
    setCustOpen(false);
  };

  const enteredSum = entered.reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, round2(totals.total - enteredSum));
  const tenderedNum = method === "cash" ? parsePrice(tendered) : 0;
  const pending =
    method === "cash" ? round2(Math.min(tenderedNum, remaining)) : remaining;
  const changeDue =
    method === "cash" && tenderedNum - remaining > 0.004
      ? round2(tenderedNum - remaining)
      : 0;
  const credit = round2(Math.max(0, remaining - pending));

  const ctaLabel =
    changeDue > 0
      ? `Change due ${fmtMoney(changeDue)}`
      : credit > 0
        ? "Record & charge"
        : `Complete sale ${fmtMoney(totals.total)}`;

  const onDigit = (d: string) =>
    setTendered((t) => {
      if (d === ".") return t.includes(".") ? t : t === "" ? "0." : t + ".";
      const next = t + d;
      const [int, dec] = next.split(".");
      if (int.startsWith("0") && int.length > 1 && dec === undefined) return t;
      if (int.replace(/^0+(?=\d)/, "").length > 6) return t;
      if (dec !== undefined && dec.length > 2) return t;
      return next;
    });

  const backspace = () => setTendered((t) => t.slice(0, -1));

  const split = () => {
    if (pending <= 0) return;
    const ref =
      method === "momo" ? momoRef.trim() || undefined : method === "card" ? cardRef.trim() || undefined : undefined;
    setEntered((rows) => [...rows, { key: id("sp_"), method, amount: pending, ref }]);
    if (method === "cash") setTendered("");
  };

  const complete = () => {
    const payments: Payment[] = entered.map((r) => ({
      id: id("py_"),
      method: r.method,
      amount: r.amount,
      t: now,
      ...(r.ref ? { ref: r.ref } : {}),
    }));
    if (pending > 0) {
      const ref = method === "momo" ? momoRef.trim() : method === "card" ? cardRef.trim() : "";
      payments.push({
        id: id("py_"),
        method,
        amount: pending,
        t: now,
        ...(ref !== "" ? { ref } : {}),
      });
    }
    const placed = usePos.getState().placeOrder(payments);
    if (placed) setDone({ order: placed, change: changeDue });
  };

  return (
    <div className="anim-fade pb-40">
      <header className="sticky top-0 z-40 border-b border-line2 bg-bg">
        <div className="safe-t" />
        <div className="flex h-14 items-center gap-2 px-2">
          <IconButton label="Back" onClick={() => router.push("/sell")}>
            <ChevronLeft className="size-[22px] text-ink" strokeWidth={2.2} />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold tracking-[-0.02em] text-ink">
            Payment
          </h1>
        </div>
      </header>

      <section className="px-5 pt-6 text-center">
        <p className="text-[15px] font-medium text-ink2">Amount due</p>
        <p className="tabnum mt-0.5 text-[34px]/10 font-extrabold tracking-[-0.03em] text-ink">
          {fmtMoney(totals.total)}
        </p>
        <p className="mt-1 text-[14px] text-ink3">
          {totals.count} item{totals.count === 1 ? "" : "s"}
          {totals.discount > 0 ? ` · discount −${fmtMoney(totals.discount)}` : ""}
          {totals.tax > 0
            ? ` · ${settings.taxInclusive ? "tax incl." : "tax"} ${fmtMoney(totals.tax)}`
            : ""}
        </p>
      </section>

      <section className="px-5 pt-5">
        <Segmented<PayMethod>
          value={method}
          onChange={setMethod}
          options={[
            { value: "cash", label: "Cash" },
            { value: "momo", label: "MoMo" },
            { value: "card", label: "Card" },
          ]}
        />
      </section>

      <section className="px-5 pt-4">
        <Card inset>
          <button
            onClick={() => setCustOpen(true)}
            className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
              <User className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[17px] font-semibold text-ink">
                {activeCustomer ? activeCustomer.name : "Customer"}
              </span>
              <span className="block truncate text-[14px] text-ink3">
                {activeCustomer ? activeCustomer.phone || "Walk-in" : "Walk-in — tap to add"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink3" />
          </button>
        </Card>
      </section>

      {method === "cash" && (
        <section className="px-5 pt-4">
          <Card className="p-4">
            <p className="text-[15px] font-medium text-ink2">Amount tendered</p>
            <p
              className={cn(
                "tabnum mt-1 text-[28px]/9 font-extrabold tracking-[-0.02em]",
                tenderedNum > 0 ? "text-ink" : "text-ink4",
              )}
            >
              {fmtMoney(tenderedNum)}
            </p>
            <div className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4">
              <div className="flex w-max gap-1.5">
                <Chip active onClick={() => setTendered(trimNum(remaining))}>
                  Exact
                </Chip>
                {cashierDenominations().map((d) => (
                  <Chip key={d} onClick={() => setTendered((t) => trimNum(parsePrice(t) + d))}>
                    {fmtMoneyCompact(d)}
                  </Chip>
                ))}
              </div>
            </div>
            {changeDue > 0 && (
              <span className="tabnum mt-3 inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-[13px] font-semibold text-accent">
                Change due {fmtMoney(changeDue)}
              </span>
            )}
          </Card>
          <NumberPad className="mt-4" onDigit={onDigit} onDelete={backspace} />
        </section>
      )}

      {method === "momo" && (
        <section className="px-5 pt-4">
          <Card className="p-4">
            <p className="text-[15px] font-medium text-ink2">MoMo number</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="tabnum text-[24px]/8 font-extrabold tracking-[-0.02em] text-ink">
                {settings.momoNumber}
              </p>
              <span className="rounded-full bg-info/10 px-2.5 py-1 text-[13px] font-semibold text-info">
                {settings.momoNetwork}
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-6 text-ink3">
              Customer dials *170# or sends money to this number.
            </p>
            <Input
              label="Ref"
              hint="Paste the transaction ID once it lands."
              placeholder="Optional — e.g. MTN-TX993"
              value={momoRef}
              onChange={(e) => setMomoRef(e.target.value)}
              className="mt-3"
            />
          </Card>
        </section>
      )}

      {method === "card" && (
        <section className="px-5 pt-4">
          <Card className="p-4">
            <p className="text-[15px] font-medium text-ink2">Card terminal</p>
            <p className="mt-1 text-[14px] leading-6 text-ink2">
              {fmtMoney(remaining)} will be recorded as a card payment when you complete the
              sale.
            </p>
            <Input
              label="Approval code"
              hint="Optional — copy it from the terminal slip."
              placeholder="e.g. APPR-0042"
              value={cardRef}
              onChange={(e) => setCardRef(e.target.value)}
              className="mt-3"
            />
          </Card>
        </section>
      )}

      <section className="px-5 pt-6">
        <p className="mb-2 text-[15px] font-medium text-ink2">Split payments</p>
        {entered.length > 0 && (
          <Card inset>
            {entered.map((r) => (
              <div key={r.key} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    METHOD_TINT[r.method],
                  )}
                >
                  <MethodIcon method={r.method} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-ink">
                    {METHOD_LABEL[r.method]}
                  </span>
                  {r.ref && (
                    <span className="block truncate text-[14px] text-ink3">{r.ref}</span>
                  )}
                </span>
                <span className="tabnum shrink-0 text-[17px] font-bold text-ink">
                  {fmtMoney(r.amount)}
                </span>
                <IconButton
                  label="Remove split"
                  onClick={() =>
                    setEntered((rows) => rows.filter((x) => x.key !== r.key))
                  }
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            ))}
          </Card>
        )}
        {remaining > 0 && (
          <div className="mt-2.5 flex items-center justify-between px-1">
            <span className="text-[14px] text-ink3">Remaining due</span>
            <span className="tabnum text-[15px] font-bold text-warn">{fmtMoney(remaining)}</span>
          </div>
        )}
        <Button
          variant="soft"
          block
          className="mt-2"
          icon={<Plus className="size-4" />}
          disabled={pending <= 0}
          onClick={split}
        >
          Split
        </Button>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line2 bg-surface pb-[calc(var(--nova-sab)+12px)] pt-2">
        <div className="mx-auto max-w-[440px] px-4">
          {credit > 0 && (
            <p className="mb-1.5 text-center text-[13px] font-medium text-warn">
              Leaves {fmtMoney(credit)} on credit
            </p>
          )}
          <Button block size="lg" onClick={complete}>
            {ctaLabel}
          </Button>
        </div>
      </div>

      <Sheet
        open={custOpen}
        onClose={() => setCustOpen(false)}
        title="Attach customer"
        height="auto"
      >
        <SearchBar value={custQuery} onChange={setCustQuery} placeholder="Search name or phone…" />
        <Card inset className="mt-3">
          <button
            onClick={() => pick(null)}
            className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <User className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[17px] font-semibold text-ink">Walk-in</span>
              <span className="block text-[14px] text-ink3">No customer attached</span>
            </span>
            {cartCustomerId === null && <CircleCheck className="size-5 shrink-0 text-accent" />}
          </button>
          {custFiltered.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
            >
              <Avatar name={c.name} size={36} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[17px] font-semibold text-ink">{c.name}</span>
                <span className="block truncate text-[14px] text-ink3">{c.phone || "No phone"}</span>
              </span>
              {cartCustomerId === c.id && <CircleCheck className="size-5 shrink-0 text-accent" />}
            </button>
          ))}
          {custFiltered.length === 0 && (
            <p className="px-4 py-6 text-center text-[14px] text-ink3">No customer matches.</p>
          )}
        </Card>
      </Sheet>
    </div>
  );
}

function SuccessView({
  done,
  onNew,
  onHome,
}: {
  done: { order: Order; change: number };
  onNew: () => void;
  onHome: () => void;
}) {
  const settings = usePos((s) => s.settings);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const o = done.order;
  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
  const credit = Math.max(0, o.total - paid);
  const items = o.items.reduce((s, i) => s + i.qty, 0);
  const tax = orderTax(o);

  return (
    <div className="anim-fade">
      <div className="flex flex-col items-center px-6 pt-20 text-center">
        <span className="anim-pop flex size-16 items-center justify-center rounded-full bg-accent text-accentink">
          <CircleCheck className="size-9" />
        </span>
        <p className="mt-5 text-[15px] font-medium text-accent">
          {credit > 0 ? "Sale recorded" : "Sale complete"}
        </p>
        <p className="mt-1 font-mono text-[13px] text-ink2">{o.id}</p>
        <p className="tabnum mt-2 text-[34px]/10 font-extrabold tracking-[-0.03em] text-ink">
          {fmtMoney(paid)}
        </p>
        <p className="mt-1 text-[14px] text-ink3">
          {items} item{items === 1 ? "" : "s"} paid
        </p>
      </div>

      <div className="px-5 pt-6">
        <Card inset>
          {o.payments.length === 0 && (
            <p className="px-4 py-3.5 text-center text-[14px] text-ink3">
              No payment recorded — full amount on credit.
            </p>
          )}
          {o.payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  METHOD_TINT[p.method],
                )}
              >
                <MethodIcon method={p.method} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-ink">
                  {METHOD_LABEL[p.method]}
                </span>
                {p.ref && <span className="block truncate text-[14px] text-ink3">{p.ref}</span>}
              </span>
              <span className="tabnum shrink-0 text-[15px] font-bold text-ink">{fmtMoney(p.amount)}</span>
            </div>
          ))}
          {o.discount > 0 && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[14px] text-ink2">Discount</span>
              <span className="tabnum text-[15px] font-bold text-accent">
                −{fmtMoney(o.discount)}
              </span>
            </div>
          )}
          {tax && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[14px] text-ink2">{tax.label}</span>
              <span className="tabnum text-[15px] font-bold text-ink">{fmtMoney(tax.amount)}</span>
            </div>
          )}
          {done.change > 0 && (
            <div className="flex items-center justify-between bg-accent/10 px-4 py-3.5">
              <span className="text-[14px] font-medium text-accent">Change due</span>
              <span className="tabnum text-[15px] font-bold text-accent">
                {fmtMoney(done.change)}
              </span>
            </div>
          )}
          {credit > 0 && (
            <div className="flex items-center justify-between bg-warn/10 px-4 py-3.5">
              <span className="text-[14px] font-medium text-warn">Balance on credit</span>
              <span className="tabnum text-[15px] font-bold text-warn">{fmtMoney(credit)}</span>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-2.5 px-5 pt-6 pb-10">
        <Button
          variant="secondary"
          block
          size="lg"
          icon={<Receipt className="size-4" />}
          onClick={() => setReceiptOpen(true)}
        >
          View receipt
        </Button>
        <Button variant="primary" block size="lg" onClick={onNew}>
          New sale
        </Button>
        <Button variant="ghost" block size="lg" onClick={onHome}>
          Home
        </Button>
      </div>

      <ReceiptSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        order={o}
        settings={settings}
      />
    </div>
  );
}
