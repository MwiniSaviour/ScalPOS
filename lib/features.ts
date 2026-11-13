import type { BusinessType } from "./types";

export type Feature =
  | "core-pos" | "inventory" | "customers" | "reports" | "staff"
  | "momo" | "tax" | "backup"
  | "batches" | "expiry" | "rx" | "suppliers-po"
  | "tables" | "order-types" | "kitchen" | "modifiers" | "recipes" | "daily-availability"
  | "appointments" | "services" | "packages" | "commissions";

const SETS: Record<BusinessType, Feature[]> = {
  retail:     ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup"],
  pharmacy:   ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "batches", "expiry", "rx", "suppliers-po"],
  restaurant: ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "tables", "order-types", "kitchen", "modifiers", "recipes", "daily-availability"],
  salon:      ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "appointments", "services", "packages", "commissions"],
};

export function featuresOf(bt: BusinessType): Feature[] { return SETS[bt] ?? SETS.retail; }
export function hasFeature(bt: BusinessType, f: Feature): boolean {
  return featuresOf(bt).includes(f);
}
