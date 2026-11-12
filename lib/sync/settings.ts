"use client";

/**
 * Shop settings sync.
 *
 * The `settings` table is a one-row-per-shop document (no local_id, no row
 * diffs), so it rides outside the generic row pipeline in engine.ts. Without
 * this module a reinstall restored products, orders and customers but left the
 * shop name, phone, address and MoMo details behind.
 */

import { readConnection } from "@/lib/api/bootstrap";
import type { SyncConnection } from "@/lib/api/bootstrap";
import { freshToken } from "@/lib/api/session";
import { getSupabase } from "@/lib/api/supabase";
import { BUSINESS_TYPES } from "@/lib/types";
import type { BusinessType, Settings } from "@/lib/types";

type RemoteSettings = {
  shop_name?: unknown;
  address?: unknown;
  phone?: unknown;
  owner_name?: unknown;
  momo_number?: unknown;
  momo_network?: unknown;
  tax_inclusive?: unknown;
  tax_rate?: unknown;
  receipt_footer?: unknown;
  theme?: unknown;
  next_order_no?: unknown;
  business_type?: unknown;
};

async function client() {
  return getSupabase((await freshToken()) ?? undefined);
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Untouched first-run settings — pushing these would clobber the cloud copy. */
function isPristine(s: Settings): boolean {
  return (
    s.shopName.trim() === "My Shop" &&
    s.address.trim() === "" &&
    s.phone.trim() === "" &&
    s.ownerId.trim() === "Owner" &&
    s.momoNumber.trim() === "" &&
    s.receiptFooter.trim() === ""
  );
}

/** Push this device's shop settings so a reinstall can restore them. */
export async function pushSettings(conn?: SyncConnection | null): Promise<boolean> {
  const c = conn ?? readConnection();
  if (!c?.org_id) return false;
  const { usePos } = await import("@/lib/store");
  const s = usePos.getState().settings;
  if (isPristine(s)) return false;
  const sb = await client();
  if (!sb) return false;

  const row = {
    org_id: c.org_id,
    shop_name: s.shopName,
    address: s.address,
    phone: s.phone,
    owner_name: s.ownerId,
    momo_number: s.momoNumber,
    momo_network: s.momoNetwork,
    tax_inclusive: s.taxInclusive,
    tax_rate: s.taxRate,
    receipt_footer: s.receiptFooter,
    theme: s.theme,
    next_order_no: s.nextOrderNo,
    business_type: s.businessType,
    updated_at: new Date().toISOString(),
  };

  const upd = await sb
    .from("settings")
    .update(row)
    .eq("org_id", c.org_id)
    .is("deleted_at", null)
    .select("id");
  if (upd.error) throw new Error(upd.error.message);
  if (upd.data && upd.data.length > 0) return true;

  const ins = await sb.from("settings").insert(row).select("id");
  if (ins.error) throw new Error(ins.error.message);
  return true;
}

/**
 * Merge the cloud copy of the shop settings into this device. Fields that are
 * already set locally win, so a pull never overwrites an edit — it only fills
 * the gaps left by a reinstall.
 */
export async function pullSettings(conn?: SyncConnection | null): Promise<void> {
  const c = conn ?? readConnection();
  if (!c?.org_id) return;
  const sb = await client();
  if (!sb) return;
  const { data, error } = await sb
    .from("settings")
    .select("*")
    .eq("org_id", c.org_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return;

  const r = data as RemoteSettings;
  const { usePos } = await import("@/lib/store");
  const s = usePos.getState().settings;
  const patch: Partial<Settings> = {};

  if (s.shopName.trim() === "My Shop" && str(r.shop_name)) patch.shopName = str(r.shop_name);
  if (!s.address.trim() && str(r.address)) patch.address = str(r.address);
  if (!s.phone.trim() && str(r.phone)) patch.phone = str(r.phone);
  if ((!s.ownerId.trim() || s.ownerId.trim() === "Owner") && str(r.owner_name)) {
    patch.ownerId = str(r.owner_name);
  }
  if (!s.momoNumber.trim() && str(r.momo_number)) patch.momoNumber = str(r.momo_number);
  if (!s.momoNetwork.trim() && str(r.momo_network)) patch.momoNetwork = str(r.momo_network);
  if (!s.receiptFooter.trim() && str(r.receipt_footer)) patch.receiptFooter = str(r.receipt_footer);
  if (typeof r.tax_inclusive === "boolean" && s.taxInclusive) {
    patch.taxInclusive = r.tax_inclusive;
  }
  const remoteRate = Number(r.tax_rate);
  if (Number.isFinite(remoteRate) && remoteRate > 0 && s.taxRate === 0) patch.taxRate = remoteRate;
  if (r.theme === "light" && s.theme === "dark") patch.theme = "light";
  const remoteNo = Number(r.next_order_no);
  if (Number.isFinite(remoteNo) && remoteNo > 1 && s.nextOrderNo <= 1) {
    patch.nextOrderNo = remoteNo;
  }
  if (
    typeof r.business_type === "string" &&
    BUSINESS_TYPES.includes(r.business_type as BusinessType) &&
    !s.businessType
  ) {
    patch.businessType = r.business_type as BusinessType;
  }

  if (Object.keys(patch).length > 0) usePos.getState().updateSettings(patch);
}
