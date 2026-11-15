"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input } from "@/components/ui/input";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Sheet } from "@/components/ui/sheet";
import { hasFeature } from "@/lib/features";
import { fmtMoney, CURRENCY_SYMBOL, parsePrice } from "@/lib/money";
import { usePos, useSettings } from "@/lib/store";
import { Pencil, Plus, Ticket, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Package, Product } from "@/lib/types";

export default function PackagesScreen() {
  const router = useRouter();
  const hydrated = usePos((s) => s.hydrated);
  const settings = useSettings();
  const packages = usePos((s) => s.packages);
  const products = usePos((s) => s.products);
  const deletePackage = usePos((s) => s.deletePackage);

  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Package | null>(null);

  if (!hydrated) return null;

  if (!hasFeature(settings.businessType, "packages")) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Packages" onBack />
        <section className="px-5 pt-4">
          <EmptyState
            icon={<Ticket className="size-7" />}
            title="No packages here"
            hint="Service packages belong to a salon. Change the shop type to sell visits in bundles."
            action={
              <Button variant="secondary" onClick={() => router.push("/settings/shop")}>
                Shop details
              </Button>
            }
          />
        </section>
      </div>
    );
  }

  const services = products.filter((p) => p.kind === "service" && p.active);

  return (
    <div className="anim-fade px-5 pt-4">
      <div className="safe-t" />
      <header>
        <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Packages</h1>
        <p className="mt-0.5 text-[15px] text-ink3">
          {packages.length} package{packages.length === 1 ? "" : "s"}
        </p>
      </header>

      <section className="mt-4 pb-28">
        {packages.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ticket className="size-7" />}
              title="No packages yet"
              hint="Bundle a few services into a package — the client pays once and spends the credits over visits."
              action={
                <Button
                  icon={<Plus className="size-4" />}
                  onClick={() => {
                    setEditId(null);
                    setCreating(true);
                  }}
                >
                  New package
                </Button>
              }
            />
          </Card>
        ) : (
          <Card inset>
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setEditId(pkg.id);
                  setCreating(false);
                }}
                className="press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accentsoft text-accent">
                  <Ticket className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-ink">{pkg.name}</span>
                  <span className="mt-0.5 block truncate text-[14px] text-ink3">
                    {summaryOf(pkg, products)}
                  </span>
                </span>
                <span className="tabnum shrink-0 text-[17px] font-bold text-ink">
                  {fmtMoney(pkg.price)}
                </span>
                <Pencil className="size-4 shrink-0 text-ink3" />
              </button>
            ))}
          </Card>
        )}
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nova-sab)+142px)] z-40 mx-auto flex max-w-[440px] justify-end px-5">
        <button
          onClick={() => {
            setEditId(null);
            setCreating(true);
          }}
          aria-label="New package"
          className="press pointer-events-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accentink"
        >
          <Plus className="size-6" />
        </button>
      </div>

      {(editId !== null || creating) && (
        <PackageFormSheet
          pkg={editId ? (packages.find((p) => p.id === editId) ?? null) : null}
          services={services}
          onClose={() => {
            setEditId(null);
            setCreating(false);
          }}
          askDelete={() => {
            const pkg = packages.find((p) => p.id === editId);
            if (pkg) setConfirmDelete(pkg);
          }}
        />
      )}

      <Confirm
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deletePackage(confirmDelete.id);
          setConfirmDelete(null);
          setEditId(null);
          setCreating(false);
        }}
        tone="danger"
        title="Delete package?"
        body={
          confirmDelete
            ? `${confirmDelete.name} can no longer be sold. Clients keep the credits they already own.`
            : ""
        }
        confirmLabel="Delete"
      />
    </div>
  );
}

/** "4 × Gel Manicure, 2 × Full Braids" — what the package carries. */
function summaryOf(pkg: Package, products: Product[]): string {
  if (pkg.credits.length === 0) return "Nothing in it yet";
  return pkg.credits
    .map((c) => `${c.qty} × ${products.find((p) => p.id === c.productId)?.name ?? "Service"}`)
    .join(", ");
}

type CreditDraft = { productId: string; qty: number };

function PackageFormSheet({
  pkg,
  services,
  onClose,
  askDelete,
}: {
  pkg: Package | null;
  services: Product[];
  onClose: () => void;
  askDelete: () => void;
}) {
  const upsertPackage = usePos((s) => s.upsertPackage);
  const [name, setName] = useState(pkg?.name ?? "");
  const [price, setPrice] = useState(pkg ? String(pkg.price) : "");
  const [credits, setCredits] = useState<CreditDraft[]>(
    pkg?.credits.map((c) => ({ productId: c.productId, qty: c.qty })) ?? [],
  );
  const [error, setError] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const nameOk = name.trim().length > 0;
  const priceOk = parsePrice(price) > 0;
  const creditsOk = credits.every((c) => c.productId !== "" && c.qty > 0);

  function save() {
    if (!nameOk) {
      setError("Give the package a name");
      return;
    }
    if (!priceOk) {
      setError("The package needs a price above zero");
      return;
    }
    if (!creditsOk) {
      setError("Every credit line needs a service and a quantity");
      return;
    }
    upsertPackage({
      ...(pkg?.id ? { id: pkg.id } : {}),
      name: name.trim(),
      price: parsePrice(price),
      credits: credits
        .filter((c) => c.productId !== "")
        .map((c) => ({ productId: c.productId, qty: c.qty })),
    });
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={pkg ? "Edit package" : "New package"}
      height="tall"
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          {pkg && (
            <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={askDelete}>
              Delete
            </Button>
          )}
          <Button block onClick={save}>
            {pkg ? "Save changes" : "Add package"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5 pb-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. Nails ×4"
          error={error || undefined}
        />
        <Input
          label="Price"
          money
          inputMode="decimal"
          leading={
            <span className="tabnum text-[15px] font-semibold text-ink3">{CURRENCY_SYMBOL}</span>
          }
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            if (error) setError("");
          }}
          placeholder="0.00"
          hint="What the client pays once. Credits are then spent over visits."
        />

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink2">Credits</span>
            <span className="text-[12px] text-ink3">
              {credits.reduce((s, c) => s + c.qty, 0)} credit
              {credits.reduce((s, c) => s + c.qty, 0) === 1 ? "" : "s"}
            </span>
          </div>
          {credits.length === 0 ? (
            <p className="rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[14px] leading-5 text-ink2">
              Nothing in this package yet — add the services it carries.
            </p>
          ) : (
            <Card inset>
              {credits.map((c, i) => {
                const p = services.find((s) => s.id === c.productId);
                return (
                  <div key={`${c.productId}-${i}`} className="flex items-center gap-2 px-3.5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-ink">
                        {p?.name ?? "Service"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <button
                        aria-label={`Fewer ${p?.name ?? "credits"}`}
                        onClick={() =>
                          setCredits((rows) =>
                            rows.map((r, j) =>
                              j === i ? { ...r, qty: Math.max(1, r.qty - 1) } : r,
                            ),
                          )
                        }
                        className="press flex size-8 items-center justify-center rounded-lg bg-surface2 text-[18px] text-ink2"
                      >
                        −
                      </button>
                      <span className="tabnum w-6 text-center text-[15px] font-bold text-ink">
                        {c.qty}
                      </span>
                      <button
                        aria-label={`More ${p?.name ?? "credits"}`}
                        onClick={() =>
                          setCredits((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, qty: r.qty + 1 } : r)),
                          )
                        }
                        className="press flex size-8 items-center justify-center rounded-lg bg-surface2 text-[18px] text-ink2"
                      >
                        +
                      </button>
                    </span>
                    <IconButton
                      label={`Remove ${p?.name ?? "credit"}`}
                      onClick={() => setCredits((rows) => rows.filter((_, j) => j !== i))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>
                );
              })}
            </Card>
          )}
          <Button
            variant="soft"
            size="sm"
            icon={<Plus className="size-4" />}
            className="mt-2.5"
            disabled={services.length === 0}
            onClick={() => setPickOpen(true)}
          >
            Add service
          </Button>
        </div>
      </div>

      <Sheet open={pickOpen} onClose={() => setPickOpen(false)} title="Add a service" height="auto">
        <Card inset>
          {services.map((p) => {
            const used = credits.some((c) => c.productId === p.id);
            return (
              <button
                key={p.id}
                disabled={used}
                onClick={() => {
                  setCredits((rows) => [...rows, { productId: p.id, qty: 1 }]);
                  setPickOpen(false);
                }}
                className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50 disabled:opacity-40"
              >
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[17px] font-semibold text-ink">{p.name}</span>
                  <span className="block text-[13px] text-ink3">{fmtMoney(p.price)}</span>
                </span>
                {used && <span className="text-[13px] font-medium text-ink3">Added</span>}
              </button>
            );
          })}
          {services.length === 0 && (
            <p className="px-4 py-6 text-center text-[14px] text-ink3">
              No services yet — mark items as services in Inventory first.
            </p>
          )}
        </Card>
      </Sheet>
    </Sheet>
  );
}
