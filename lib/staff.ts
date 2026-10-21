"use client";

import { useSyncExternalStore } from "react";
import { id } from "./format";
import { deleteImageBlob, isLocalImageRef } from "./image-store";

/**
 * Staff & roles data layer.
 *
 * Kept separate from lib/store.ts on purpose: staff accounts are device-local
 * identity, not register state — they must never bump the register's persist
 * version or ride along in backups. Own localStorage keys:
 *   nova-pos-staff-v1        — the member list
 *   nova-pos-current-staff   — id of the signed-in member
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
};

const LIST_KEY = "nova-pos-staff-v1";
const CURRENT_KEY = "nova-pos-current-staff";
const OWNER_ID = "st_owner";

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

/* ------------------------------ list storage ------------------------------ */

function seedOwner(): Staff {
  return { id: OWNER_ID, name: "Owner", role: "owner", createdAt: 0, active: true };
}

function isStaff(v: unknown): v is Staff {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    (s.role === "owner" || s.role === "supervisor" || s.role === "cashier") &&
    typeof s.createdAt === "number"
  );
}

function readRaw(): Staff[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStaff)
      .map((s) => ({ ...s, active: s.active ?? true, phone: s.phone ?? "" }));
  } catch {
    return [];
  }
}

function persistList(next: Staff[]): void {
  try {
    window.localStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

let list: Staff[] | null = null;
const listeners = new Set<() => void>();
const SERVER_LIST: Staff[] = [seedOwner()];

/** first load with nothing stored seeds a single owner named "Owner" */
function ensure(): Staff[] {
  if (list === null) {
    let l = readRaw();
    if (l.length === 0) {
      l = [seedOwner()];
      persistList(l);
    }
    list = l;
  }
  return list;
}

function write(next: Staff[]): void {
  list = next;
  persistList(next);
  for (const l of listeners) l();
}

function subscribeStaff(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getListSnapshot(): Staff[] {
  return ensure();
}

function getServerSnapshot(): Staff[] {
  return SERVER_LIST;
}

/* --------------------------------- actions -------------------------------- */

export function loadStaff(): Staff[] {
  return ensure().map((s) => ({ ...s }));
}

export function getAllStaff(): Staff[] {
  return ensure();
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
  const all = ensure();
  const i = all.findIndex((s) => s.id === staff.id);
  if (i < 0) {
    write([...all, { ...staff }]);
    return;
  }
  const prev = all[i];
  const next = all.slice();
  next[i] = { ...prev, ...staff, id: prev.id };
  write(next);
  // the replaced avatar photo is no longer referenced — free it
  if (prev.photoId && isLocalImageRef(prev.photoId) && prev.photoId !== staff.photoId) {
    void deleteImageBlob(prev.photoId);
  }
}

export function setStaffActive(sid: string, active: boolean): void {
  write(ensure().map((s) => (s.id === sid ? { ...s, active } : s)));
}

export function setCurrentStaff(sid: string): void {
  try {
    window.localStorage.setItem(CURRENT_KEY, sid);
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

/* ------------------------------ current staff ----------------------------- */

function readCurrentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

function pickCurrent(all: Staff[], cid: string | null): Staff | null {
  const found =
    (cid ? all.find((s) => s.id === cid && s.active) : undefined) ??
    all.find((s) => s.role === "owner" && s.active) ??
    all.find((s) => s.active) ??
    all[0];
  return found ? { ...found } : null;
}

export function currentStaff(): Staff | null {
  return pickCurrent(ensure(), readCurrentId());
}

function getCurrentIdSnapshot(): string {
  return readCurrentId() ?? "";
}

/** reactive member list — re-renders on every staff mutation */
export function useStaffList(): Staff[] {
  return useSyncExternalStore(subscribeStaff, getListSnapshot, getServerSnapshot);
}

/** reactive signed-in member (falls back to the owner) */
export function useCurrentStaff(): Staff | null {
  const cid = useSyncExternalStore(subscribeStaff, getCurrentIdSnapshot, () => "");
  return pickCurrent(useStaffList(), cid);
}
