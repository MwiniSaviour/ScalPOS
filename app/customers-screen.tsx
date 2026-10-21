"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, TextArea } from "@/components/ui/input";
import { ScreenHeader } from "@/components/shell/screenheader";
import { SearchBar } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { dueOf, usePos } from "@/lib/store";
import { fmtMoneyCompact } from "@/lib/money";
import { ChevronRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CustomersScreen() {
  const customers = usePos((s) => s.customers);
  const orders = usePos((s) => s.orders);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const dueByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (o.status === "refunded" || !o.customerId) continue;
      const due = dueOf(o);
      if (due <= 0) continue;
      m.set(o.customerId, (m.get(o.customerId) ?? 0) + due);
    }
    return m;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [customers, query]);

  return (
    <div className="anim-fade">
      <ScreenHeader title="Customers" subtitle={`${customers.length} saved`} />

      <section className="px-4 pb-2">
        <SearchBar value={query} onChange={setQuery} placeholder="Search name or phone" />
      </section>

      {filtered.length === 0 ? (
        <section className="px-4 pb-28">
          <EmptyState
            icon={<Users className="size-7" />}
            title={query ? "No matches" : "No customers yet"}
            hint={
              query
                ? "Try another name or phone number."
                : "Save regulars here so credit sales and dues stay tracked."
            }
            action={<Button onClick={() => setAddOpen(true)} icon={<Plus className="size-4" />}>Add customer</Button>}
          />
        </section>
      ) : (
        <Card inset className="mx-4 mb-28">
          {filtered.map((c) => {
            const due = dueByCustomer.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/customers/detail?id=${c.id}`}
                className="press flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-surface2/50"
              >
                <Avatar name={c.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-snug break-words text-ink">
                    {c.name}
                  </span>
                  <span className="tabnum block truncate text-[12px] text-ink3">{c.phone || "No phone"}</span>
                </span>
                {due > 0 ? (
                  <span className="tabnum shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-[12px] font-bold text-danger">
                    {fmtMoneyCompact(due)} due
                  </span>
                ) : (
                  <span className="shrink-0 text-[12px] font-medium text-ink3">Clear</span>
                )}
                <ChevronRight className="size-4 shrink-0 text-ink4" />
              </Link>
            );
          })}
        </Card>
      )}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] z-40 mx-auto flex max-w-[440px] justify-end px-4"
      >
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Add customer"
          className="press pointer-events-auto flex size-14 items-center justify-center rounded-2xl border border-line2 bg-accent text-accentink"
        >
          <Plus className="size-6" />
        </button>
      </div>
      {addOpen && (
        <CustomerFormSheet
          customer={null}
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

function CustomerFormSheet({
  customer,
  onClose,
  onSaved,
}: {
  customer: { id: string; name: string; phone: string; address: string; note: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertCustomer = usePos((s) => s.upsertCustomer);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [nameError, setNameError] = useState("");

  function save() {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    upsertCustomer({
      id: customer?.id,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
    });
    onSaved();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={customer ? "Edit customer" : "New customer"}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={save}>
            {customer ? "Save changes" : "Add customer"}
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
            if (nameError) setNameError("");
          }}
          placeholder="e.g. Ama Serwaa"
          error={nameError || undefined}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="024 000 0000"
          inputMode="tel"
        />
        <TextArea
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Area, landmark…"
          className="[&_textarea]:min-h-[72px]"
        />
        <TextArea
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything to remember about this customer"
          className="[&_textarea]:min-h-[72px]"
        />
      </div>
    </Sheet>
  );
}
