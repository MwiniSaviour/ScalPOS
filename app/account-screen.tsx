"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Camera, ImagePlus, Trash2 } from "lucide-react";
import { processImageFile, saveImageBlob } from "@/lib/image-store";
import { useImageSrc } from "@/lib/use-image-src";
import { usePos } from "@/lib/store";
import {
  roleLabel,
  rolePillStyle,
  upsertStaff,
  useCurrentStaff,
  useStaffList,
  type Staff,
  type StaffRole,
} from "@/lib/staff";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/ui";

export default function AccountScreen() {
  const router = useRouter();
  const me = useCurrentStaff();
  const staff = useStaffList();
  const shopName = usePos((s) => s.settings.shopName);
  const toast = usePos((s) => s.toast);

  const [busy, setBusy] = useState(false);
  const galleryInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(me?.name ?? "");
  const nameOk = name.trim().length > 0;

  if (!me) return null;

  const others = staff.filter((s) => s.id !== me.id && s.active).length;
  const nameDirty = name.trim() !== me.name;

  const handlePhoto = async (file: File) => {
    setBusy(true);
    try {
      const blob = await processImageFile(file);
      const ref = await saveImageBlob(blob);
      upsertStaff({ ...me, photoId: ref });
      toast("Photo updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not attach that photo", "error");
    } finally {
      setBusy(false);
    }
  };

  const clearPhoto = () => {
    upsertStaff({ ...me, photoId: undefined });
    toast("Photo removed");
  };

  const saveName = () => {
    if (!nameOk || !nameDirty) return;
    upsertStaff({ ...me, name: name.trim() });
    toast("Name saved");
  };

  return (
    <div className="anim-fade px-5 pt-4 pb-10">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          My account
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">
        {roleLabel(me.role)} · {shopName}
      </p>

      {/* profile */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Profile</h2>
        <Card className="mt-2.5 p-4">
          <div className="flex items-center gap-3.5">
            <StaffAvatar staff={me} size={72} />
            <p className="min-w-0 flex-1 text-[13px] leading-5 text-ink3">
              {me.photoId
                ? "Your photo shows wherever staff are listed."
                : "Add a photo so the team recognises who is signed in."}
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
            {me.photoId && (
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

          <div className="mt-3 border-t border-line/60 pt-3">
            <Input
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!nameOk ? "Name is required" : undefined}
              trailing={
                <button
                  onClick={saveName}
                  disabled={!nameOk || !nameDirty}
                  className="press inline-flex h-8 shrink-0 items-center rounded-lg bg-accent/10 px-3 text-[13px] font-semibold text-accent disabled:opacity-45 disabled:pointer-events-none"
                >
                  Save
                </button>
              }
            />
          </div>
        </Card>
      </section>

      {/* role & switching */}
      <section className="mt-6">
        <h2 className="text-[15px] font-medium text-ink2">Access</h2>
        <Card inset className="mt-2.5">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold text-ink">Role</span>
              <span className="block text-[14px] text-ink3">
                {me.role === "cashier"
                  ? "Can view reports only"
                  : "Can refund, edit data and view reports"}
              </span>
            </span>
            <RolePill role={me.role} />
          </div>
          <Link href="/staff" className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50">
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold text-ink">Switch signed-in staff</span>
              <span className="block text-[14px] text-ink3">
                {others === 0 ? "No other members yet" : `${others} other member${others === 1 ? "" : "s"}`}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink3" />
          </Link>
        </Card>
      </section>
    </div>
  );
}

/** member photo when one is stored, quiet initials avatar otherwise */
export function StaffAvatar({ staff, size = 40 }: { staff: Pick<Staff, "name" | "photoId">; size?: number }) {
  const src = useImageSrc(staff.photoId);
  if (src) {
    return (
      <img
        src={src}
        alt={staff.name}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Avatar name={staff.name} size={size} />;
}

export function RolePill({ role, className }: { role: StaffRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold",
        className,
      )}
      style={rolePillStyle(role)}
    >
      {roleLabel(role)}
    </span>
  );
}
