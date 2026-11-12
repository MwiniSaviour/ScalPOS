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
import { cartLineKey, linePackName, packFactor } from "@/lib/batches";
import { CURRENCY_SYMBOL, fmtMoney, parsePrice } from "@/lib/money";
import { scanBarcode } from "@/lib/barcode";
import { sellableStock } from "@/lib/batches";
import { useNow } from "@/lib/now";
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
  const batches = usePos((s) => s.batches);
  const totals = useCartTotals();
  const now = useNow();

  const [query, setQuery] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [packFor, setPackFor] = useState<Product | null>(null);
  const [packPrice, setPackPrice] = useState<Record<number, string>>({});

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

  // A batched product can only sell what has not expired — the shelf number
  // includes expired stock, which must never be offered for sale.
  const availableById = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const batched = batches.some((b) => b.productId === p.id);
      m.set(p.id, batched ? sellableStock(batches, p.id, now) : p.stock);
    }
    return m;
  }, [products, batches, now]);

  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cart) {
      const p = products.find((x) => x.id === line.productId);
      const base = line.qty * packFactor(p, line.packIdx);
      m.set(line.productId, (m.get(line.productId) ?? 0) + base);
    }
    return m;
  }, [cart, products]);

  if (!hydrated) return null;

  const activeCustomer = customers.find((c) => c.id === cartCustomerId) ?? null;

  const flashTile = (pid: string) => {
    setFlash(pid);
    window.setTimeout(() => setFlash((f) => (f === pid ? null : f)), 400);
  };

  const tap = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    if (p?.packs?.length) {
      setPackFor(p);
      setPackPrice(
        Object.fromEntries(
          p.packs.map((_, i) => [i, trimNum(p.price * packFactor(p, i))]),
        ),
      );
      return;
    }
    addToCart(pid, 1);
    flashTile(pid);
  };

  const closePack = () => {
    setPackFor(null);
    setPackPrice({});
  };

  const addBaseUnit = (pid: string) => {
    addToCart(pid, 1);
    closePack();
    flashTile(pid);
  };

  const addPack = (pid: string, packIdx: number) => {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    const fallback = trimNum(p.price * packFactor(p, packIdx));
    const draft = (packPrice[packIdx] ?? fallback).trim();
    addToCart(pid, 1, { packIdx, price: parsePrice(draft === "" ? fallback : draft) });
    closePack();
    flashTile(pid);
  };

  const removeOne = (pid: string) => {
    const lines = cart.filter((l) => l.productId === pid);
    const target = lines.find((l) => l.packIdx === undefined) ?? lines[0];
    if (!target) return;
    setCartQty(cartLineKey(target), target.qty - 1);
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
      if ((availableById.get(hit.id) ?? hit.stock) <= 0) {
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
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/home"))}
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
                  available={availableById.get(p.id) ?? p.stock}
                  p={p}
                  qty={qtyInCart.get(p.id) ?? 0}
                  flash={flash === p.id}
                  onTap={() => tap(p.id)}
                  onRemove={() => removeOne(p.id)}
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
          {totals.lines.map((l) => {
            const key = cartLineKey(l);
            const packName = linePackName(l.product, l.packIdx);
            const max = Math.floor(
              (availableById.get(l.product.id) ?? l.product.stock) /
                packFactor(l.product, l.packIdx),
            );
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
                <ProductArt
                  imageUrl={l.product.imageUrl}
                  name={l.product.name}
                  className="size-10 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
                    {packName ? `${l.product.name} · ${packName}` : l.product.name}
                  </span>
                  <span className="tabnum mt-1 block text-[14px] font-medium text-ink3">
                    {fmtMoney(l.price ?? l.product.price)} each
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <StepBtn
                    label="Decrease quantity"
                    onClick={() => setCartQty(key, l.qty - 1)}
                  >
                    <Minus className="size-3.5" />
                  </StepBtn>
                  <span className="tabnum w-6 text-center text-[15px] font-bold text-ink">
                    {l.qty}
                  </span>
                  <StepBtn
                    label="Increase quantity"
                    disabled={l.qty >= max}
                    onClick={() =>
                      addToCart(l.productId, 1, { packIdx: l.packIdx, price: l.price })
                    }
                  >
                    <Plus className="size-3.5" />
                  </StepBtn>
                  <IconButton label="Remove line" onClick={() => setCartQty(key, 0)}>
                    <X className="size-4" />
                  </IconButton>
                </span>
              </div>
            );
          })}
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
        open={packFor !== null}
        onClose={closePack}
        title={packFor ? `Sell ${packFor.name}` : ""}
        height="auto"
      >
        {packFor && (
          (() => {
            const packAvailable = availableById.get(packFor.id) ?? packFor.stock;
            return (
          <Card inset>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold text-ink">
                  {baseLabel(packFor)}
                </span>
                <span className="tabnum block text-[14px] text-ink3">
                  {fmtMoney(packFor.price)} each
                </span>
              </span>
              <Button
                size="sm"
                disabled={(packAvailable ?? 0) <= 0}
                onClick={() => addBaseUnit(packFor.id)}
              >
                Add
              </Button>
            </div>
            {packFor.packs?.map((pack, i) => {
              const factor = packFactor(packFor, i);
              const packsLeft = Math.floor((packAvailable ?? 0) / factor);
              return (
                <div key={`${i}-${pack.name}`} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">
                      {pack.name}
                    </span>
                    <span className="tabnum shrink-0 text-[14px] text-ink3">
                      = {factor} {unitWord(packFor)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <Input
                      money
                      inputMode="decimal"
                      label="Pack price"
                      placeholder="0.00"
                      leading={
                        <span className="tabnum text-[15px] font-semibold text-ink3">
                          {CURRENCY_SYMBOL}
                        </span>
                      }
                      value={packPrice[i] ?? ""}
                      onChange={(e) =>
                        setPackPrice((d) => ({ ...d, [i]: e.target.value }))
                      }
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      className="mb-0.5"
                      disabled={packsLeft <= 0}
                      onClick={() => addPack(packFor.id, i)}
                    >
                      Add
                    </Button>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[12px]",
                      packsLeft > 0 ? "text-ink3" : "text-danger",
                    )}
                  >
                    {packsLeft > 0
                      ? `${packsLeft} pack${packsLeft === 1 ? "" : "s"} in stock`
                      : "Not enough stock for a full pack"}
                  </p>
                </div>
              );
            })}
          </Card>
            );
          })()
        )}
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
  available,
  qty,
  flash,
  onTap,
  onRemove,
}: {
  p: Product;
  available: number;
  qty: number;
  flash: boolean;
  onTap: () => void;
  onRemove: () => void;
}) {
  const out = available <= 0;
  const low = !out && available <= p.lowStockAt;
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
            <span className="text-[12px] font-medium text-warn">{available} left</span>
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

/** The base-unit row of the pack picker — the product sold on its own. */
function baseLabel(p: Product): string {
  if (p.unit === "pcs") return "Single unit";
  if (p.unit === "kg") return "Per kg";
  if (p.unit === "ltr") return "Per litre";
  return `Single ${p.unit}`;
}

/** The unit a pack multiplies — "Box of 10 strips" reads "= 10 strips". */
function unitWord(p: Product): string {
  if (p.unit === "pcs") return "units";
  if (p.unit === "kg") return "kg";
  if (p.unit === "ltr") return "litres";
  if (p.unit === "bag") return "bags";
  if (p.unit === "box") return "boxes";
  return p.unit;
}
