"use client";

import { StaffAvatar, RolePill } from "./account-screen";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Chip } from "@/components/ui/chip";
import { ChevronLeft, ChevronRight, Camera, Clock, ImagePlus, Plus, Scissors, TriangleAlert, Trash2, UserRoundCheck } from "lucide-react";
import { processImageFile, saveImageBlob } from "@/lib/image-store";
import { readConnection } from "@/lib/api/bootstrap";
import { inviteMember } from "@/lib/api/team";
import { usePos } from "@/lib/store";
import { planAllowsEnterprise, useEntitlement } from "@/lib/entitlement";
import {
  createStaff,
  setCurrentStaff,
  upsertStaff,
  useCurrentStaff,
  useStaffList,
  type Staff,
  type StaffRole,
  type StaffSchedule,
} from "@/lib/staff";
import { hasFeature } from "@/lib/features";
import { useSettings } from "@/lib/store";
import { parsePrice } from "@/lib/money";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/ui";

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
];

export default function StaffScreen() {
  const router = useRouter();
  const me = useCurrentStaff();
  const staff = useStaffList();
  const toast = usePos((s) => s.toast);
  const ready = useEntitlement((s) => s.ready);
  const status = useEntitlement((s) => s.status);
  const plan = useEntitlement((s) => s.plan);

  const isOwner = me?.role === "owner";
  const enterprise = planAllowsEnterprise(status, plan);
  const [editing, setEditing] = useState<{ staff: Staff | null } | null>(null);

  const activeCount = useMemo(() => staff.filter((s) => s.active).length, [staff]);

  function switchTo(s: Staff) {
    if (!me) return;
    if (s.id === me.id) {
      toast("Already signed in", "warn");
      return;
    }
    if (!s.active) {
      toast("That member is inactive", "warn");
      return;
    }
    setCurrentStaff(s.id);
    toast(`Signed in as ${s.name}`);
  }

  if (!ready) return null;

  if (!enterprise) {
    return (
      <div className="anim-fade px-5 pt-4 pb-10">
        <header className="flex items-center gap-1">
          <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
            <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
            Staff &amp; roles
          </h1>
        </header>
        <Card className="mt-5 p-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-warn-soft text-warn">
            <TriangleAlert className="size-[22px]" />
          </div>
          <h2 className="mt-4 text-[19px]/6 font-bold text-ink">Staff accounts need Enterprise</h2>
          <p className="mt-1.5 text-[14px] leading-5 text-ink3">
            The Standard plan covers a single owner on this device. Upgrade to add supervisors and
            cashiers, assign roles, and invite teammates to their own devices.
          </p>
          <Button className="mt-4" block onClick={() => router.push("/billing")}>
            View plans
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="anim-fade px-5 pt-4 pb-10">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Staff &amp; roles
        </h1>
        {isOwner && (
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing({ staff: null })}>
            Add staff
          </Button>
        )}
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">
        {activeCount} of {staff.length} active
      </p>

      {!isOwner && me && (
        <Card className="mt-5 p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-warn" />
            <p className="text-[14px] leading-5 text-ink2">
              Only the owner can manage staff. Tap a member to sign in as them.
            </p>
          </div>
        </Card>
      )}

      <Card inset className="mt-2.5">
        {staff.map((s) => {
          const isCurrent = s.id === me?.id;
          return (
            <button
              key={s.id}
              onClick={isOwner ? () => setEditing({ staff: s }) : () => switchTo(s)}
              className={cn(
                "press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50",
                !s.active && "opacity-50",
              )}
            >
              <StaffAvatar staff={s} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
                    {s.name}
                  </span>
                  <RolePill role={s.role} />
                  {!s.active && (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-ink2/10 px-2.5 text-[12px] font-semibold text-ink2">
                      Inactive
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-[14px] text-ink3">
                  {isCurrent && <span className="font-semibold text-accent">Signed in · </span>}
                  {s.phone || "No phone"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink3" />
            </button>
          );
        })}
      </Card>

      {editing && me && isOwner && (
        <StaffFormSheet target={editing.staff} currentId={me.id} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function StaffFormSheet({
  target,
  currentId,
  onClose,
}: {
  target: Staff | null;
  currentId: string;
  onClose: () => void;
}) {
  const toast = usePos((s) => s.toast);
  const me = useCurrentStaff();
  const isOwner = me?.role === "owner";
  const isSelf = target?.id === currentId;

  const settings = useSettings();
  const services = usePos((s) => s.products).filter((p) => p.kind === "service" && p.active);
  const servicesOn = hasFeature(settings.businessType, "services");
  const commissionsOn = hasFeature(settings.businessType, "commissions");

  const [name, setName] = useState(target?.name ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");
  const [role, setRole] = useState<StaffRole>(target?.role ?? "cashier");
  const [active, setActive] = useState(target?.active ?? true);
  const [photoId, setPhotoId] = useState<string | undefined>(target?.photoId);
  const [skills, setSkills] = useState<string[]>(target?.skills ?? []);
  const [schedule, setSchedule] = useState<StaffSchedule[]>(target?.schedule ?? []);
  const [commissionStr, setCommissionStr] = useState(
    target?.commissionPct != null ? String(target.commissionPct) : "",
  );
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const galleryInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  const nameOk = name.trim().length > 0;
  const isCreate = target === null;

  const commissionPct = commissionStr.trim() === "" ? undefined : parsePrice(commissionStr);
  const commissionOk =
    commissionPct == null || (Number.isFinite(commissionPct) && commissionPct >= 0 && commissionPct <= 100);

  const handlePhoto = async (file: File) => {
    setBusy(true);
    try {
      const blob = await processImageFile(file);
      const ref = await saveImageBlob(blob);
      setPhotoId(ref);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not attach that photo", "error");
    } finally {
      setBusy(false);
    }
  };

  function save() {
    if (!isOwner) {
      toast("Only the owner can add or edit staff", "error");
      return;
    }
    if (!nameOk) {
      setNameError("Name is required");
      return;
    }
    if (!commissionOk) {
      toast("Commission must be between 0 and 100", "error");
      return;
    }
    const salon = {
      ...(servicesOn ? { skills: skills.length > 0 ? skills : undefined } : {}),
      ...(servicesOn ? { schedule: schedule.length > 0 ? schedule : undefined } : {}),
      ...(commissionsOn ? { commissionPct } : {}),
    };
    if (target) {
      upsertStaff({ ...target, name: name.trim(), phone: phone.trim(), role, active, photoId, ...salon });
      toast("Staff updated");
      onClose();
      return;
    }
    const created = createStaff({ name: name.trim(), role, phone: phone.trim(), photoId });
    upsertStaff({ ...created, ...salon });
    const addr = email.trim();
    if (addr) {
      void inviteNew(created.name, addr);
      return;
    }
    toast("Staff added");
    onClose();
  }

  async function inviteNew(name_: string, addr: string) {
    const conn = readConnection();
    if (!conn) {
      toast(`${name_} added — connect the shop to send invites`, "warn");
      setInviteNote(`${name_} was added on this device. Connect the shop once, then add again with the same email to send the invite.`);
      setInviting(false);
      return;
    }
    setInviting(true);
    try {
      const r = await inviteMember(conn, addr);
      if (!r.emailed && r.invite_url) {
        setInviteNote(`Invite link for ${addr}: ${r.invite_url}`);
        toast("Invite created — share the link manually", "warn");
      } else {
        toast(`Invite sent to ${addr}`, "ok");
        onClose();
      }
    } catch (e) {
      setInviteNote(`${name_} was added on this device, but the invite failed: ${e instanceof Error ? e.message : String(e)}`);
      toast("Invite failed", "error");
    } finally {
      setInviting(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={target ? "Edit staff" : "New staff"}
      footer={
        inviteNote ? (
          <Button variant="secondary" block onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" block onClick={onClose}>
              Cancel
            </Button>
            <Button block loading={busy || inviting} onClick={save}>
              {target ? "Save changes" : "Add staff"}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {target && target.id !== currentId && target.active && (
          <button
            onClick={() => {
              setCurrentStaff(target.id);
              toast(`Signed in as ${target.name}`);
            }}
            className="press flex w-full items-center gap-2.5 rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-left"
          >
            <UserRoundCheck className="size-[18px] shrink-0 text-accent" />
            <span className="text-[15px] font-semibold text-ink">Sign in as this member</span>
          </button>
        )}

        <div>
          <div className="flex items-center gap-3.5">
            <StaffAvatar staff={{ name, photoId }} size={56} />
            <p className="min-w-0 flex-1 text-[13px] leading-5 text-ink3">
              {photoId ? "Photo attached to this member." : "A photo helps the team recognise each other."}
            </p>
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
            {photoId && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setPhotoId(undefined)}>
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
        </div>

        <Input
          label="Name"
          placeholder="e.g. Ama Serwaa"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError("");
          }}
          error={nameError || undefined}
        />
        <Input
          label="Phone (optional)"
          placeholder="024 000 0000"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {isCreate && (
          <Input
            label="Email (cloud invite, optional)"
            hint="Sends a ScalPOS invite so this teammate can sync and sign in from their own device."
            placeholder="teammate@shop.com"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        {inviteNote && (
          <div className="rounded-xl border border-line2 bg-surface2 px-3.5 py-3">
            <p className="text-[14px] leading-5 text-ink2 select-all">{inviteNote}</p>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink2">Role</p>
          <div className={cn(isSelf && "pointer-events-none opacity-50")}>
            <Segmented value={role} onChange={setRole} options={ROLE_OPTIONS} />
          </div>
          {isSelf && <p className="mt-1.5 text-[12px] text-ink3">You can&rsquo;t change your own role.</p>}
        </div>

        {servicesOn && services.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Scissors className="size-[15px] text-ink3" />
              <p className="text-[13px] font-medium text-ink2">Skills (optional)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <Chip
                  key={svc.id}
                  active={skills.includes(svc.id)}
                  onClick={() =>
                    setSkills((prev) =>
                      prev.includes(svc.id) ? prev.filter((sid) => sid !== svc.id) : [...prev, svc.id],
                    )
                  }
                >
                  {svc.name}
                </Chip>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-ink3">
              {skills.length > 0
                ? "This member only appears for the services ticked above."
                : "Leave empty — this member can serve anything."}
            </p>
          </div>
        )}

        {servicesOn && <ScheduleEditor schedule={schedule} onChange={setSchedule} />}

        {commissionsOn && (
          <Input
            label="Commission (optional)"
            hint="Percent of the service price this member earns when they serve a sale."
            placeholder="e.g. 15"
            inputMode="decimal"
            value={commissionStr}
            onChange={(e) => setCommissionStr(e.target.value)}
            trailing={<span className="text-[15px] text-ink3">%</span>}
            error={commissionOk ? undefined : "Must be between 0 and 100"}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">Active</p>
            <p className="text-[13px] text-ink3">Can sign in and use the register</p>
          </div>
          <button
            role="switch"
            aria-checked={active}
            disabled={isSelf}
            onClick={() => setActive(!active)}
            className={cn(
              "press relative h-7 w-12 shrink-0 rounded-full transition-colors",
              active ? "bg-accent" : "bg-ink4/40",
              isSelf && "opacity-45",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-surface transition-all",
                active ? "left-6" : "left-1",
              )}
            />
          </button>
        </div>
        {isSelf && <p className="-mt-2.5 text-[12px] text-ink3">You can&rsquo;t deactivate yourself.</p>}
      </div>
    </Sheet>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: StaffSchedule[];
  onChange: (rows: StaffSchedule[]) => void;
}) {
  const update = (i: number, patch: Partial<StaffSchedule>) =>
    onChange(schedule.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(schedule.filter((_, idx) => idx !== i));
  const add = () => {
    const used = new Set(schedule.map((r) => r.day));
    const day = DAYS.findIndex((_, d) => !used.has(d));
    onChange([...schedule, { day: day === -1 ? 0 : day, start: "09:00", end: "17:00" }]);
  };

  const fieldCls =
    "h-11 rounded-xl border border-line2 bg-surface2 px-3 text-[15px] text-ink outline-none transition-colors focus:border-accent/60";

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Clock className="size-[15px] text-ink3" />
        <p className="text-[13px] font-medium text-ink2">Working hours (optional)</p>
      </div>
      {schedule.length > 0 && (
        <div className="flex flex-col gap-2">
          {schedule.map((row, i) => (
            <div key={`${row.day}-${i}`} className="flex items-center gap-2">
              <select
                aria-label="Day"
                value={row.day}
                onChange={(e) => update(i, { day: Number(e.target.value) })}
                className={cn(fieldCls, "w-[118px] shrink-0 appearance-none")}
              >
                {DAYS.map((label, d) => (
                  <option key={label} value={d}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                aria-label="Start time"
                value={row.start}
                onChange={(e) => update(i, { start: e.target.value })}
                className={cn(fieldCls, "min-w-0 flex-1")}
              />
              <input
                type="time"
                aria-label="End time"
                value={row.end}
                onChange={(e) => update(i, { end: e.target.value })}
                className={cn(fieldCls, "min-w-0 flex-1")}
              />
              <IconButton label="Remove hours" onClick={() => remove(i)} className="shrink-0 text-ink3">
                <Trash2 className="size-[18px]" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        icon={<Plus className="size-4" />}
        onClick={add}
        className="mt-2"
      >
        Add working hours
      </Button>
    </div>
  );
}
