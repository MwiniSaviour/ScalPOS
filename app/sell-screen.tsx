"use client";

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
import { scanBarcode } from "@/lib/barcode";
import { useCartTotals, usePos } from "@/lib/store";
import { cn, hueColor } from "@/lib/ui";
import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Minus,
  PackageOpen,
  Plus,
  SearchX,
  User,
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
  const cart = usePos((s) => s.cart);
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

  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cart) m.set(line.productId, line.qty);
    return m;
  }, [cart]);

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

  const scan = async () => {
    const code = await scanBarcode();
    if (!code) return;
    const hit = usePos
      .getState()
      .products.find((p) => p.barcode.toLowerCase() === code.toLowerCase());
    if (hit) {
      if (hit.stock <= 0) {
        usePos.getState().toast("Out of stock", "error");
        return;
      }
      tap(hit.id);
    } else {
      usePos.getState().toast("Barcode not in catalogue — add it in Inventory", "warn");
      router.push(`/inventory/edit?barcode=${encodeURIComponent(code)}`);
    }
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
      <header className="sticky top-0 z-40 border-b border-line2 bg-bg">
        <div className="safe-t" />
        <div className="flex h-14 items-center gap-2 px-2">
          <IconButton
            label="Back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          >
            <ChevronLeft className="size-[22px] text-ink" strokeWidth={2.2} />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold tracking-[-0.02em] text-ink">
            Sell
          </h1>
          <IconButton label="Customers" onClick={() => setCustOpen(true)}>
            <Users className="size-[19px]" />
          </IconButton>
        </div>
      </header>

      <div className="px-5 pt-4 pb-32">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search products…"
          onOpenScanner={() => void scan()}
        />

        <div className="edge-fade no-scrollbar -mx-5 mt-2.5 overflow-x-auto px-5">
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
                <span className="size-2 shrink-0 rounded-full" style={{ background: hueColor(c.color) }} />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-4">
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
                  qty={qtyInCart.get(p.id) ?? 0}
                  flash={flash === p.id}
                  onTap={() => tap(p.id)}
                  onRemove={() => setCartQty(p.id, (qtyInCart.get(p.id) ?? 1) - 1)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {totals.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line2 bg-surface">
          <div className="mx-auto flex max-w-[440px] items-center gap-3 px-4 pb-[max(var(--nova-sab),8px)] pt-3">
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${totals.count} items, ${fmtMoney(totals.total)}`}
              className="press flex min-w-0 flex-1 items-baseline gap-2 text-left"
            >
              <span className="tabnum min-w-0 truncate text-[17px] font-bold text-ink">
                {fmtMoney(totals.total)}
              </span>
              <span className="shrink-0 text-[14px] text-ink3">
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
            <div key={l.productId} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
              <ProductArt
                imageUrl={l.product.imageUrl}
                name={l.product.name}
                className="size-10 shrink-0 rounded-xl"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
                  {l.product.name}
                </span>
                <span className="tabnum mt-1 block text-[14px] font-medium text-ink3">
                  {fmtMoney(l.product.price)} each
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <StepBtn
                  label="Decrease quantity"
                  onClick={() => setCartQty(l.productId, l.qty - 1)}
                >
                  <Minus className="size-3.5" />
                </StepBtn>
                <span className="tabnum w-6 text-center text-[15px] font-bold text-ink">
                  {l.qty}
                </span>
                <StepBtn
                  label="Increase quantity"
                  disabled={l.qty >= l.product.stock}
                  onClick={() => addToCart(l.productId, 1)}
                >
                  <Plus className="size-3.5" />
                </StepBtn>
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
          <div className="px-4 py-3.5">
            <button onClick={openDiscount} className="press flex w-full items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent">
                <BadgePercent className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-left text-[17px] font-semibold text-ink">
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
          <div className="px-4 py-3.5">
            <button onClick={() => setCustOpen(true)} className="press flex w-full items-center gap-3">
              <span className="min-w-0 flex-1 text-left text-[14px] text-ink3">Customer</span>
              {activeCustomer ? (
                <span className="flex min-w-0 items-center gap-2">
                  <User className="size-4 shrink-0 text-ink3" />
                  <span className="truncate text-[17px] font-semibold text-ink">
                    {activeCustomer.name}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink3" />
                </span>
              ) : (
                <span className="rounded-full border border-line2 bg-surface px-3.5 py-1.5 text-[14px] font-semibold text-ink2">
                  Add customer
                </span>
              )}
            </button>
          </div>
        </Card>

        <div className="mt-3 space-y-1.5 px-1 pb-2 text-[15px]">
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
            className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <Users className="size-[18px]" />
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
  qty,
  flash,
  onTap,
  onRemove,
}: {
  p: Product;
  qty: number;
  flash: boolean;
  onTap: () => void;
  onRemove: () => void;
}) {
  const out = p.stock <= 0;
  const low = !out && p.stock <= p.lowStockAt;
  const selected = qty > 0;
  return (
    <div
      role="button"
      tabIndex={out ? undefined : 0}
      aria-disabled={out}
      aria-label={selected ? `${p.name}, ${qty} in cart` : p.name}
      onClick={() => !out && onTap()}
      onKeyDown={(e) => {
        if (!out && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onTap();
        }
      }}
      className={cn(
        "press relative flex flex-col overflow-hidden rounded-2xl border text-left cursor-pointer",
        selected || flash
          ? "border-accent bg-accent/10"
          : "border-line bg-surface hover:bg-surface2/50",
        out && "cursor-default opacity-50",
      )}
    >
      <ProductArt
        imageUrl={p.imageUrl}
        name={p.name}
        className="aspect-square w-full"
      />
      {selected && (
        <button
          aria-label={`Remove one ${p.name} from cart`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="press absolute right-1.5 top-1.5 flex h-6 items-center gap-1 rounded-full bg-accent pl-1.5 pr-2 text-accentink shadow-sm"
        >
          <X className="size-3.5" strokeWidth={3} />
          {qty > 1 && <span className="tabnum text-[11px] font-bold">×{qty}</span>}
        </button>
      )}
      <span className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <span className="line-clamp-2 min-h-[36px] text-[15px] font-semibold leading-tight text-ink">
          {p.name}
        </span>
        <span className="tabnum mt-1 text-[17px] font-bold text-ink">{fmtMoney(p.price)}</span>
        <span className="mt-0.5 flex h-[16px] items-center">
          {out ? (
            <span className="text-[12px] font-medium text-ink3">Out of stock</span>
          ) : low ? (
            <span className="text-[12px] font-medium text-warn">{p.stock} left</span>
          ) : null}
        </span>
      </span>
    </div>
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
