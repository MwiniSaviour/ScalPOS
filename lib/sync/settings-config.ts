/**
 * The business-type setup that rides along with shop settings sync.
 *
 * Pure and browser-free so it can be tested — the settings table stores these
 * as jsonb columns, which can hold anything, so both directions validate.
 */

import type { Settings } from "../types";

export type SettingsConfigRow = {
  restaurant_config?: unknown;
  salon_config?: unknown;
};

/** What to write to the remote settings row. Other business types clear stale setup. */
export function configPayload(s: Settings): SettingsConfigRow {
  return {
    restaurant_config: s.businessType === "restaurant" ? s.restaurantConfig ?? null : null,
    salon_config: s.businessType === "salon" ? s.salonConfig ?? null : null,
  };
}

export function isRestaurantConfig(v: unknown): v is NonNullable<Settings["restaurantConfig"]> {
  if (!v || typeof v !== "object") return false;
  const c = v as { tables?: unknown; orderTypes?: unknown };
  return (
    typeof c.tables === "boolean" &&
    Array.isArray(c.orderTypes) &&
    c.orderTypes.every((t) => typeof t === "string")
  );
}

export function isSalonConfig(v: unknown): v is NonNullable<Settings["salonConfig"]> {
  if (!v || typeof v !== "object") return false;
  const c = v as { openDays?: unknown; openHours?: unknown };
  if (!Array.isArray(c.openDays) || !c.openHours || typeof c.openHours !== "object") return false;
  const days = c.openDays;
  const hours = c.openHours as { start?: unknown; end?: unknown };
  return (
    days.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6) &&
    typeof hours.start === "string" &&
    /^\d{2}:\d{2}$/.test(hours.start) &&
    typeof hours.end === "string" &&
    /^\d{2}:\d{2}$/.test(hours.end)
  );
}

/** Fill only missing local setup — a pull never overwrites an edit on this device. */
export function configPatch(r: SettingsConfigRow, s: Settings): Partial<Settings> {
  const patch: Partial<Settings> = {};
  if (s.businessType === "restaurant" && !s.restaurantConfig && isRestaurantConfig(r.restaurant_config)) {
    patch.restaurantConfig = r.restaurant_config;
  }
  if (s.businessType === "salon" && !s.salonConfig && isSalonConfig(r.salon_config)) {
    patch.salonConfig = r.salon_config;
  }
  return patch;
}
