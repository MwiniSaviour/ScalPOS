"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input } from "@/components/ui/input";
import { NumberPad } from "@/components/ui/numberpad";
import { ScreenHeader } from "@/components/shell/screenheader";
import { ProductArt } from "@/components/ui/productart";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/statuspill";
import { batchesOf, batchStock, daysToExpiry } from "@/lib/batches";
import { hasFeature } from "@/lib/features";
import { dateShort, dateTime, timeOf } from "@/lib/format";
import { CURRENCY_SYMBOL, fmtMoney, parsePrice } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos, useSettings } from "@/lib/store";
import type { Batch, StockReason } from "@/lib/types";
import { cn, hueColor } from "@/lib/ui";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpDown, Layers, Package, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

const moveLabel: Record<StockReason, string> = {
  purchase: "Purchase",
  sale: "Sale",
  adjust: "Correction",
  damage: "Damaged",
  return: "Customer return",
  count: "Stock count",
  opening: "Opening stock",
  expiry: "Expired",
};

const adjReasons: { value: StockReason; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "return", label: "Customer return" },
  { value: "damage", label: "Damaged" },
  { value: "count", label: "Stock count" },
  { value: "adjust", label: "Correction" },
];

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const pid = params.get("id") ?? "";
  const hydrated = usePos((s) => s.hydrated);
  const product = usePos((s) => s.products.find((p) => p.id === pid));
  const categories = usePos((s) => s.categories);
  const allMoves = usePos((s) => s.stockMoves);
  const batches = usePos((s) => s.batches);
  const settings = useSettings();
  const now = useNow(60_000);

  const isPharmacy = hasFeature(settings.businessType, "batches");

  const moves = useMemo(
    () => allMoves.filter((m) => m.productId === pid).slice().reverse(),
    [allMoves, pid],
  );

  const productBatches = useMemo(() => batchesOf(batches, pid), [batches, pid]);

  const batchNoById = useMemo(() => new Map(batches.map((b) => [b.id, b.batchNo])), [batches]);

  const [confirmDel, setConfirmDel] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjMode, setAdjMode] = useState<"add" | "remove">("add");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState<StockReason | null>(null);
  const [adjNote, setAdjNote] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [batchNo, setBatchNo] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchCost, setBatchCost] = useState("");
  const [batchTouched, setBatchTouched] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState<string | null>(null);

  if (!hydrated) return null;

  if (!product) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Product" onBack className="border-b border-line" />
        <section className="px-5 pt-4">
          <EmptyState
            icon={<Package className="size-7" />}
            title="Product not found"
            hint="It may have been deleted from your catalogue."
            action={<Button variant="secondary" onClick={() => router.push("/inventory")}>Back to inventory</Button>}
          />
        </section>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const profit = product.price - product.cost;
  const marginPct = product.price > 0 ? (profit / product.price) * 100 : 0;
  const adjQtyN = Math.floor(parsePrice(adjQty));
  const adjDelta = adjMode === "add" ? adjQtyN : -adjQtyN;
  const newStock = Math.max(0, product.stock + adjDelta);
  // a batched product's on-hand figure is the sum of its batches, never a
  // separate number that can drift away from them; a product that owns no
  // batch yet still holds its own count
  const ownsBatches = productBatches.length > 0;
  const onHand = ownsBatches ? batchStock(batches, pid) : product.stock;
  const batchQtyN = Math.round(parsePrice(batchQty));
  const batchNoOk = batchNo.trim().length > 0;
  const batchQtyOk =
    batchQty.trim() !== "" && batchQtyN >= 0 && (editBatch !== null || batchQtyN > 0);
  const batchOk = batchNoOk && batchQtyOk;
  const batchToDelete = confirmBatch ? batches.find((b) => b.id === confirmBatch) : undefined;

  const openAdj = () => {
    setAdjMode("add");
    setAdjQty("");
    setAdjReason(null);
    setAdjNote("");
    setAdjOpen(true);
  };

  const saveAdj = () => {
    if (!adjReason || adjQtyN <= 0) return;
    usePos.getState().adjustStock(product.id, adjDelta, adjReason, adjNote.trim() || undefined);
    usePos.getState().toast(`Stock ${adjMode === "add" ? "added" : "removed"} — now ${newStock}`, "ok");
    setAdjOpen(false);
  };

  const openAddBatch = () => {
    setEditBatch(null);
    setBatchNo("");
    setBatchExpiry("");
    setBatchQty("");
    setBatchCost(product.cost > 0 ? String(product.cost) : "");
    setBatchTouched(false);
    setBatchOpen(true);
  };

  const openEditBatch = (b: Batch) => {
    setEditBatch(b);
    setBatchNo(b.batchNo);
    setBatchExpiry(b.expiry);
    setBatchQty(String(b.qty));
    setBatchCost(b.cost > 0 ? String(b.cost) : "");
    setBatchTouched(false);
    setBatchOpen(true);
  };

  const saveBatch = () => {
    setBatchTouched(true);
    if (!batchOk) return;
    usePos.getState().upsertBatch({
      ...(editBatch ? { id: editBatch.id } : {}),
      productId: product.id,
      batchNo: batchNo.trim(),
      expiry: batchExpiry,
      qty: batchQtyN,
      cost: Math.max(0, parsePrice(batchCost)),
    });
    setBatchOpen(false);
  };

  return (
    <div className="anim-fade">
      <ScreenHeader
        title={product.name}
        onBack
        right={
          <>
            <Link href={`/inventory/edit?id=${product.id}`} aria-label="Edit product">
              <span className="press flex size-10 items-center justify-center rounded-full text-ink2 hover:bg-surface2">
                <Pencil className="size-[18px]" />
              </span>
            </Link>
            <IconButton label="Delete product" onClick={() => setConfirmDel(true)}>
              <Trash2 className="size-[18px]" />
            </IconButton>
          </>
        }
      />

        <section className="px-5 pt-4 pb-24">
        <Card className="p-0 pb-4">
          <ProductArt
            imageUrl={product.imageUrl}
            name={product.name}
            className="h-44 w-full rounded-none"
          />
          <div className="flex items-center gap-3 px-4 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-ink">{product.name}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: hueColor(category?.color) }} />
                <span className="text-[14px] text-ink3">{category?.name ?? "No category"}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 border-t border-line/60 px-4 pt-2.5">
            <DataRow label="SKU" value={product.sku || "—"} />
            <DataRow label="Barcode" value={product.barcode || "—"} />
            <DataRow label="Category" value={category?.name ?? "—"} />
            <DataRow label="Unit" value={product.unit} />
            <DataRow label="Created" value={dateShort(product.createdAt)} />
            <DataRow label="Updated" value={dateTime(product.updatedAt)} />
          </div>
        </Card>

        <Card className="mt-2.5 p-4">
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="min-w-0">
              <p className="text-[14px] text-ink2">Cost</p>
              <p className="tabnum mt-0.5 truncate text-[16px] font-semibold text-ink2">{fmtMoney(product.cost)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] text-ink2">Selling</p>
              <p className="tabnum mt-0.5 truncate text-[16px] font-bold text-ink">{fmtMoney(product.price)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] text-ink2">Margin</p>
              <p
                className={cn(
                  "tabnum mt-0.5 truncate text-[16px] font-bold",
                  profit > 0 ? "text-accent" : profit < 0 ? "text-danger" : "text-ink3",
                )}
              >
                {fmtMoney(profit)}
              </p>
              <p
                className={cn(
                  "tabnum text-[13px] font-semibold",
                  profit > 0 ? "text-accent" : profit < 0 ? "text-danger" : "text-ink3",
                )}
              >
                {marginPct > 0 ? "+" : ""}
                {marginPct.toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-2.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] text-ink2">On hand</p>
              <p className="mt-1 tabnum text-[30px]/8 font-extrabold tracking-[-0.03em] text-ink">
                {onHand}
                <span className="ml-1.5 text-[14px] font-semibold text-ink3">{product.unit}</span>
              </p>
              <p className="mt-1 text-[12px] text-ink3">
                {isPharmacy
                  ? `${productBatches.length} batch${productBatches.length === 1 ? "" : "es"} · Alert at ${product.lowStockAt} ${product.unit}`
                  : `Alert at ${product.lowStockAt} ${product.unit}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {onHand <= 0 ? <StatusPill status="out" /> : onHand <= product.lowStockAt ? <StatusPill status="low" /> : null}
              {onHand <= product.lowStockAt && (
                <span className="flex items-center gap-1 text-[13px] font-medium text-warn">
                  <TriangleAlert className="size-3.5" />
                  {onHand > 0 ? "Running low" : "Out of stock"}
                </span>
              )}
            </div>
          </div>
          {/* a batched product owns its stock through its batches — the rows
              below are the only place its quantity can be changed */}
          {!isPharmacy && (
            <Button block icon={<ArrowUpDown className="size-4" />} className="mt-3" onClick={openAdj}>
              Adjust stock
            </Button>
          )}
        </Card>

        {isPharmacy && (
          <Card inset className="mt-2.5">
            <CardTitle
              right={
                <Button variant="soft" size="sm" icon={<Plus className="size-4" />} onClick={openAddBatch}>
                  Add batch
                </Button>
              }
            >
              Batches
            </CardTitle>
            {productBatches.length === 0 ? (
              <EmptyState
                icon={<Layers className="size-7" />}
                title="No batches yet"
                hint="Add the batch a delivery came in with — its number, expiry and quantity."
                action={<Button onClick={openAddBatch}>Add batch</Button>}
                className="py-10"
              />
            ) : (
              productBatches.map((b) => {
                const days = daysToExpiry(b.expiry, now);
                const expired = days !== null && days < 0;
                const risky = expired || (days !== null && days <= 90);
                const when =
                  days === null
                    ? "No expiry"
                    : expired
                      ? `Expired ${expiryDate(b.expiry)}`
                      : days <= 90
                        ? `Expires in ${days}d · ${expiryDate(b.expiry)}`
                        : `Expires ${expiryDate(b.expiry)}`;
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        risky ? "bg-danger/10 text-danger" : "bg-accentsoft text-accent",
                      )}
                    >
                      <Layers className="size-[17px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-semibold leading-tight text-ink">
                        {b.batchNo || "Unnumbered batch"}
                      </p>
                      <p className={cn("mt-0.5 truncate text-[14px]", risky ? "text-danger" : "text-ink3")}>
                        {when}
                        <span className="tabnum text-ink3"> · {fmtMoney(b.cost)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <span className="tabnum mr-1 text-[17px] font-bold text-ink">{b.qty}</span>
                      <IconButton label={`Edit batch ${b.batchNo}`} onClick={() => openEditBatch(b)}>
                        <Pencil className="size-[17px]" />
                      </IconButton>
                      <IconButton label={`Delete batch ${b.batchNo}`} onClick={() => setConfirmBatch(b.id)}>
                        <Trash2 className="size-[17px]" />
                      </IconButton>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        )}

        <Card inset className="mt-2.5">
          <div className="px-4 pt-4 pb-1">
            <h3 className="text-[15px] font-medium text-ink2">Stock moves</h3>
            <p className="text-[14px] text-ink3">{moves.length} record{moves.length === 1 ? "" : "s"}</p>
          </div>
          {moves.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="No stock movement yet"
              hint="Adjustments and sales will show up here."
              className="py-10"
            />
          ) : (
            moves.map((m) => {
              const batchNo = m.batchId ? batchNoById.get(m.batchId) : undefined;
              // a batch move's ref repeats the batch number already shown beside
              // the label, so it is dropped rather than printed twice
              const ref = m.ref ?? "";
              const showRef = ref !== "" && ref !== (batchNo ? `batch ${batchNo}` : "");
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl",
                      m.qty > 0 ? "bg-accentsoft text-accent" : m.qty < 0 ? "bg-danger/10 text-danger" : "bg-ink2/10 text-ink2",
                    )}
                  >
                    {m.qty > 0 ? <ArrowUpFromLine className="size-[17px]" /> : <ArrowDownToLine className="size-[17px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold leading-tight text-ink">
                      {moveLabel[m.reason]}
                      {batchNo && <span className="ml-1.5 text-[14px] font-medium text-ink2">{batchNo}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] text-ink3">{showRef ? ref : "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "tabnum text-[17px] font-bold",
                        m.qty > 0 ? "text-accent" : m.qty < 0 ? "text-danger" : "text-ink3",
                      )}
                    >
                      {m.qty > 0 ? "+" : ""}
                      {m.qty}
                    </p>
                    <p className="text-[14px] text-ink3">{timeOf(m.t)} · {dateShort(m.t)}</p>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      <Sheet
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        title="Adjust stock"
        footer={
          <Button block onClick={saveAdj} disabled={!adjReason || adjQtyN <= 0}>
            Save
          </Button>
        }
      >
        <div className="flex gap-1.5 pb-3">
          <Chip active={adjMode === "add"} onClick={() => setAdjMode("add")} className="flex-1 justify-center">
            <ArrowUpFromLine className="size-4" /> Add stock
          </Chip>
          <Chip active={adjMode === "remove"} onClick={() => setAdjMode("remove")} className="flex-1 justify-center">
            <ArrowDownToLine className="size-4" /> Remove stock
          </Chip>
        </div>

        <div className="rounded-2xl border border-line/70 bg-surface2 px-4 py-3 text-center">
          <p className="tabnum text-[30px]/8 font-extrabold tracking-[-0.03em] text-ink">
            {adjQty || "0"}
            <span className="ml-1 text-[14px] font-semibold text-ink3">{product.unit}</span>
          </p>
          {adjQtyN > 0 && (
            <p className="tabnum mt-0.5 text-[13px] font-semibold text-accent">
              → {newStock} in stock
            </p>
          )}
        </div>

        <div className="no-scrollbar -mx-5 mt-3 overflow-x-auto px-5">
          <div className="flex w-max gap-1.5">
            {adjReasons.map((r) => (
              <Chip key={r.value} active={adjReason === r.value} onClick={() => setAdjReason(r.value)}>
                {r.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Input
            label="Note (optional)"
            placeholder="e.g. damaged by water"
            value={adjNote}
            onChange={(e) => setAdjNote(e.target.value)}
          />
        </div>

        <NumberPad
          className="mt-3"
          onDigit={(d) => {
            if (d === "." ? adjQty.includes(".") : adjQty === "0") return;
            setAdjQty((q) => (q.length >= 6 ? q : q === "0" ? d : q + d));
          }}
          onDelete={() => setAdjQty((q) => q.slice(0, -1))}
        />
      </Sheet>

      <Sheet
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title={editBatch ? "Edit batch" : "Add batch"}
        footer={
          <Button block onClick={saveBatch} disabled={!batchOk}>
            {editBatch ? "Save batch" : "Add batch"}
          </Button>
        }
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <Input
            label="Batch number"
            placeholder="e.g. B-2411"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            onBlur={() => setBatchTouched(true)}
            error={batchTouched && !batchNoOk ? "Batch number is required" : undefined}
          />
          <Input
            label="Expiry date"
            type="date"
            value={batchExpiry}
            onChange={(e) => setBatchExpiry(e.target.value)}
            hint="Leave empty if this product has no expiry."
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Quantity"
              inputMode="numeric"
              className="tabnum"
              placeholder="0"
              value={batchQty}
              onChange={(e) => setBatchQty(e.target.value)}
              onBlur={() => setBatchTouched(true)}
              error={batchTouched && !batchQtyOk ? "Enter a quantity" : undefined}
            />
            <Input
              label="Cost"
              inputMode="decimal"
              money
              leading={<span className="text-[15px] font-semibold text-ink3">{CURRENCY_SYMBOL}</span>}
              placeholder="0.00"
              value={batchCost}
              onChange={(e) => setBatchCost(e.target.value)}
            />
          </div>
          <p className="text-[13px] leading-5 text-ink3">
            Stock on hand is the sum of every batch of this product.
          </p>
        </div>
      </Sheet>

      <Confirm
        open={confirmBatch !== null}
        onClose={() => setConfirmBatch(null)}
        onConfirm={() => {
          if (confirmBatch) usePos.getState().deleteBatch(confirmBatch);
        }}
        title="Delete batch?"
        body={`Batch "${batchToDelete?.batchNo || "—"}" will be removed and its ${batchToDelete?.qty ?? 0} ${product.unit} taken off the shelf.`}
        confirmLabel="Delete"
        tone="danger"
      />

      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => {
          usePos.getState().deleteProduct(product.id);
          router.back();
        }}
        title="Delete product?"
        body={`"${product.name}" will be removed from your catalogue. Past orders keep their records.`}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 py-2">
      <p className="text-[14px] text-ink3">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">{value}</p>
    </div>
  );
}

/** "2027-03-12" → "12 Mar 2027" (parsed as UTC so the day never shifts) */
function expiryDate(expiry: string): string {
  const d = new Date(`${expiry}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return expiry;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
