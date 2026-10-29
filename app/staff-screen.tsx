"use client";

import { StaffAvatar, RolePill } from "./account-screen";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Camera, ImagePlus, Plus, TriangleAlert, Trash2, UserRoundCheck } from "lucide-react";
import { processImageFile, saveImageBlob } from "@/lib/image-store";
import { readConnection } from "@/lib/api/bootstrap";
import { inviteMember } from "@/lib/api/team";
import { usePos } from "@/lib/store";
import {
  createStaff,
  setCurrentStaff,
  upsertStaff,
  useCurrentStaff,
  useStaffList,
  type Staff,
  type StaffRole,
} from "@/lib/staff";
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

  const isOwner = me?.role === "owner";
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

  const [name, setName] = useState(target?.name ?? "");
  const [phone, setPhone] = useState(target?.phone ?? "");
  const [role, setRole] = useState<StaffRole>(target?.role ?? "cashier");
  const [active, setActive] = useState(target?.active ?? true);
  const [photoId, setPhotoId] = useState<string | undefined>(target?.photoId);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const galleryInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  const nameOk = name.trim().length > 0;
  const isCreate = target === null;

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
    if (target) {
      upsertStaff({ ...target, name: name.trim(), phone: phone.trim(), role, active, photoId });
      toast("Staff updated");
      onClose();
      return;
    }
    const created = createStaff({ name: name.trim(), role, phone: phone.trim(), photoId });
    upsertStaff(created);
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
            hint="Sends a Nova POS invite so this teammate can sync and sign in from their own device."
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
