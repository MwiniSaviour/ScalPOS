"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { fmtMoney } from "@/lib/money";
import { cn } from "@/lib/ui";
import { DEMO_PRODUCTS } from "./landing-data";

type DemoPaymentMethod = "cash" | "momo" | "card" | "credit";

const CUSTOMERS = [
  { id: "walkin", name: "Walk-in", phone: "Counter checkout" },
  { id: "k_ama", name: "Ama Serwaa", phone: "024 455 5102 · Osu" },
  { id: "k_kwame", name: "Kwame Mensah", phone: "055 188 3404 · Haatso" },
  { id: "k_akua", name: "Akua Owusu", phone: "020 944 7712 · Circle" },
];

export function InteractiveRegisterDemo({
  onLaunchRegister,
}: {
  onLaunchRegister: (route?: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, number>>({
    p_earbuds: 1,
    p_charger: 1,
    p_indomie: 4,
  });
  const [customerId, setCustomerId] = useState<string>("k_ama");
  const [method, setMethod] = useState<DemoPaymentMethod>("momo");
  const [discount, setDiscount] = useState<number>(0);
  const [orderSeq, setOrderSeq] = useState<number>(202);
  const [justCompleted, setJustCompleted] = useState<boolean>(false);

  const categories = [
    "All",
    "Electronics",
    "Groceries",
    "Clothing",
    "Personal Care",
  ];

  const visibleProducts = useMemo(() => {
    if (selectedCategory === "All") return DEMO_PRODUCTS;
    return DEMO_PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const cartLines = useMemo(() => {
    return DEMO_PRODUCTS.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => {
      const qty = cart[p.id] ?? 0;
      return {
        product: p,
        qty,
        lineTotal: p.price * qty,
        lineProfit: (p.price - p.cost) * qty,
      };
    });
  }, [cart]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);
    const grossProfit = cartLines.reduce((s, l) => s + l.lineProfit, 0);
    const count = cartLines.reduce((s, l) => s + l.qty, 0);
    const appliedDiscount = Math.min(discount, subtotal);
    const total = Math.max(0, subtotal - appliedDiscount);
    const netProfit = Math.max(0, grossProfit - appliedDiscount);
    const paid = method === "credit" ? Math.round(total * 0.5) : total;
    const balanceDue = Math.max(0, total - paid);
    return {
      subtotal,
      count,
      appliedDiscount,
      total,
      netProfit,
      paid,
      balanceDue,
    };
  }, [cartLines, discount, method]);

  const activeCustomer =
    CUSTOMERS.find((c) => c.id === customerId) ?? CUSTOMERS[0];

  function addUnit(pid: string, delta: number) {
    setJustCompleted(false);
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[pid] ?? 0) + delta);
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[pid];
      } else {
        next[pid] = nextQty;
      }
      return next;
    });
  }

  function resetDemoCart() {
    setJustCompleted(false);
    setCart({
      p_earbuds: 1,
      p_charger: 1,
      p_indomie: 4,
    });
    setDiscount(0);
    setMethod("momo");
  }

  function completeDemoSale() {
    if (totals.count === 0) return;
    setJustCompleted(true);
    setOrderSeq((n) => n + 1);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line2 bg-surface">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface2/60 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">
            Register preview
          </span>
          <span className="hidden text-xs text-ink3 sm:inline">
            Tap items to adjust quantities and inspect the generated receipt.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetDemoCart}
            className="press inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-surface px-2.5 py-1.5 text-xs font-medium text-ink2 hover:text-ink"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onLaunchRegister("/sell")}
            className="press inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accentink"
          >
            <span>Open register</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT 7 COLS: Product Catalog & Controls */}
        <div className="border-b border-line p-5 sm:p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => {
                const active = cat === selectedCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "press rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-ink text-bg"
                        : "border border-line2 bg-surface2 text-ink2 hover:text-ink",
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <span className="tabnum text-xs text-ink3">
              {visibleProducts.length} items
            </span>
          </div>

          {/* Product Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visibleProducts.map((p) => {
              const qty = cart[p.id] ?? 0;
              const remainingStock = Math.max(0, p.stock - qty);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-2.5 transition-colors",
                    qty > 0
                      ? "border-accent/60 bg-surface2/80"
                      : "border-line bg-surface2/40 hover:border-line2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => addUnit(p.id, 1)}
                    className="press text-left"
                  >
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-surface3">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                      {qty > 0 && (
                        <span className="tabnum absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accentink">
                          {qty}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-semibold text-ink">
                      {p.name}
                    </p>
                    <div className="mt-0.5 flex items-baseline justify-between">
                      <span className="tabnum text-sm font-bold text-ink">
                        {fmtMoney(p.price)}
                      </span>
                      <span className="tabnum text-[11px] text-ink3">
                        {remainingStock} {p.unit}
                      </span>
                    </div>
                  </button>

                  <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-line pt-2">
                    {qty > 0 ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Decrease ${p.name}`}
                          onClick={() => addUnit(p.id, -1)}
                          className="press flex size-6 items-center justify-center rounded border border-line2 bg-surface text-ink2 hover:text-ink"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="tabnum text-xs font-semibold text-ink">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${p.name}`}
                          onClick={() => addUnit(p.id, 1)}
                          className="press flex size-6 items-center justify-center rounded bg-accent text-accentink"
                        >
                          <Plus className="size-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addUnit(p.id, 1)}
                        className="press flex w-full items-center justify-center gap-1 rounded bg-surface py-1 text-xs font-medium text-ink2 hover:text-ink"
                      >
                        <Plus className="size-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Controls */}
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface2/40 p-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-ink2">
                Customer
              </label>
              <select
                aria-label="Customer"
                value={customerId}
                onChange={(e) => {
                  setJustCompleted(false);
                  setCustomerId(e.target.value);
                }}
                className="mt-1.5 w-full rounded-lg border border-line2 bg-surface px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none"
              >
                {CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink2">
                Payment method
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "momo", label: "MoMo" },
                    { id: "cash", label: "Cash" },
                    { id: "card", label: "Card" },
                    { id: "credit", label: "Credit" },
                  ] as const
                ).map((pm) => {
                  const active = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setJustCompleted(false);
                        setMethod(pm.id);
                      }}
                      className={cn(
                        "press rounded-lg py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-ink text-bg"
                          : "border border-line2 bg-surface text-ink2 hover:text-ink",
                      )}
                    >
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink2">
                Discount
              </label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {[0, 5, 10, 20].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setJustCompleted(false);
                      setDiscount(amt);
                    }}
                    className={cn(
                      "press tabnum rounded-lg py-1.5 text-xs font-medium transition-colors",
                      discount === amt
                        ? "bg-ink text-bg"
                        : "border border-line2 bg-surface text-ink2 hover:text-ink",
                    )}
                  >
                    {amt === 0 ? "0" : `₵${amt}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: Live Thermal Receipt Preview */}
        <div className="flex flex-col justify-between bg-surface2/25 p-5 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink2">
                58mm ESC/POS receipt
              </span>
              <span className="tabnum text-ink3">
                Margin: {fmtMoney(totals.netProfit)}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-line2 bg-surface p-5 font-mono text-xs">
              <div className="border-b border-dashed border-line2 pb-3 text-center">
                <p className="font-sans text-sm font-bold tracking-tight text-ink">
                  YOUR SHOP NAME
                </p>
                <p className="mt-0.5 text-[11px] text-ink3">
                  Your address · Accra, Ghana
                </p>
                <p className="tabnum text-[11px] text-ink3">
                  Tel: your number · MoMo: your number
                </p>
              </div>

              <div className="flex justify-between border-b border-dashed border-line2 py-2 text-[11px] text-ink2">
                <span className="tabnum">ORD0000{orderSeq}</span>
                <span>{activeCustomer.name}</span>
              </div>

              <div className="my-2.5 space-y-1.5">
                {cartLines.length === 0 ? (
                  <p className="py-4 text-center font-sans text-xs text-ink3">
                    No items selected.
                  </p>
                ) : (
                  cartLines.map((line) => (
                    <div
                      key={line.product.id}
                      className="flex items-baseline justify-between gap-2 text-ink"
                    >
                      <span className="truncate">
                        {line.product.name} × {line.qty}
                      </span>
                      <span className="tabnum shrink-0 font-semibold">
                        {fmtMoney(line.lineTotal)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1 border-t border-dashed border-line2 pt-2.5">
                <div className="flex justify-between text-ink2">
                  <span>Subtotal ({totals.count})</span>
                  <span className="tabnum">{fmtMoney(totals.subtotal)}</span>
                </div>
                {totals.appliedDiscount > 0 && (
                  <div className="flex justify-between text-ink2">
                    <span>Discount</span>
                    <span className="tabnum">
                      -{fmtMoney(totals.appliedDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-sans text-base font-bold text-ink">
                  <span>Total</span>
                  <span className="tabnum">{fmtMoney(totals.total)}</span>
                </div>
              </div>

              <div className="mt-2.5 space-y-1 border-t border-dashed border-line2 pt-2.5 text-[11px]">
                <div className="flex justify-between text-ink2">
                  <span>
                    Paid (
                    {method === "momo"
                      ? "MTN MoMo"
                      : method === "cash"
                        ? "Cash"
                        : method === "card"
                          ? "Card"
                          : "Part-paid"}
                    )
                  </span>
                  <span className="tabnum font-semibold text-ink">
                    {fmtMoney(totals.paid)}
                  </span>
                </div>
                {totals.balanceDue > 0 && (
                  <div className="flex justify-between font-semibold text-warn">
                    <span>Balance due</span>
                    <span className="tabnum">{fmtMoney(totals.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            {justCompleted ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line2 bg-surface p-3">
                <div className="text-xs">
                  <p className="font-semibold text-ink">
                    Order ORD0000{orderSeq - 1} recorded ({fmtMoney(totals.total)})
                  </p>
                  <p className="text-ink3">
                    Stock decremented automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchRegister("/sell")}
                  className="press shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accentink"
                >
                  Open register
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={totals.count === 0}
                  onClick={completeDemoSale}
                  className="press rounded-xl bg-accent py-2.5 text-xs font-semibold text-accentink disabled:opacity-40"
                >
                  Complete sample sale ({fmtMoney(totals.total)})
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchRegister("/sell")}
                  className="press rounded-xl border border-line2 bg-surface py-2.5 text-xs font-semibold text-ink hover:bg-surface2"
                >
                  Open full register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
