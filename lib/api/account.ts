"use client";

import { writeConnection } from "@/lib/api/bootstrap";
import { freshToken } from "@/lib/api/session";
import { clearAllImages } from "@/lib/image-store";

export type DeleteAccountResult = {
  deletedOrgs: number;
  clerkDeleted: boolean;
};

const DEVICE_KEYS = [
  "nova-pos-v1",
  "nova-pos-pin-v1",
  "nova-pos-pin-unlocked",
  "nova-pos-onboarded",
  "nova-pos-theme",
  "nova-pos-sync-v1",
  "nova-pos-staff-v1",
  "nova-pos-current-staff",
  "nova-pos-idmap-v1",
  "nova-pos-first-push-v1",
  "nova-pos-last-pull",
  "nova-pos-notifs-seen",
  "nova-pos-alerts-shown",
  "nova-pos-trial-start",
  "nova-pos-entitlement-v1",
];

const DEVICE_DBS = ["nova-pos-outbox-v1", "nova-pos-conflicts-v1"];

/** Deletes the signed-in account's cloud footprint (shop data + identity). */
export async function deleteCloudAccount(): Promise<DeleteAccountResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) throw new Error("Cloud sync is not configured");
  const token = await freshToken(true);
  if (!token) throw new Error("You're signed out — sign in and try again.");

  const res = await fetch(`${url}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: "DELETE" }),
    signal: AbortSignal.timeout(30_000),
  });

  const json = (await res.json().catch(() => ({}))) as {
    deleted_orgs?: number;
    clerk_deleted?: boolean;
    error?: string;
    detail?: string;
  };

  if (!res.ok) {
    throw new Error(
      json.error === "shop_has_members"
        ? (json.detail ?? "Remove the other shop members first.")
        : (json.detail ?? json.error ?? "Could not delete your account. Try again."),
    );
  }

  return {
    deletedOrgs: json.deleted_orgs ?? 0,
    clerkDeleted: json.clerk_deleted === true,
  };
}

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Removes every trace of the (now deleted) shop from this device. */
export async function wipeDeviceAccountData(): Promise<void> {
  writeConnection(null);
  try {
    await clearAllImages();
  } catch {
    /* image db may be unavailable */
  }
  await Promise.all(DEVICE_DBS.map(deleteDb));
  try {
    for (const key of DEVICE_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
