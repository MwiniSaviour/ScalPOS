"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, SearchBar } from "@/components/ui/input";
import { ProductArt } from "@/components/ui/productart";
import { Sheet } from "@/components/ui/sheet";
import { CURRENCY_SYMBOL, fmtMoney, parsePrice } from "@/lib/money";
import { useCartTotals, usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import {
  BadgePercent,
  ChevronRight,
  CircleCheck,
  Minus,
  PackageOpen,
  Plus,
  SearchX,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export default function SellScreen() {
  const router = useRouter();
  const hydrated = usePos((s) => s.hydrated);
  const products = usePos((s) => s.products);
  const categories = usePos((s) => s.categories);
  const customers = usePos((s) => s.customers);
  const cartCustomerId = usePos((s) => s.cartCustomerId);
  const addToCart = usePos((s) => s.addToCart);
  const setCartQty = usePos((s) => s.setCartQty);
  const setCartCustomer = usePos((s) => s.setCartCustomer);
  const totals = useCartTotals();

  const [query, setQuery] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (catId === null || p.categoryId === catId) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)),
    );
  }, [products, query, catId]);

  const custFiltered = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    return customers.filter(
      (c) => q === "" || c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [customers, custQuery]);

  if (!hydrated) return null;

  const activeCustomer = customers.find((c) => c.id === cartCustomerId) ?? null;

  const tap = (pid: string) => {
    addToCart(pid, 1);
    setFlash(pid);
    window.setTimeout(() => setFlash((f) => (f === pid ? null : f)), 400);
  };

  const openDiscount = () => {
    const next = !discountOpen;
    setDiscountOpen(next);
    if (next) setDiscountDraft(totals.discount > 0 ? trimNum(totals.discount) : "");
  };

  const applyDiscount = (v: string) => {
    setDiscountDraft(v);
    usePos.getState().setCartDiscount(parsePrice(v));
  };

  const pick = (cid: string | null) => {
    setCartCustomer(cid);
    setCustOpen(false);
  };

  return (
    <div className="anim-fade">
      <ScreenHeader
        largeTitle
        title="New sale"
        onBack={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        right={
          <IconButton label="Customers" onClick={() => setCustOpen(true)}>
            <Users className="size-[19px]" />
          </IconButton>
        }
      />

      <div className="px-4 pt-1 pb-32">
        <SearchBar value={query} onChange={setQuery} placeholder="Search products…" />

        <div className="edge-fade no-scrollbar -mx-4 mt-2.5 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5">
            <Chip active={catId === null} onClick={() => setCatId(null)}>
              All
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={catId === c.id}
                color={c.color}
                onClick={() => setCatId(c.id)}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-3">
          {products.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="size-7" />}
              title="No products yet"
              hint="Add items in Inventory and they will appear here to sell."
              action={<Button onClick={() => router.push("/inventory/edit")}>Add a product</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-7" />}
              title="No product matches"
              hint={`Nothing matches "${query.trim()}". Try another name or code.`}
              action={<Button onClick={() => setQuery("")}>Clear search</Button>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((p) => (
                <ProductTile
                  key={p.id}
                  p={p}
                  flash={flash === p.id}
                  onTap={() => tap(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {totals.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line2 bg-surface">
          <div className="mx-auto flex max-w-[440px] items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-3">
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${totals.count} items, ${fmtMoney(totals.total)}`}
              className="press flex min-w-0 flex-1 items-baseline gap-2 text-left"
            >
              <span className="tabnum min-w-0 truncate text-[17px] font-bold text-ink">
                {fmtMoney(totals.total)}
              </span>
              <span className="shrink-0 text-[12px] text-ink3">
                {totals.count} item{totals.count === 1 ? "" : "s"}
              </span>
            </button>
            <Button onClick={() => router.push("/pay")}>Charge</Button>
          </div>
        </div>
      )}

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={`Cart · ${totals.count}`}
        height="tall"
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              Clear
            </Button>
            <Button
              onClick={() => {
                setCartOpen(false);
                router.push("/pay");
              }}
            >
              Charge
            </Button>
          </div>
        }
      >
        <Card inset>
          {totals.lines.map((l) => (
            <div key={l.productId} className="flex items-center gap-3 px-4 py-3">
              <ProductArt
                imageUrl={l.product.imageUrl}
                name={l.product.name}
                className="size-10 shrink-0 rounded-xl"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {l.product.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <StepBtn
                    label="Decrease quantity"
                    onClick={() => setCartQty(l.productId, l.qty - 1)}
                  >
                    <Minus className="size-3.5" />
                  </StepBtn>
                  <span className="tabnum w-6 text-center text-[14px] font-semibold text-ink">
                    {l.qty}
                  </span>
                  <StepBtn
                    label="Increase quantity"
                    disabled={l.qty >= l.product.stock}
                    onClick={() => addToCart(l.productId, 1)}
                  >
                    <Plus className="size-3.5" />
                  </StepBtn>
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                <span className="tabnum text-[15px] font-bold text-ink">
                  {fmtMoney(l.product.price * l.qty)}
                </span>
                <IconButton
                  label="Remove line"
                  onClick={() => setCartQty(l.productId, 0)}
                >
                  <X className="size-4" />
                </IconButton>
              </span>
            </div>
          ))}
        </Card>

        <Card inset className="mt-2.5">
          <div className="px-4 py-3">
            <button onClick={openDiscount} className="press flex w-full items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <BadgePercent className="size-[18px]" />
              </span>
              <span className="flex-1 text-left text-[14px] font-semibold text-ink">
                {totals.discount > 0 ? "Discount" : "Add discount"}
              </span>
              {totals.discount > 0 && (
                <span className="tabnum text-[15px] font-bold text-accent">
                  −{fmtMoney(totals.discount)}
                </span>
              )}
              <ChevronRight
                className={cn("size-4 shrink-0 text-ink3 transition-transform", discountOpen && "rotate-90")}
              />
            </button>
            {discountOpen && (
              <div className="mt-3 flex items-end gap-2">
                <Input
                  money
                  inputMode="decimal"
                  label="Amount"
                  placeholder="0.00"
                  leading={
                    <span className="tabnum text-[15px] font-semibold text-ink3">
                      {CURRENCY_SYMBOL}
                    </span>
                  }
                  value={discountDraft}
                  onChange={(e) => applyDiscount(e.target.value)}
                  className="flex-1"
                />
                {totals.discount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-0.5"
                    onClick={() => applyDiscount("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="px-4 py-3">
            <button onClick={() => setCustOpen(true)} className="press flex w-full items-center gap-3">
              {activeCustomer ? (
                <Avatar name={activeCustomer.name} size={36} />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet/10 text-violet">
                  <Users className="size-[18px]" />
                </span>
              )}
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-semibold text-ink">
                  {activeCustomer ? activeCustomer.name : "Attach customer"}
                </span>
                <span className="block truncate text-[12px] text-ink3">
                  {activeCustomer ? activeCustomer.phone || "Walk-in" : "Walk-in — no customer"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink3" />
            </button>
          </div>
        </Card>

        <div className="mt-3 space-y-1.5 px-1 pb-2 text-[13px]">
          <div className="flex justify-between text-ink2">
            <span>Subtotal</span>
            <span className="tabnum">{fmtMoney(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-accent">
              <span>Discount</span>
              <span className="tabnum">−{fmtMoney(totals.discount)}</span>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between text-ink2">
              <span>Tax</span>
              <span className="tabnum">{fmtMoney(totals.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-bold text-ink">
            <span>Total</span>
            <span className="tabnum">{fmtMoney(totals.total)}</span>
          </div>
        </div>
      </Sheet>

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
            className="press flex w-full items-center gap-3 px-4 py-3 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink3">
              <Users className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[14px] font-semibold text-ink">Walk-in</span>
              <span className="block text-[12px] text-ink3">No customer attached</span>
            </span>
            {cartCustomerId === null && <CircleCheck className="size-5 shrink-0 text-accent" />}
          </button>
          {custFiltered.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className="press flex w-full items-center gap-3 px-4 py-3 hover:bg-surface2/50"
            >
              <Avatar name={c.name} size={36} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-semibold text-ink">{c.name}</span>
                <span className="block text-[12px] text-ink3">{c.phone || "No phone"}</span>
              </span>
              {cartCustomerId === c.id && <CircleCheck className="size-5 shrink-0 text-accent" />}
            </button>
          ))}
          {custFiltered.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-ink3">No customer matches.</p>
          )}
        </Card>
      </Sheet>

      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          usePos.getState().clearCart();
          setCartOpen(false);
          setDiscountOpen(false);
          setDiscountDraft("");
        }}
        title="Clear cart?"
        body={`This removes all ${totals.count} item${totals.count === 1 ? "" : "s"} from the current sale.`}
        confirmLabel="Clear"
        tone="danger"
      />
    </div>
  );
}

function ProductTile({
  p,
  flash,
  onTap,
}: {
  p: Product;
  flash: boolean;
  onTap: () => void;
}) {
  const out = p.stock <= 0;
  const low = !out && p.stock <= p.lowStockAt;
  return (
    <button
      onClick={onTap}
      disabled={out}
      className={cn(
        "press flex items-start gap-2.5 rounded-2xl border p-2.5 text-left",
        flash ? "border-accent bg-accent/12" : "border-line bg-surface",
      )}
    >
      <ProductArt
        imageUrl={p.imageUrl}
        name={p.name}
        className={cn("size-12 shrink-0 rounded-xl", out && "opacity-50")}
      />
      <span className="min-w-0 flex-1">
        <span className="block min-h-[32px] line-clamp-2 text-[13px] font-semibold leading-tight text-ink">
          {p.name}
        </span>
        <span className="tabnum mt-1 block text-[15px] font-bold text-ink">{fmtMoney(p.price)}</span>
        <span className="mt-1 flex h-[16px] items-center">
          {out ? (
            <span className="text-[11px] font-medium text-ink3">Out of stock</span>
          ) : low ? (
            <span className="text-[11px] font-medium text-warn">{p.stock} left</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function StepBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="press flex size-9 items-center justify-center rounded-lg bg-surface2 text-ink2 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function trimNum(n: number): string {
  return String(Number.isInteger(n) ? n : Number(n.toFixed(2)));
}
