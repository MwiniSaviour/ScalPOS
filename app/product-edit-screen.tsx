"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Input } from "@/components/ui/input";
import { ProductArt } from "@/components/ui/productart";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { CURRENCY_SYMBOL, fmtMoney, parsePrice } from "@/lib/money";
import { scanBarcode } from "@/lib/barcode";
import { hasFeature } from "@/lib/features";
import { deleteImageBlob, IMAGE_PREFIX, processImageFile, saveImageBlob } from "@/lib/image-store";
import { usePos, useSettings } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn, hueColor, hueSoft } from "@/lib/ui";
import { Barcode, Camera, Check, ImagePlus, Link2, Package, Pill, Plus, ScanLine, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

const UNITS: { value: Product["unit"]; label: string }[] = [
  { value: "pcs", label: "Pcs" },
  { value: "kg", label: "Kg" },
  { value: "bag", label: "Bag" },
  { value: "box", label: "Box" },
  { value: "ltr", label: "Ltr" },
  { value: "pack", label: "Pack" },
];

/** A pack row while it is being edited — the factor stays a string until save. */
type PackDraft = { name: string; factor: string };

export default function ProductEditScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id") ?? "";
  const hydrated = usePos((s) => s.hydrated);
  const existing = usePos((s) => s.products.find((p) => p.id === editId));
  const categories = usePos((s) => s.categories);
  const batches = usePos((s) => s.batches);
  const settings = useSettings();

  const editing = existing ?? null;
  const isNew = editId === "";

  const isPharmacy = hasFeature(settings.businessType, "batches");
  // a product that owns batches takes its stock from them — the raw number
  // must not be editable here or it would land on the earliest batch
  const ownsBatches = batches.some((b) => b.productId === editId);

  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? "");
  const [linkValue, setLinkValue] = useState(
    editing?.imageUrl && !editing.imageUrl.startsWith("idb:") ? editing.imageUrl : "",
  );
  const [linkOpen, setLinkOpen] = useState(
    Boolean(editing?.imageUrl && !editing.imageUrl.startsWith("idb:")),
  );
  const [busy, setBusy] = useState(false);
  const galleryInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(editing?.name ?? "");
  const [catId, setCatId] = useState<string>(editing?.categoryId ?? "");
  const [cost, setCost] = useState(editing ? String(editing.cost) : "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [stock, setStock] = useState(editing ? String(editing.stock) : "");
  const [lowAt, setLowAt] = useState(String(editing?.lowStockAt ?? 5));
  const [sku, setSku] = useState(editing?.sku ?? "");
  const [barcode, setBarcode] = useState(
    editing?.barcode ?? (isNew ? (params.get("barcode") ?? "") : ""),
  );
  const [unit, setUnit] = useState<Product["unit"]>(editing?.unit ?? "pcs");
  const [rxOnly, setRxOnly] = useState(editing?.prescriptionOnly ?? false);
  const [controlled, setControlled] = useState(editing?.controlled ?? false);
  const [packs, setPacks] = useState<PackDraft[]>(
    (editing?.packs ?? []).map((p) => ({ name: p.name, factor: String(p.factor) })),
  );
  const [touched, setTouched] = useState<{ name?: boolean; price?: boolean }>({});
  const [catOpen, setCatOpen] = useState(false);

  const nameOk = name.trim().length > 0;
  const priceN = parsePrice(price);
  const costN = parsePrice(cost);
  const priceOk = priceN > 0;
  const valid = nameOk && priceOk;
  const profit = priceN - costN;
  const profitPct = priceN > 0 ? (profit / priceN) * 100 : 0;
  const baseUnit = UNITS.find((u) => u.value === unit)?.label ?? unit;

  if (!hydrated) return null;

  if (!isNew && !editing) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Product" onBack />
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

  const handlePhoto = async (file: File) => {
    setBusy(true);
    try {
      const blob = await processImageFile(file);
      const ref = await saveImageBlob(blob);
      setImageUrl(ref);
      setLinkValue("");
      setLinkOpen(false);
    } catch (err) {
      usePos.getState().toast(
        err instanceof Error ? err.message : "Could not attach that photo",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearPhoto = () => {
    setImageUrl("");
    setLinkValue("");
    setLinkOpen(false);
  };

  const scanBarcodeField = async () => {
    const code = await scanBarcode();
    if (!code) return;
    const owner = usePos
      .getState()
      .products.find((p) => p.id !== editId && p.barcode.toLowerCase() === code.toLowerCase());
    if (owner) {
      usePos.getState().toast(`That barcode is already on ${owner.name}`, "warn");
      return;
    }
    setBarcode(code);
    usePos.getState().toast(`Barcode set: ${code}`, "ok");
  };

  const save = () => {
    setTouched({ name: true, price: true });
    if (!valid) return;
    const finalImage = linkOpen && linkValue.trim() ? linkValue.trim() : imageUrl.trim();
    // A pasted data: URL would fill the localStorage quota and stop the whole
    // register from persisting — reject it and point at the upload instead.
    if (finalImage.startsWith("data:")) {
      usePos.getState().toast("That image link is too big to store — upload the photo instead", "error");
      return;
    }
    if (finalImage.length > 2048) {
      usePos.getState().toast("That image link is too long", "error");
      return;
    }
    const stockN = Math.max(0, Math.round(parsePrice(stock)));
    const packList = packs
      .map((p) => ({ name: p.name.trim(), factor: Math.round(parsePrice(p.factor)) }))
      .filter((p) => p.name !== "" && p.factor > 0);
    usePos.getState().upsertProduct({
      ...(editing ? { id: editing.id } : {}),
      name: name.trim(),
      categoryId: catId || null,
      cost: costN,
      price: priceN,
      // a batched product keeps the stock its batches already give it
      ...(ownsBatches ? {} : { stock: stockN }),
      lowStockAt: Math.max(0, Math.round(parsePrice(lowAt))),
      unit,
      sku: sku.trim(),
      barcode: barcode.trim(),
      imageUrl: finalImage,
      description: editing?.description ?? "",
      active: editing?.active ?? true,
      ...(isPharmacy
        ? { prescriptionOnly: rxOnly, controlled, packs: packList }
        : {}),
    });
    // the previous photo is no longer referenced by this product
    const previous = editing?.imageUrl ?? "";
    if (previous && previous !== finalImage && previous.startsWith(IMAGE_PREFIX)) {
      void deleteImageBlob(previous);
    }
    router.back();
  };

  return (
    <div className="anim-fade">
      <ScreenHeader title={isNew ? "New product" : "Edit product"} onBack={() => router.back()} />

      <section className="px-5 pt-4 pb-28">
        <Card className="p-4">
          <p className="text-[15px] font-medium text-ink2">Photo</p>
          <div className="mt-3 flex items-center gap-3.5">
            <ProductArt imageUrl={imageUrl} name={name} className="size-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5 text-ink3">
                {imageUrl
                  ? "Photo attached to this item."
                  : "Add a photo so staff recognise the item at a glance."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              icon={<ImagePlus className="size-4" />}
              onClick={() => galleryInput.current?.click()}
              loading={busy}
            >
              Choose photo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Camera className="size-4" />}
              onClick={() => cameraInput.current?.click()}
              disabled={busy}
            >
              Take photo
            </Button>
            {imageUrl && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={clearPhoto}>
                Remove
              </Button>
            )}
          </div>
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handlePhoto(f);
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handlePhoto(f);
            }}
          />
          <button
            type="button"
            onClick={() => setLinkOpen((v) => !v)}
            className="press mt-3 flex w-full items-center gap-1.5 text-[12px] font-medium text-ink3"
          >
            <Link2 className="size-3.5" />
            {linkOpen ? "Hide image link" : "Use an image link instead"}
          </button>
          {linkOpen && (
            <div className="mt-2.5">
              <Input
                label="Image link"
                placeholder="https://…"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                hint={linkValue.trim() ? "" : "Optional — a photo uploaded above is usually easier."}
              />
            </div>
          )}
        </Card>

        <Card className="mt-2.5 p-4">
          <p className="text-[15px] font-medium text-ink2">Basics</p>
          <div className="mt-2.5">
            <Input
              label="Name"
              placeholder="e.g. Bruno rice 5kg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              error={touched.name && !nameOk ? "Name is required" : undefined}
            />
          </div>
          <button
            onClick={() => setCatOpen(true)}
            className="press mt-3 flex h-12 w-full items-center gap-2.5 rounded-xl border border-line2 bg-surface2 px-3.5 text-left"
          >
            {catId ? (
              <span className="flex items-center gap-2 text-[15px] text-ink">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: hueColor(categories.find((c) => c.id === catId)?.color) }}
                />
                {categories.find((c) => c.id === catId)?.name ?? "No category"}
              </span>
            ) : (
              <span className="text-[15px] text-ink2">No category</span>
            )}
            <span className="ml-auto text-[12px] font-medium text-accent">Choose</span>
          </button>
        </Card>

        <Card className="mt-2.5 p-4">
          <p className="text-[15px] font-medium text-ink2">Pricing · ₵</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <Input
              label="Cost price"
              inputMode="decimal"
              money
              leading={<CediSign />}
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <Input
              label="Selling price"
              inputMode="decimal"
              money
              leading={<CediSign />}
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, price: true }))}
              error={touched.price && !priceOk ? "Selling price must be above ₵0" : undefined}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line/60 pt-2.5">
            <span className="text-[13px] text-ink3">Profit per unit</span>
            <span
              className={cn(
                "tabnum text-[15px] font-bold",
                profit > 0 ? "text-accent" : profit < 0 ? "text-danger" : "text-ink3",
              )}
            >
              {profit > 0 ? "+" : ""}
              {fmtMoney(profit)}
              {priceN > 0 && (
                <span className="ml-1.5 text-[12px] font-semibold">
                  ({profitPct > 0 ? "+" : ""}
                  {profitPct.toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-ink3">
            {
              settings.taxRate > 0
                ? settings.taxInclusive
                  ? `Prices include ${settings.taxRate.toFixed(1)}% tax`
                  : `${settings.taxRate.toFixed(1)}% tax is added at checkout`
                : "No tax is applied to prices."
            }
          </p>
        </Card>

        <Card className="mt-2.5 p-4">
          <p className="text-[15px] font-medium text-ink2">Stock</p>
          {ownsBatches ? (
            <div className="mt-2.5 flex flex-col gap-2.5">
              <p className="rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[14px] leading-5 text-ink2">
                Stock comes from the batches.
              </p>
              <Input
                label="Low-stock alert"
                inputMode="numeric"
                className="tabnum"
                placeholder="5"
                value={lowAt}
                onChange={(e) => setLowAt(e.target.value)}
                hint="Stock reduces when sold."
              />
            </div>
          ) : (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <Input
                label={editing ? "Stock on hand" : "Opening stock"}
                inputMode="numeric"
                className="tabnum"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              <Input
                label="Low-stock alert"
                inputMode="numeric"
                className="tabnum"
                placeholder="5"
                value={lowAt}
                onChange={(e) => setLowAt(e.target.value)}
                hint="Stock reduces when sold."
              />
            </div>
          )}
          {isPharmacy && !ownsBatches && (
            <p className="mt-2 text-[12px] leading-5 text-ink3">
              Pharmacy stock is tracked in batches — add a batch to record its expiry.
            </p>
          )}
          <p className="mt-2.5 mb-1.5 text-[13px] font-medium text-ink2">Unit</p>
          <Segmented value={unit} onChange={setUnit} options={UNITS} />
        </Card>

        {isPharmacy && (
          <Card className="mt-2.5 p-4">
            <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink2">
              <Pill className="size-4" /> Pharmacy
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">Prescription only</p>
                <p className="text-[13px] text-ink3">Checkout asks for the prescription reference</p>
              </div>
              <button
                role="switch"
                aria-checked={rxOnly}
                onClick={() => setRxOnly((v) => !v)}
                className={cn(
                  "press relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  rxOnly ? "bg-accent" : "bg-ink4/40",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-5 rounded-full bg-surface transition-all",
                    rxOnly ? "left-6" : "left-1",
                  )}
                />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">Controlled drug</p>
                <p className="text-[13px] text-ink3">Sold under a controlled-medicine record</p>
              </div>
              <button
                role="switch"
                aria-checked={controlled}
                onClick={() => setControlled((v) => !v)}
                className={cn(
                  "press relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  controlled ? "bg-accent" : "bg-ink4/40",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-5 rounded-full bg-surface transition-all",
                    controlled ? "left-6" : "left-1",
                  )}
                />
              </button>
            </div>

            <div className="mt-3 border-t border-line/60 pt-3">
              <p className="text-[13px] font-medium text-ink2">Packs</p>
              <p className="mt-0.5 text-[12px] leading-5 text-ink3">
                Sell this item in packs. The base unit is {baseUnit} — a pack&rsquo;s factor says how many of
                them it holds.
              </p>
              {packs.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex items-end gap-2">
                    <p className="flex-1 text-[13px] font-medium text-ink2">Pack</p>
                    <p className="w-20 text-[13px] font-medium text-ink2">Units</p>
                    <span className="size-11 shrink-0" />
                  </div>
                  {packs.map((p, i) => (
                    <div key={i} className="mt-2 flex items-end gap-2">
                      <Input
                        placeholder="Box of 10"
                        value={p.name}
                        onChange={(e) =>
                          setPacks((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="flex-1"
                      />
                      <Input
                        inputMode="numeric"
                        className="tabnum w-20"
                        placeholder="10"
                        value={p.factor}
                        onChange={(e) =>
                          setPacks((ps) => ps.map((x, j) => (j === i ? { ...x, factor: e.target.value } : x)))
                        }
                      />
                      <IconButton
                        label={`Remove ${p.name || "pack"}`}
                        onClick={() => setPacks((ps) => ps.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-[17px]" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="soft"
                size="sm"
                icon={<Plus className="size-4" />}
                className="mt-2.5"
                onClick={() => setPacks((ps) => [...ps, { name: "", factor: "" }])}
              >
                Add pack
              </Button>
            </div>
          </Card>
        )}

        <Card className="mt-2.5 p-4">
          <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink2">
            <Barcode className="size-4" /> Barcode &amp; SKU
          </p>
          <div className="mt-2.5">
            <Input
              label="Barcode"
              inputMode="numeric"
              placeholder="GD1234567"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              trailing={
                <span className="flex items-center gap-0.5">
                  <IconButton
                    label="Scan barcode"
                    className="size-8 text-ink2 hover:bg-surface3"
                    onClick={() => void scanBarcodeField()}
                  >
                    <ScanLine className="size-[17px]" />
                  </IconButton>
                  <IconButton
                    label="Generate barcode"
                    className="size-8 text-ink2 hover:bg-surface3"
                    onClick={() => setBarcode(`GD${String(Date.now()).slice(-7)}`)}
                  >
                    <span className="text-[12px] font-semibold">Gen</span>
                  </IconButton>
                </span>
              }
            />
          </div>
          <div className="mt-2.5">
            <Input
              label="SKU (optional)"
              placeholder="e.g. RICE-5KG"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
        </Card>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[calc(var(--nova-sab)+12px)] pt-3">
        <div className="mx-auto grid max-w-[440px] grid-cols-2 gap-2.5 px-4">
          <Button variant="secondary" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button size="lg" onClick={save} disabled={!valid}>
            Save
          </Button>
        </div>
      </div>

      <Sheet open={catOpen} onClose={() => setCatOpen(false)} title="Choose category">
        <div className="pb-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCatId(c.id);
                setCatOpen(false);
              }}
              className="press flex w-full items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface2"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: hueSoft(c.color) }}
              >
                <span className="size-3 rounded-full" style={{ background: hueColor(c.color) }} />
              </span>
              <span className="flex-1 text-left text-[14px] font-semibold text-ink">{c.name}</span>
              {catId === c.id && <Check className="size-4 text-accent" />}
            </button>
          ))}
          <button
            onClick={() => {
              setCatId("");
              setCatOpen(false);
            }}
            className="press mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface2"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink2/10 text-ink2">
              <Package className="size-4" />
            </span>
            <span className="flex-1 text-left text-[14px] font-semibold text-ink">No category</span>
            {catId === "" && <Check className="size-4 text-accent" />}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function CediSign() {
  return <span className="text-[15px] font-semibold text-ink3">{CURRENCY_SYMBOL}</span>;
}
