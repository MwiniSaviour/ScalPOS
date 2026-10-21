"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input } from "@/components/ui/input";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Sheet } from "@/components/ui/sheet";
import { usePos } from "@/lib/store";
import { TOKEN_COLORS } from "@/lib/ui";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/ui";
import { Pencil, Plus, Shapes, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const PRESET_COLORS = TOKEN_COLORS.map((t) => t.hex);

export default function CategoriesScreen() {
  const hydrated = usePos((s) => s.hydrated);
  const categories = usePos((s) => s.categories);
  const products = usePos((s) => s.products);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [penId, setPenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [delTarget, setDelTarget] = useState<Category | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      if (p.categoryId) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    }
    return m;
  }, [products]);

  if (!hydrated) return null;

  const openAdd = () => {
    setPenId(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setSheetOpen(true);
  };

  const openEdit = (c: Category) => {
    setPenId(c.id);
    setName(c.name);
    setColor(c.color);
    setSheetOpen(true);
  };

  const nameOk = name.trim().length > 0 && !categories.some((c) => c.id !== penId && c.name.toLowerCase() === name.trim().toLowerCase());

  const save = () => {
    if (!nameOk) return;
    usePos.getState().upsertCategory({ ...(penId ? { id: penId } : {}), name: name.trim(), color });
    setSheetOpen(false);
  };

  const requestDelete = (c: Category) => {
    const n = counts.get(c.id) ?? 0;
    if (n > 0) {
      usePos.getState().toast(`Move ${n} product${n === 1 ? "" : "s"} first — this category is in use`, "warn");
      return;
    }
    setDelTarget(c);
  };

  return (
    <div className="anim-fade">
      <ScreenHeader
        title="Categories"
        onBack
        right={
          <IconButton label="Add category" onClick={openAdd}>
            <Plus className="size-[19px]" />
          </IconButton>
        }
      />

      <section className="px-4 pt-2 pb-24">
        {categories.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Shapes className="size-7" />}
              title="No categories yet"
              hint="Group your products — Electronics, Groceries, Toiletries — for faster lookup on the storefront."
              action={<Button onClick={openAdd}>Add category</Button>}
            />
          </Card>
        ) : (
          <Card inset>
            {categories.map((c) => {
              const n = counts.get(c.id) ?? 0;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: c.color + "22" }}
                  >
                    <span className="size-3.5 rounded-full" style={{ background: c.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{c.name}</p>
                    <span className="mt-0.5 block text-[12px] text-ink3">
                      {n} product{n === 1 ? "" : "s"}
                    </span>
                  </div>
                  <IconButton label={`Edit ${c.name}`} onClick={() => openEdit(c)} className="text-ink3">
                    <Pencil className="size-[17px]" />
                  </IconButton>
                  <IconButton label={`Delete ${c.name}`} onClick={() => requestDelete(c)} className="text-ink3 hover:text-danger">
                    <Trash2 className="size-[17px]" />
                  </IconButton>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={penId ? "Edit category" : "New category"}
        footer={
          <Button block onClick={save} disabled={!nameOk}>
            {penId ? "Save category" : "Add category"}
          </Button>
        }
      >
        <div className="pb-2">
          <Input
            label="Name"
            placeholder="e.g. Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <p className="mt-4 mb-2 text-[13px] font-medium text-ink2">Color</p>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                aria-label={`Color ${hex}`}
                onClick={() => setColor(hex)}
                className={cn(
                  "press size-10 rounded-full",
                  color === hex ? "ring-2 ring-accent" : "ring-1 ring-line2",
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
      </Sheet>

      <Confirm
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        onConfirm={() => {
          const target = delTarget;
          if (!target) return;
          usePos.setState({ categories: usePos.getState().categories.filter((c) => c.id !== target.id) });
          usePos.getState().toast("Category deleted", "ok");
        }}
        title="Delete category?"
        body={`"${delTarget?.name ?? ""}" will be removed from your category list. Products won't be deleted.`}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
