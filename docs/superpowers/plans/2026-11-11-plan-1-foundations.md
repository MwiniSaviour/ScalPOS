# Plan 1 — Foundations: business-agnostic core

Source spec: `docs/superpowers/specs/2026-11-11-business-agnostic-design.md`

**Goal**: A store's `businessType` exists end-to-end (types, persisted store, cloud
sync, creation flow, feature gating, terminology). Retail stores behave exactly as
today. No specialized features yet — those are Plans 2–4.

**Deliverable you can test**: create a shop → pick a type → the app's labels and
nav reflect that type; an existing retail shop upgrades invisibly and syncs its
type to the cloud and to a second device.

**Out of scope**: batches, recipes, tables, appointments, packages, purchase
orders, kitchen view (Plans 2–4).

## Verified code facts (do not re-derive)

- `lib/types.ts` — `Settings` has: `shopName, address, phone, ownerId, momoNumber,
  momoNetwork, taxRate, taxInclusive, receiptFooter, theme, nextOrderNo`. No
  businessType. `defaultSettings()` builds the initial Settings (grep its exact
  location before editing).
- `lib/store.ts` — zustand `persist`, key `nova-pos-v1`, `partialize` includes
  `settings` (line ~499). `rehydrate()` (line ~161) runs after persist restore;
  `updateSettings` (line ~471) shallow-merges. Old blobs persist the **whole
  settings object**, so a new field is absent after upgrade — backfill in
  `rehydrate()`.
- `lib/sync/settings.ts` — settings ride a dedicated one-row pipeline (NOT the
  generic engine row pipeline): `pushSettings` writes snake_case columns to the
  `settings` table; `pullSettings` fills only unset local fields. Extend both.
- Staff lives device-local in `lib/staff.ts` (keys `nova-pos-staff-v1`,
  `nova-pos-current-staff`, `OWNER_ID = "st_owner"`, `Staff { id, name, role:
  "owner"|"supervisor"|"cashier", photoId?, phone?, createdAt, active }`).
- Migration dir: `backend/supabase/migrations/` (latest 0011) → new file
  `0012_business_types.sql`.
- Tests: `npm test` runs `node --test tests/**/*.test.ts` (integration tests need
  `SUPABASE_URL`/service env; skip otherwise). Canonical gates (MUST pass every
  task):
  - `./node_modules/.bin/tsc --noEmit`
  - `./node_modules/.bin/eslint app components lib`
  - `./node_modules/.bin/next build --webpack`

## Task 1 — BusinessType in the model

Files: `lib/types.ts`, `lib/store.ts`

1. In `lib/types.ts` add:
   ```ts
   export type BusinessType = "retail" | "pharmacy" | "restaurant" | "salon";
   export const BUSINESS_TYPES: BusinessType[] = ["retail", "pharmacy", "restaurant", "salon"];
   ```
2. Add `businessType: BusinessType` to `Settings` (documented as immutable-ish:
   changeable from shop settings with a data-caveat note).
3. Extend `defaultSettings()` with `businessType: "retail"`.
4. In `rehydrate()` (lib/store.ts ~line 168), right after the null check, backfill
   old blobs:
   ```ts
   const s = get();
   if (!s.settings.businessType) set({ settings: { ...s.settings, businessType: "retail" } });
   ```
   (move the existing `const s = get()` up / reuse it — one read only).
5. `updateSettings` already shallow-merges — no change needed.

Verify: tsc, eslint, build. Manual: open app with an existing localStorage blob →
settings.businessType === "retail".

## Task 2 — lib/features.ts (gating module)

New file `lib/features.ts` (+ `"use client"` not needed — pure data module).

```ts
import type { BusinessType } from "./types";

export type Feature =
  | "core-pos" | "inventory" | "customers" | "reports" | "staff"
  | "momo" | "tax" | "backup"
  | "batches" | "expiry" | "rx" | "suppliers-po"      // pharmacy
  | "tables" | "order-types" | "kitchen" | "recipes" | "daily-availability" // restaurant
  | "appointments" | "services" | "packages" | "commissions"; // salon

const SETS: Record<BusinessType, Feature[]> = {
  retail:     ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup"],
  pharmacy:   ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "batches", "expiry", "rx", "suppliers-po"],
  restaurant: ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "tables", "order-types", "kitchen", "recipes", "daily-availability"],
  salon:      ["core-pos", "inventory", "customers", "reports", "staff", "momo", "tax", "backup",
               "appointments", "services", "packages", "commissions"],
};

export function featuresOf(bt: BusinessType): Feature[] { return SETS[bt] ?? SETS.retail; }
export function hasFeature(bt: BusinessType, f: Feature): boolean {
  return featuresOf(bt).includes(f);
}
```

No billing/entitlement imports here — plan-tier gating stays in `lib/api/*`.

Verify: tsc, eslint, build.

## Task 3 — lib/terms.ts (terminology)

New file `lib/terms.ts` with a `useTerms()` hook (needs `usePos`, so it is a
client module):

```ts
"use client";
import { usePos } from "./store";
import type { BusinessType } from "./types";

type Terms = {
  customer: string; customers: string; product: string; products: string;
  inventory: string; order: string; orders: string; sale: string;
};
const RETAIL: Terms = { customer: "Customer", customers: "Customers", product: "Product",
  products: "Products", inventory: "Inventory", order: "Order", orders: "Orders", sale: "Sale" };
const TABLES: Record<BusinessType, Terms> = {
  retail: RETAIL,
  pharmacy: { ...RETAIL, customer: "Patient", customers: "Patients" },
  restaurant: { ...RETAIL, product: "Menu item", products: "Menu items",
    order: "Ticket", orders: "Tickets" },
  salon: { ...RETAIL, customer: "Client", customers: "Clients",
    product: "Service/Product", products: "Services/Products" },
};
export function termsOf(bt: BusinessType): Terms { return TABLES[bt] ?? RETAIL; }
export function useTerms(): Terms { return termsOf(usePos((s) => s.settings.businessType)); }
```

Call sites keep using terms in Plans 2–4 as pages are touched — Plan 1 only
swaps labels on the **nav/home/more screens** so the deliverable is visible.

Files: `app/home-screen.tsx`, `app/more-screen.tsx`, bottom nav component
(grep `customers` labels in `components/` for the nav) — replace literal
"Customers"/"Products"/"Orders" with `terms.x` via `useTerms()`.

Verify: tsc, eslint, build; headless-chromium smoke (serve `out/`, screenshot
home + more for a retail store — must look unchanged).

## Task 4 — Creation flow picker

**Verified**: there is NO wizard. `app/shop-create-screen.tsx` is a single-page
form; `app/onboarding-screen.tsx` is a 3-slide marketing carousel that already
routes to `/shop/create` at the end. The picker goes INSIDE the existing
single-page form.

Files: `app/shop-create-screen.tsx`.

1. Add a "Business type" field to the existing form: 4 selectable cards
   (Grid 2×2), retail first with "Default" note, each card = icon + name +
   one-line example ("Pharmacy — sell medicines in packs and strips").
   Retail is pre-selected.
2. Save path: include the selection in the shop-create save
   (`updateSettings({ businessType })` or the create call, matching how the
   form saves shopName today). No extra "advance" step, no back-navigation.
3. Existing shops are NOT prompted (picker only in creation flow; changing an
   existing shop's type is Task 6). Do not touch `app/onboarding-screen.tsx`.

Verify: tsc, eslint, build; chromium smoke of the creation flow in a clean
profile (localStorage empty) — pick "Pharmacy" → confirm settings.businessType
persisted in `nova-pos-v1`.

## Task 5 — Cloud sync of businessType

Files: `lib/sync/settings.ts`, `backend/supabase/migrations/0012_business_types.sql`.

1. Migration (idempotent, matches 0001–0011 style — read 0011 for the header
   pattern first):
   ```sql
   alter table settings add column if not exists business_type text not null default 'retail';
   ```
2. `RemoteSettings` type: add `business_type?: unknown`.
3. `pushSettings` row: add `business_type: s.businessType`.
4. `pullSettings`: `if (typeof r.business_type === "string" && BUSINESS_TYPES.includes(r.business_type as BusinessType) && !s.businessType) patch.businessType = r.business_type;`
   (local always wins once set — mirror the fill-gaps convention).

Desktop mirror (same task): `apps/desktop/src/lib/` — find its settings
read/write module (grep `settings` in `apps/desktop/src/lib`) and add the same
column mapping. Read `apps/desktop/AGENTS.md` + local Next docs before touching.

Verify: tsc + eslint + build on BOTH apps; `npm test` if Supabase env is
present; apply migration to the live project (`backend/supabase` workflow used
for 0001–0011).

## Task 6 — Change business type from shop settings

Files: `app/shopsettings-screen.tsx`, `app/settings-screen.tsx` (whichever
renders shop fields — grep `updateSettings`).

Add a "Business type" row opening a 4-option picker (same cards as Task 4).
On change of a NON-retail type on an existing store: confirm dialog noting
specialized pages unlock and terminology changes. No data migration is needed —
features just gate on.

Verify: tsc, eslint, build; chromium smoke.

## Task 7 — Staff into the synced register store

**Verified**: the `staff` table ALREADY EXISTS in the cloud —
`backend/supabase/migrations/0001_init.sql:198-215` defines it (`org_id, name,
role, photo_path, phone, active, deleted_at`, `op_id uuid unique`,
moddatetime trigger, org indexes); RLS in `0002_rls.sql:181-189`
(select/insert/update, delete denied); realtime in `0003_realtime.sql`;
re-asserted in `0011`. **No new migration is needed.** The sync column is
`op_id`, NOT `local_id`. Deletes are soft via `deleted_at`, not `active:false`.

Real `lib/staff.ts` exports (keep these names): `createStaff`, `getAllStaff`,
`setStaffActive`, `deleteStaff`, `upsertStaff`, `setCurrentStaff`,
`currentStaff`, `can`, `useStaffList`, `useCurrentStaff`, plus `roleLabel`,
`rolePillStyle`; types `StaffRole`, `StaffAction`, `Staff`. Keys:
`nova-pos-staff-v1`, `nova-pos-current-staff`, `OWNER_ID = "st_owner"`.

Files: `lib/store.ts`, `lib/staff.ts`, `app/staff-screen.tsx`.

1. Add `staff: Staff[]` + `currentStaffId: string | null` to `PosState`;
   `partialize` includes both. Actions: `upsertStaff`, `deleteStaff`
   (soft via `deleted_at`, mirroring the cloud table), `setCurrentStaff`.
   Owner row (`st_owner`) is seeded into `staff` on first rehydrate if missing.
2. `lib/staff.ts` becomes a thin adapter over `usePos` keeping the exported
   names above (re-export the types; keep `roleLabel`, `rolePillStyle`).
   **Drop the `useSyncExternalStore` import (line 3)** — it is on the BANNED
   crash-class list; store selectors via `usePos` are referentially stable.
   Grep ALL call sites (`useStaffList`, `useCurrentStaff`, `getAllStaff`,
   `createStaff`, `upsertStaff`, `setCurrentStaff`, `can`) and switch them to
   the store-backed implementations.
3. Rehydrate migration: if `nova-pos-staff-v1` exists in localStorage and the
   store staff list is empty, import its members, keep
   `nova-pos-current-staff`, then remove both legacy keys (one-time, guarded).
4. Sync: add `staff` to `TABLES` in `lib/sync/engine.ts` (line ~34, currently
   `["categories","products","customers","orders","order_items","stock_moves"]`)
   the way products are registered. Confirm `DEPS` in `lib/sync/outbox.ts`
   (line ~8) already covers staff — add it if missing. The remote row key is
   `op_id`; pushes/deletes must use `deleted_at` semantics.

This task is the largest in Plan 1. If it grows beyond a day, split it into its
own plan and ship Tasks 1–6 first — Tasks 1–6 are independently shippable.

Verify: full gates; chromium smoke: add a staff member → reload → persists;
`npm test` with Supabase env if available (two-device staff sync check mirrors
`tests/integration/sync.test.ts` patterns).

## Task 8 — Desktop visibility pass

Files: `apps/desktop/src/app/dashboard/more/page.tsx` (or its nav component),
`apps/desktop/src/lib/terms.ts` (mirror of Task 3 reading businessType from the
desktop settings source).

Desktop labels for customers/products/orders follow the shop's type; pharmacy
adds a "Purchase orders" nav item placeholder **only when**
`hasFeature(bt, "suppliers-po")` (Plan 2 fills the page).

Verify: `./node_modules/.bin/tsc --noEmit` + eslint + build inside
`apps/desktop`.

## Final verification (whole plan)

1. `./node_modules/.bin/tsc --noEmit` — clean.
2. `./node_modules/.bin/eslint app components lib` — clean.
3. `./node_modules/.bin/next build --webpack` — 41/41 pages.
4. `apps/desktop` gates clean.
5. Headless chromium (clean profile): creation flow → pick each of the 4 types
   → labels change accordingly; retail existing-store upgrade shows zero UI
   change.
6. Git commit per task (atomic), push to master only after user review —
   master auto-deploys production.
