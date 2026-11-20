"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, SearchBar, TextArea } from "@/components/ui/input";
import { ScreenHeader } from "@/components/shell/screenheader";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/statuspill";
import { hasFeature } from "@/lib/features";
import { addDays, dateShort, isSameDay, startOfDay, timeOf } from "@/lib/format";
import { fmtMoney, parsePrice } from "@/lib/money";
import { useNow } from "@/lib/now";
import { staffForService, useStaffList } from "@/lib/staff";
import { usePos, useSettings } from "@/lib/store";
import { cn } from "@/lib/ui";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Plus,
  Scissors,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Appointment, AppointmentStatus, Product } from "@/lib/types";

type Filter = "all" | AppointmentStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "arrived", label: "Arrived" },
  { value: "in-service", label: "In service" },
  { value: "done", label: "Done" },
  { value: "no-show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
];

/** The status a booking moves to when the client arrives. */
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  booked: "arrived",
  arrived: "in-service",
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const hydrated = usePos((s) => s.hydrated);
  const settings = useSettings();
  const appointments = usePos((s) => s.appointments);
  const customers = usePos((s) => s.customers);
  const products = usePos((s) => s.products);
  const staffList = useStaffList();
  const now = useNow();

  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [filter, setFilter] = useState<Filter>("all");
  const [actionFor, setActionFor] = useState<Appointment | null>(null);
  const [confirmFor, setConfirmFor] = useState<
    { appointment: Appointment; status: "no-show" | "cancelled" } | null
  >(null);
  const [booking, setBooking] = useState(false);

  const appointmentsOn = hasFeature(settings.businessType, "appointments");

  const dayList = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(Date.parse(a.start), day))
        .filter((a) => filter === "all" || a.status === filter)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, day, filter],
  );

  const customerOf = (a: Appointment) =>
    customers.find((c) => c.id === a.customerId) ?? null;
  const staffOf = (a: Appointment) =>
    staffList.find((s) => s.id === a.staffId) ?? null;
  const productOf = (id: string) => products.find((p) => p.id === id) ?? null;

  const setStatus = (a: Appointment, status: AppointmentStatus) => {
    usePos.getState().setAppointmentStatus(a.id, status);
    usePos.getState().toast(
      status === "arrived"
        ? "Client marked as arrived"
        : status === "in-service"
          ? "Service started"
          : status === "done"
            ? "Visit closed"
            : status === "no-show"
              ? "Marked as no-show"
              : "Booking cancelled",
      status === "no-show" || status === "cancelled" ? "warn" : "ok",
    );
  };

  /** Load the booked services into the cart so the visit can be charged. */
  const startSale = (a: Appointment) => {
    const s = usePos.getState();
    s.clearCart();
    for (const line of a.serviceLines) {
      const qty = Math.max(1, line.qty ?? 1);
      s.addToCart(line.productId, qty, {
        price: line.price,
        ...(a.staffId ? { staffId: a.staffId } : {}),
      });
    }
    if (a.customerId) s.setCartCustomer(a.customerId);
    s.setCartAppointment(a.id);
    setActionFor(null);
    router.push("/sell");
  };

  if (!hydrated) return null;

  if (!appointmentsOn) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Appointments" onBack />
        <section className="px-5 pt-4">
          <EmptyState
            icon={<CalendarDays className="size-7" />}
            title="No appointments here"
            hint="Appointments belong to a salon. Change the shop type to start booking visits."
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

  return (
    <div className="anim-fade">
      <ScreenHeader
        title="Appointments"
        onBack={() => (window.history.length > 1 ? router.back() : router.push("/home"))}
        right={
          <IconButton label="New appointment" onClick={() => setBooking(true)}>
            <Plus className="size-[21px]" />
          </IconButton>
        }
      />

      <div className="px-5 pt-4 pb-32">
        {/* the week around the selected day */}
        <div className="flex items-center gap-2">
          <IconButton label="Previous day" onClick={() => setDay((d) => addDays(d, -1))}>
            <ChevronLeft className="size-[20px] text-ink" />
          </IconButton>
          <div className="edge-fade no-scrollbar -mx-1 min-w-0 flex-1 overflow-x-auto px-1">
            <div className="flex w-max gap-1.5">
              {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                const d = addDays(day, offset);
                const selected = isSameDay(d, day);
                const today = isSameDay(d, now);
                return (
                  <button
                    key={offset}
                    onClick={() => setDay(d)}
                    className={cn(
                      "press flex w-14 flex-col items-center gap-0.5 rounded-xl border py-2",
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-line bg-surface hover:bg-surface2/50",
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-ink3">
                      {new Date(d).toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span
                      className={cn(
                        "tabnum text-[17px] font-bold",
                        selected ? "text-accent" : "text-ink",
                      )}
                    >
                      {new Date(d).getDate()}
                    </span>
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        today ? "bg-accent" : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <IconButton label="Next day" onClick={() => setDay((d) => addDays(d, 1))}>
            <ChevronRight className="size-[20px] text-ink" />
          </IconButton>
        </div>

        {/* what to show */}
        <div className="edge-fade no-scrollbar -mx-5 mt-3 overflow-x-auto px-5">
          <div className="flex w-max gap-1.5">
            {FILTERS.map((f) => (
              <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {dayList.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-7" />}
              title="Nothing booked"
              hint={`No visits on ${dateShort(day)}. Book one or walk a client straight in.`}
              action={<Button onClick={() => setBooking(true)}>New appointment</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {dayList.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  customerName={customerOf(a)?.name ?? null}
                  staffName={staffOf(a)?.name ?? null}
                  schedule={scheduleOf(staffOf(a), day)}
                  services={a.serviceLines.map((l) => {
                    const p = productOf(l.productId);
                    return {
                      name: p?.name ?? "Service",
                      qty: Math.max(1, l.qty ?? 1),
                      price: l.price,
                      durationMin: p?.durationMin ?? 0,
                    };
                  })}
                  onTap={() => setActionFor(a)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* the life of one booking */}
      <Sheet
        open={actionFor !== null}
        onClose={() => setActionFor(null)}
        title={actionFor ? customerOf(actionFor)?.name ?? "Walk-in" : ""}
        height="auto"
      >
        {actionFor && (
          <div className="pb-4">
            <p className="px-1 text-[14px] text-ink3">
              {dateShort(Date.parse(actionFor.start))} ·{" "}
              {timeOf(Date.parse(actionFor.start))} · {actionFor.durationMin} min
            </p>
            <p className="mt-2 px-1 text-[15px] font-medium text-ink2">
              {actionFor.serviceLines
                .map(
                  (l) =>
                    `${productOf(l.productId)?.name ?? "Service"} × ${Math.max(1, l.qty ?? 1)}`,
                )
                .join(" · ")}
            </p>
            {actionFor.notes && (
              <p className="mt-2 rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[14px] leading-5 text-ink2">
                {actionFor.notes}
              </p>
            )}

            <div className="mt-4 space-y-2.5">
              {NEXT_STATUS[actionFor.status] && (
                <Button
                  block
                  onClick={() => {
                    setStatus(actionFor, NEXT_STATUS[actionFor.status]!);
                    setActionFor(null);
                  }}
                >
                  {actionFor.status === "booked" ? "Client arrived" : "Start the service"}
                </Button>
              )}
              {(actionFor.status === "arrived" || actionFor.status === "in-service") && (
                <Button
                  block
                  icon={<Scissors className="size-4" />}
                  onClick={() => startSale(actionFor)}
                >
                  Start sale
                </Button>
              )}
              {actionFor.status !== "done" && actionFor.status !== "cancelled" && (
                <Button
                  variant="secondary"
                  block
                  onClick={() => {
                    setStatus(actionFor, "done");
                    setActionFor(null);
                  }}
                >
                  Mark done
                </Button>
              )}
              {actionFor.status !== "no-show" && actionFor.status !== "done" && (
                <Button
                  variant="soft"
                  block
                  onClick={() => {
                    setConfirmFor({ appointment: actionFor, status: "no-show" });
                  }}
                >
                  No-show
                </Button>
              )}
              {actionFor.status !== "cancelled" && actionFor.status !== "done" && (
                <Button
                  variant="ghost"
                  block
                  onClick={() => {
                    setConfirmFor({ appointment: actionFor, status: "cancelled" });
                  }}
                >
                  Cancel booking
                </Button>
              )}
              <Button
                variant="ghost"
                block
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  usePos.getState().deleteAppointment(actionFor.id);
                  setActionFor(null);
                  usePos.getState().toast("Booking removed", "warn");
                }}
              >
                Remove booking
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Confirm
        open={confirmFor !== null}
        onClose={() => setConfirmFor(null)}
        onConfirm={() => {
          if (confirmFor) setStatus(confirmFor.appointment, confirmFor.status);
          setConfirmFor(null);
          setActionFor(null);
        }}
        title={confirmFor?.status === "no-show" ? "Mark as no-show?" : "Cancel this booking?"}
        body={
          confirmFor?.status === "no-show"
            ? "The client never turned up. The slot stays free for someone else."
            : "The client is told the booking is cancelled. The slot stays free."
        }
        confirmLabel={confirmFor?.status === "no-show" ? "Mark no-show" : "Cancel booking"}
        tone="danger"
      />

      <BookingSheet
        open={booking}
        onClose={() => setBooking(false)}
        day={day}
        onBooked={() => {
          setBooking(false);
          usePos.getState().toast("Appointment booked", "ok");
        }}
      />
    </div>
  );
}

/** One booked visit on the day list. */
function AppointmentCard({
  appointment,
  customerName,
  staffName,
  schedule,
  services,
  onTap,
}: {
  appointment: Appointment;
  customerName: string | null;
  staffName: string | null;
  schedule: string | null;
  services: { name: string; qty: number; price: number; durationMin: number }[];
  onTap: () => void;
}) {
  const start = Date.parse(appointment.start);
  const total = services.reduce((s, x) => s + x.price * x.qty, 0);
  return (
    <button
      onClick={onTap}
      className="press flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left hover:bg-surface2/50"
    >
      <span className="tabnum w-14 shrink-0 pt-0.5 text-[17px] font-bold text-ink">
        {timeOf(start)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {customerName ? (
            <Avatar name={customerName} size={28} />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <User className="size-4" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-tight text-ink">
            {customerName ?? "Walk-in"}
          </span>
          <StatusPill status={appointment.status} />
        </span>
        <span className="mt-1.5 block truncate text-[14px] text-ink2">
          {services.map((s) => `${s.name} × ${s.qty}`).join(" · ")}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink3">
          <span className="tabnum font-medium">{fmtMoney(total)}</span>
          {staffName && (
            <span className="inline-flex items-center gap-1">
              <UserCheck className="size-3.5" />
              {staffName}
            </span>
          )}
          {schedule && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {schedule}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/** When the staff member works that day — read only, never enforced. */
function scheduleOf(
  staff: { schedule?: { day: number; start: string; end: string }[] } | null,
  day: number,
): string | null {
  const row = staff?.schedule?.find((s) => s.day === new Date(day).getDay());
  if (!row) return null;
  return `${row.start}–${row.end}`;
}

/* ------------------------------ new booking ------------------------------ */

/** A service picked for a booking, with its quantity and price. */
type Draft = { productId: string; qty: number; price: number };

function BookingSheet({
  open,
  onClose,
  day,
  onBooked,
}: {
  open: boolean;
  onClose: () => void;
  day: number;
  onBooked: () => void;
}) {
  const products = usePos((s) => s.products);
  const customers = usePos((s) => s.customers);
  const staffList = useStaffList();

  const services = useMemo(
    () => products.filter((p) => p.kind === "service" && p.active),
    [products],
  );

  const [sheetDay, setSheetDay] = useState(day);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [time, setTime] = useState(() => defaultTime());
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [staffOpen, setStaffOpen] = useState(false);

  const customer = customers.find((c) => c.id === customerId) ?? null;

  const filteredCustomers = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    return customers.filter(
      (c) => q === "" || c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [customers, custQuery]);

  const autoDuration = useMemo(
    () =>
      drafts.reduce((sum, d) => {
        const p = services.find((s) => s.id === d.productId);
        return sum + (p?.durationMin ?? 0) * d.qty;
      }, 0),
    [drafts, services],
  );

  // staff trained for the chosen services — when nobody matches, everyone
  // active is offered so a shop that never fills skills in can still book
  const eligibleStaff = useMemo(() => {
    const active = staffList.filter((s) => s.active);
    if (drafts.length === 0) return active;
    const ids = new Set<string>();
    for (const d of drafts) {
      for (const s of staffForService(staffList, d.productId)) ids.add(s.id);
    }
    const trained = active.filter((s) => ids.has(s.id));
    return trained.length > 0 ? trained : active;
  }, [drafts, staffList]);

  const durationMin = duration.trim() === "" ? autoDuration : Math.max(0, Math.round(parsePrice(duration)));

  const toggleService = (p: Product) => {
    setDrafts((rows) =>
      rows.some((r) => r.productId === p.id)
        ? rows.filter((r) => r.productId !== p.id)
        : [...rows, { productId: p.id, qty: 1, price: p.price }],
    );
  };

  const setQty = (productId: string, qty: number) => {
    setDrafts((rows) =>
      rows.map((r) => (r.productId === productId ? { ...r, qty: Math.max(1, qty) } : r)),
    );
  };

  const setPrice = (productId: string, price: string) => {
    setDrafts((rows) =>
      rows.map((r) => (r.productId === productId ? { ...r, price: Math.max(0, parsePrice(price)) } : r)),
    );
  };

  const startISO = useMemo(() => {
    const [h, m] = time.split(":").map((n) => Number(n) || 0);
    const d = new Date(sheetDay);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }, [sheetDay, time]);

  const book = (status: AppointmentStatus) => {
    if (drafts.length === 0) {
      usePos.getState().toast("Pick at least one service", "warn");
      return;
    }
    usePos.getState().upsertAppointment({
      customerId,
      ...(staffId ? { staffId } : {}),
      serviceLines: drafts.map((d) => ({
        productId: d.productId,
        price: d.price,
        qty: d.qty,
      })),
      start: startISO,
      durationMin,
      status,
      notes: notes.trim(),
    });
    setCustomerId(null);
    setDrafts([]);
    setStaffId(null);
    setDuration("");
    setNotes("");
    onBooked();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New appointment"
      height="tall"
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              book("in-service");
            }}
          >
            Walk-in
          </Button>
          <Button onClick={() => book("booked")}>Book</Button>
        </div>
      }
    >
      {/* who */}
      <button
        onClick={() => setCustOpen(true)}
        className="press flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left hover:bg-surface2/50"
      >
        {customer ? (
          <Avatar name={customer.name} size={34} />
        ) : (
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
            <User className="size-[18px]" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-ink">
            {customer?.name ?? "Walk-in"}
          </span>
          <span className="block truncate text-[14px] text-ink3">
            {customer?.phone || "No customer attached"}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink3" />
      </button>

      {/* what */}
      <p className="mb-1.5 mt-4 text-[13px] font-medium text-ink2">Services</p>
      {services.length === 0 ? (
        <p className="rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[14px] leading-5 text-ink2">
          No services yet — mark an item as a service in Inventory to book it.
        </p>
      ) : (
        <Card inset>
          {services.map((p) => {
            const draft = drafts.find((d) => d.productId === p.id);
            return (
              <div key={p.id} className="px-4 py-3.5">
                <button
                  onClick={() => toggleService(p)}
                  className="press flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      draft ? "border-accent" : "border-line2",
                    )}
                  >
                    {draft && <span className="size-2.5 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-ink">
                      {p.name}
                    </span>
                    <span className="block text-[13px] text-ink3">
                      {p.durationMin ? `${p.durationMin} min` : "Service"} · {fmtMoney(p.price)}
                    </span>
                  </span>
                </button>
                {draft && (
                  <div className="mt-2.5 flex items-end gap-2 pl-8">
                    <Input
                      label="Qty"
                      inputMode="numeric"
                      className="tabnum w-20"
                      value={String(draft.qty)}
                      onChange={(e) => setQty(p.id, Math.round(parsePrice(e.target.value)))}
                    />
                    <Input
                      label="Price"
                      money
                      inputMode="decimal"
                      className="tabnum flex-1"
                      value={String(draft.price)}
                      onChange={(e) => setPrice(p.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* when and who */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Input
          label="Date"
          type="date"
          value={new Date(sheetDay).toISOString().slice(0, 10)}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) setSheetDay(startOfDay(d.getTime()));
          }}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <Input
        label="Duration (minutes)"
        inputMode="numeric"
        className="tabnum mt-2.5"
        placeholder={String(autoDuration)}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        hint={
          autoDuration > 0
            ? `The services add up to ${autoDuration} minutes — leave blank to use it.`
            : "How long the visit takes."
        }
      />

      <button
        onClick={() => setStaffOpen(true)}
        className="press mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left hover:bg-surface2/50"
      >
        {staffId ? (
          <Avatar name={staffList.find((s) => s.id === staffId)?.name ?? "?"} size={34} />
        ) : (
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
            <UserCheck className="size-[18px]" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-ink">
            {staffId ? (staffList.find((s) => s.id === staffId)?.name ?? "Staff") : "Any stylist"}
          </span>
          <span className="block truncate text-[14px] text-ink3">
            {staffId ? "Assigned to this visit" : "Pick whoever is free"}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink3" />
      </button>

      <TextArea
        label="Notes"
        className="mt-2.5"
        placeholder="What the client asked for, allergies, preferences…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* customer picker */}
      <Sheet
        open={custOpen}
        onClose={() => setCustOpen(false)}
        title="Attach customer"
        height="auto"
      >
        <SearchBar
          value={custQuery}
          onChange={setCustQuery}
          placeholder="Search name or phone…"
        />
        <Card inset className="mt-3">
          <button
            onClick={() => {
              setCustomerId(null);
              setCustOpen(false);
            }}
            className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <User className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[17px] font-semibold text-ink">Walk-in</span>
              <span className="block text-[14px] text-ink3">No customer attached</span>
            </span>
            {customerId === null && <CircleCheck className="size-5 shrink-0 text-accent" />}
          </button>
          {filteredCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCustomerId(c.id);
                setCustOpen(false);
              }}
              className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
            >
              <Avatar name={c.name} size={36} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[17px] font-semibold text-ink">
                  {c.name}
                </span>
                <span className="block truncate text-[14px] text-ink3">
                  {c.phone || "No phone"}
                </span>
              </span>
              {customerId === c.id && <CircleCheck className="size-5 shrink-0 text-accent" />}
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <p className="px-4 py-6 text-center text-[14px] text-ink3">No customer matches.</p>
          )}
        </Card>
      </Sheet>

      {/* stylist picker */}
      <Sheet
        open={staffOpen}
        onClose={() => setStaffOpen(false)}
        title="Who serves this visit?"
        height="auto"
      >
        <Card inset>
          <button
            onClick={() => {
              setStaffId(null);
              setStaffOpen(false);
            }}
            className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
              <UserCheck className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-left text-[17px] font-semibold text-ink">
              Any stylist
            </span>
            {staffId === null && <CircleCheck className="size-5 shrink-0 text-accent" />}
          </button>
          {eligibleStaff.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStaffId(s.id);
                  setStaffOpen(false);
                }}
                className="press flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
              >
                <Avatar name={s.name} size={36} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[17px] font-semibold text-ink">
                    {s.name}
                  </span>
                  <span className="block truncate text-[14px] text-ink3">
                    {s.commissionPct ? `${s.commissionPct}% commission` : "No commission set"}
                  </span>
                </span>
                {staffId === s.id && <CircleCheck className="size-5 shrink-0 text-accent" />}
              </button>
            ))}
          {eligibleStaff.length === 0 && (
            <p className="px-4 py-6 text-center text-[14px] text-ink3">No active staff.</p>
          )}
        </Card>
      </Sheet>
    </Sheet>
  );
}

/** The next half hour — a sensible default for a new booking. */
function defaultTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
