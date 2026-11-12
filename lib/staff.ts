"use client";

import { id } from "./format";
import { deleteImageBlob, isLocalImageRef } from "./image-store";
import { usePos } from "./store";

/**
 * Staff & roles adapter over the register store.
 *
 * Staff used to live in its own localStorage keys (`nova-pos-staff-v1`,
 * `nova-pos-current-staff`); the store now owns the list so it persists,
 * backs up and syncs together with the rest of the register. `rehydrate()`
 * in lib/store.ts performs the one-time legacy import.
 * Avatars reuse the product photo pipeline: staff.photoId holds an
 * "idb:<uuid>" reference into the nova-pos-images IndexedDB.
 */

export type StaffRole = "owner" | "supervisor" | "cashier";
export type StaffAction = "refund" | "editData" | "reports";

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  photoId?: string; // "idb:<uuid>" reference into nova-pos-images
  phone?: string;
  createdAt: number;
  active: boolean;
  updatedAt?: number;
};

export function roleLabel(role: StaffRole): string {
  return role === "owner" ? "Owner" : role === "supervisor" ? "Supervisor" : "Cashier";
}

/** soft tint pill colours — owner green, supervisor blue, cashier violet */
export function rolePillStyle(role: StaffRole): { color: string; background: string } {
  switch (role) {
    case "owner":
      return { color: "var(--accent)", background: "var(--accentsoft)" };
    case "supervisor":
      return { color: "var(--info)", background: "var(--info-soft)" };
    case "cashier":
      return { color: "var(--violet)", background: "var(--violet-soft)" };
  }
}

/** owner/supervisor can do everything; a cashier may only view reports */
export function can(action: StaffAction): boolean {
  const me = currentStaff();
  if (!me || !me.active) return false;
  if (me.role === "owner" || me.role === "supervisor") return true;
  return action === "reports";
}

function pickCurrent(all: Staff[], cid: string | null): Staff | null {
  const found =
    (cid ? all.find((s) => s.id === cid && s.active) : undefined) ??
    all.find((s) => s.role === "owner" && s.active) ??
    all.find((s) => s.active) ??
    all[0];
  return found ? { ...found } : null;
}

/* --------------------------------- actions -------------------------------- */

export function loadStaff(): Staff[] {
  return usePos.getState().staff.map((s) => ({ ...s }));
}

export function getAllStaff(): Staff[] {
  return usePos.getState().staff;
}

export function createStaff(init: { name: string; role: StaffRole; phone?: string; photoId?: string }): Staff {
  return {
    id: id("st_"),
    name: init.name.trim(),
    role: init.role,
    phone: init.phone?.trim() ?? "",
    photoId: init.photoId,
    createdAt: Date.now(),
    active: true,
  };
}

export function upsertStaff(staff: Staff): void {
  const prev = usePos.getState().staff.find((s) => s.id === staff.id);
  usePos.getState().upsertStaff(staff);
  // the replaced avatar photo is no longer referenced — free it
  if (prev?.photoId && isLocalImageRef(prev.photoId) && prev.photoId !== staff.photoId) {
    void deleteImageBlob(prev.photoId);
  }
}

export function setStaffActive(sid: string, active: boolean): void {
  const row = usePos.getState().staff.find((s) => s.id === sid);
  if (row) usePos.getState().upsertStaff({ ...row, active });
}

export function deleteStaff(sid: string): void {
  const prev = usePos.getState().staff.find((s) => s.id === sid);
  usePos.getState().deleteStaff(sid);
  if (prev?.photoId && isLocalImageRef(prev.photoId)) void deleteImageBlob(prev.photoId);
}

export function setCurrentStaff(sid: string): void {
  usePos.getState().setCurrentStaff(sid);
}

/* ------------------------------ current staff ----------------------------- */

export function currentStaff(): Staff | null {
  const s = usePos.getState();
  return pickCurrent(s.staff, s.currentStaffId);
}

/** reactive member list — re-renders on every staff mutation */
export function useStaffList(): Staff[] {
  return usePos((s) => s.staff);
}

/** reactive signed-in member (falls back to the owner) */
export function useCurrentStaff(): Staff | null {
  const staff = usePos((s) => s.staff);
  const cid = usePos((s) => s.currentStaffId);
  return pickCurrent(staff, cid);
}
