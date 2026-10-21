"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, TextArea } from "@/components/ui/input";
import { NumberPad } from "@/components/ui/numberpad";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/statuspill";
import { timeAgo } from "@/lib/format";
import { fmtMoney, CURRENCY_SYMBOL } from "@/lib/money";
import { dueOf, payStatusOf, usePos } from "@/lib/store";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/ui";
import { Pencil, Receipt, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { PaymentMethod } from "@/lib/types";

type PayTarget = { oid: string; due: number; total: number };

export default function CustomerDetailScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const cid = sp.get("id") ?? "";

  const customer = usePos((s) => s.customers.find((c) => c.id === cid));
  const orders = usePos((s) => s.orders);
  const addPaymentsToOrder = usePos((s) => s.addPaymentsToOrder);
  const deleteCustomer = usePos((s) => s.deleteCustomer);
  const toast = usePos((s) => s.toast);
  const now = useNow(60_000);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payAmt, setPayAmt] = useState("0");

  const custOrders = useMemo(
    () => orders.filter((o) => o.customerId === cid && o.status !== "refunded").reverse(),
    [orders, cid],
  );

  const stats = useMemo(() => {
    const spent = custOrders.reduce((s, o) => s + o.total, 0);
    const due = custOrders.reduce((s, o) => s + dueOf(o), 0);
    return { count: custOrders.length, spent, due };
  }, [custOrders]);

  if (!customer) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Customer" onBack />
        <section className="px-5 pt-4">
          <EmptyState
            icon={<Users className="size-7" />}
            title="Customer not found"
            hint="This customer may have been deleted."
            action={<Button onClick={() => router.push("/customers")}>Back to customers</Button>}
          />
        </section>
      </div>
    );
  }

  function requestDelete() {
    if (stats.due > 0) {
      toast("Collect the outstanding balance first", "warn");
      return;
    }
    setConfirmOpen(true);
  }

  function openCollect(oid: string) {
    const o = custOrders.find((x) => x.id === oid);
    if (!o || dueOf(o) <= 0) return;
    setPayMethod("cash");
    setPayAmt(String(Math.round(dueOf(o) * 100) / 100));
    setPayTarget({ oid, due: dueOf(o), total: o.total });
  }

  function savePayment() {
    if (!payTarget) return;
    const amt = Math.min(parseFloat(payAmt) || 0, payTarget.due);
    if (amt <= 0) {
      toast("Enter an amount to record", "warn");
      return;
    }
    addPaymentsToOrder(payTarget.oid, [{ method: payMethod, amount: amt }]);
    toast("Payment recorded");
    setPayTarget(null);
  }

  function padPress(d: string) {
    setPayAmt((a) => (a === "0" && d !== "." ? d : a + d));
  }
  function padDelete() {
    setPayAmt((a) => (a.length <= 1 ? "0" : a.slice(0, -1)));
  }

  return (
    <div className="anim-fade">
      <ScreenHeader
        title={customer.name}
        onBack
        right={
          <>
            <IconButton
              label="Edit customer"
              className="text-ink2"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-[18px]" />
            </IconButton>
            <IconButton label="Delete customer" className="text-danger" onClick={requestDelete}>
              <Trash2 className="size-[18px]" />
            </IconButton>
          </>
        }
      />

      {/* profile */}
      <section className="px-5 pt-4">
        <Card className="p-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={customer.name} size={56} />
            <div className="min-w-0">
              <div className="text-[17px] font-bold break-words text-ink">{customer.name}</div>
              <div className="mt-0.5 text-[14px] text-ink3">{customer.phone || "No phone"}</div>
            </div>
          </div>
          <div className="mt-3.5 space-y-1.5 border-t border-line pt-3.5 text-[14px]">
            <div className="flex gap-3">
              <span className="w-16 shrink-0 text-ink3">Address</span>
              <span className="min-w-0 flex-1 text-ink2">{customer.address || "—"}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-16 shrink-0 text-ink3">Note</span>
              <span className="min-w-0 flex-1 text-ink2">{customer.note || "—"}</span>
            </div>
          </div>
        </Card>
      </section>

      {/* KPIs — one divided block, no per-cell cards */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-line2 bg-surface">
          <StatCell label="Orders" value={String(stats.count)} className="border-r border-line" />
          <StatCell label="Spent" value={fmtMoney(stats.spent)} className="border-r border-line" />
          <StatCell label="Owed" value={fmtMoney(stats.due)} alert={stats.due > 0} />
        </div>
      </section>

      {/* purchase history */}
      <section className="mt-6 px-5 pb-28">
        <h2 className="text-[15px] font-medium text-ink2">Purchase history</h2>
        {custOrders.length === 0 ? (
          <Card className="mt-2.5">
            <EmptyState
              icon={<Receipt className="size-7" />}
              title="No purchases yet"
              hint="Orders linked to this customer will show up here."
              action={<Button onClick={() => router.push("/sell")}>Start a sale</Button>}
            />
          </Card>
        ) : (
          <Card inset className="mt-2.5">
            {custOrders.map((o) => {
              const due = dueOf(o);
              const pay = payStatusOf(o);
              return (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Link href={`/orders/detail?id=${o.id}`} className="press flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet/10 text-violet">
                      <Receipt className="size-[17px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">
                        #{o.id.slice(-4)}
                      </span>
                      <span className="mt-0.5 block truncate text-[14px] text-ink3">{timeAgo(o.createdAt, now)}</span>
                    </span>
                  </Link>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabnum text-[15px] font-bold text-ink">{fmtMoney(o.total)}</span>
                    {pay === "paid" ? (
                      <span className="text-[14px] text-ink3">Paid</span>
                    ) : (
                      <StatusPill status={pay} />
                    )}
                  </span>
                  {due > 0 && (
                    <Button size="sm" variant="soft" onClick={() => openCollect(o.id)}>
                      Collect
                    </Button>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {/* edit sheet */}
      {editOpen && (
        <CustomerFormSheet
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={() => setEditOpen(false)}
        />
      )}

      {/* delete confirm */}
      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteCustomer(customer.id);
          router.push("/customers");
        }}
        tone="danger"
        title="Delete customer?"
        body={`This removes ${customer.name} from your records. Their past orders stay, but won't be linked to a customer anymore.`}
        confirmLabel="Delete"
      />

      {/* collect payment sheet */}
      <Sheet
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Collect payment"
        footer={
          <Button block disabled={(parseFloat(payAmt) || 0) <= 0} onClick={savePayment}>
            Record payment
          </Button>
        }
      >
        {payTarget && (
          <div className="pb-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-ink2">Amount</span>
              <span className="text-[12px] text-ink3">
                Due <span className="tabnum font-semibold text-ink2">{fmtMoney(payTarget.due)}</span>
              </span>
            </div>
            <div className="tabnum py-2 text-right text-[30px]/9 font-extrabold tracking-[-0.03em] text-ink">
              <span className="text-[18px] font-bold text-ink3">{CURRENCY_SYMBOL}</span>
              {payAmt}
            </div>
            <div className="mb-3.5 flex gap-2 text-[12px] text-ink3">
              <span className="rounded-full bg-surface2 px-2.5 py-1">
                Total <span className="tabnum font-semibold text-ink2">{fmtMoney(payTarget.total)}</span>
              </span>
              <span className="rounded-full bg-surface2 px-2.5 py-1">
                Paid <span className="tabnum font-semibold text-ink2">{fmtMoney(payTarget.total - payTarget.due)}</span>
              </span>
            </div>
            <Segmented
              value={payMethod}
              onChange={setPayMethod}
              className="mb-3.5"
              options={[
                { value: "cash", label: "Cash" },
                { value: "momo", label: "MoMo" },
                { value: "card", label: "Card" },
              ]}
            />
            <NumberPad onDigit={padPress} onDelete={padDelete} />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function StatCell({
  label,
  value,
  alert,
  className,
}: {
  label: string;
  value: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-0.5 px-3.5 py-3", className)}>
      <span className={cn("tabnum text-[16px]/6 font-bold", alert ? "text-warn" : "text-ink")}>{value}</span>
      <span className={cn("text-[12px] text-ink3", alert && "text-warn font-medium")}>{label}</span>
    </div>
  );
}

type CustomerInput = { id: string; name: string; phone: string; address: string; note: string };

function CustomerFormSheet({
  customer,
  onClose,
  onSaved,
}: {
  customer: CustomerInput;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertCustomer = usePos((s) => s.upsertCustomer);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [note, setNote] = useState(customer.note);
  const [nameError, setNameError] = useState("");

  function save() {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    upsertCustomer({
      id: customer.id,
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
      title="Edit customer"
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={save}>
            Save changes
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
