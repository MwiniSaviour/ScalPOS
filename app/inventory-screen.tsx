"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { SearchBar } from "@/components/ui/input";
import { ProductArt } from "@/components/ui/productart";
import { fmtMoney, fmtqty } from "@/lib/money";
import { scanBarcode } from "@/lib/barcode";
import { hueColor } from "@/lib/ui";
import { usePos } from "@/lib/store";
import { ChevronRight, History, PackageOpen, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function InventoryScreen() {
  const router = useRouter();
  const hydrated = usePos((s) => s.hydrated);
  const products = usePos((s) => s.products);
  const categories = usePos((s) => s.categories);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (sel === "low" && p.stock > p.lowStockAt) return false;
      if (sel !== "all" && sel !== "low" && p.categoryId !== sel) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);
    });
  }, [products, query, sel]);

  const lowCount = useMemo(
    () => products.filter((p) => p.stock <= p.lowStockAt).length,
    [products],
  );

  if (!hydrated) return null;

  const scanToFind = async () => {
    const code = await scanBarcode();
    if (!code) return;
    setSel("all");
    setQuery(code);
  };

  return (
    <div className="anim-fade">
      <ScreenHeader
        title="Inventory"
        subtitle={`${products.length} item${products.length === 1 ? "" : "s"} catalogue`}
        right={
          <Link href="/stock" aria-label="Stock history">
            <span className="press flex size-10 items-center justify-center rounded-full text-ink2 hover:bg-surface2">
              <History className="size-[19px]" />
            </span>
          </Link>
        }
      />

      <section className="px-5 pt-4 pb-40">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search name or SKU"
          onOpenScanner={() => void scanToFind()}
        />

        <div className="edge-fade no-scrollbar -mx-4 mt-2.5 overflow-x-auto px-4">
          <div className="flex w-max gap-1.5">
            <Chip active={sel === "all"} onClick={() => setSel("all")}>
              All
            </Chip>
            <Chip active={sel === "low"} onClick={() => setSel("low")}>
              <TriangleAlert className="size-[15px] shrink-0" />
              Low stock{lowCount > 0 ? ` · ${lowCount}` : ""}
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                color={c.color}
                active={sel === c.id}
                onClick={() => setSel(sel === c.id ? "all" : c.id)}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: hueColor(c.color) }} />
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          products.length === 0 ? (
            <EmptyState
              className="mt-2.5"
              icon={<PackageOpen className="size-7" />}
              title="No products yet"
              hint="Add your first item — name, price and stock — then it's ready to sell."
              action={<Button onClick={() => router.push("/inventory/edit")}>Add product</Button>}
            />
          ) : (
            <EmptyState
              className="mt-2.5"
              icon={<PackageOpen className="size-7" />}
              title="Nothing matches"
              hint={sel === "low" ? "No products are low on stock right now." : "Try a different name, SKU or filter."}
              action={<Button variant="secondary" onClick={() => { setSel("all"); setQuery(""); }}>Clear filters</Button>}
            />
          )
        ) : (
          <Card inset className="mt-2.5">
            {filtered.map((p) => {
              const c = categories.find((x) => x.id === p.categoryId);
              const out = p.stock <= 0;
              const low = !out && p.stock <= p.lowStockAt;
              return (
                <Link
                  key={p.id}
                  href={`/inventory/detail?id=${p.id}`}
                  className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
                >
                  <ProductArt
                    imageUrl={p.imageUrl}
                    name={p.name}
                    className="size-10 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold leading-tight text-ink">{p.name}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[14px] text-ink3">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: hueColor(c?.color) }}
                      />
                      <span className="truncate">{c?.name ?? "No category"}</span>
                      <span className="tabnum shrink-0">
                        {fmtqty(p.stock, p.unit)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tabnum text-[17px] font-bold text-ink">{fmtMoney(p.price)}</span>
                    {out ? (
                      <span className="text-[14px] font-medium text-warn">Out</span>
                    ) : low ? (
                      <span className="text-[14px] font-medium text-warn">Low</span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-[17px] shrink-0 text-ink3" />
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      <Link
        href="/inventory/edit"
        aria-label="Add product"
        className="press fixed right-4 z-40 flex size-14 items-center justify-center rounded-2xl border border-line2 bg-accent text-accentink"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
