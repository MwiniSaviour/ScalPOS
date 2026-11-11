# Business-Agnostic Nova POS — Design

Date: 2026-11-11
Scope: both apps — mobile (Next static-export SPA + Capacitor, root of repo) and desktop (`apps/desktop`, Next.js web).
Status: approved direction, pending build plan.

## Intent and why

Today both apps are a retail-shop POS: products, orders, customers, stock. The
goal is to make them **business-agnostic**: one codebase, one store, that serves
a pharmacy, a restaurant, a salon/barbershop, or a food vendor as naturally as a
general shop. The business type is chosen during onboarding/shop creation and
determines:

1. which modules and pages the user gets,
2. the specialized features for that industry,
3. the terminology used everywhere ("customers" vs "patients" vs "clients" vs
   "guests", "orders" vs "tickets" vs "visits", etc.).

The existing pages already map to universal concepts (catalog, sales, customers,
inventory, reports). We **modify and extend the shared pages/components** rather
than fork the app per business type. Specialized screens (kitchen, appointments)
are added per type.

## Goals

- v1 ships **full industry-standard feature sets** for all four types (user
  decision, not a phased skeleton):
  - **Retail**: what exists today (barcodes, variants via SKU, stock moves,
    low-stock, suppliers on desktop, MoMo/cash/card/credit payments, discounts,
    tax, receipts, reports).
  - **Pharmacy**: batch & expiry tracking with FEFO (earliest-expiring sells
    first), prescription-only and controlled-substance flags, unit conversions
    (box → strip → tablet; sell in any unit), supplier purchase orders,
    expiry + low-stock alerts, patients with allergy notes.
  - **Restaurant**: order types (dine-in / takeaway / delivery), tables & open
    tabs, kitchen tickets with status pipeline (queued → preparing → ready →
    served) and a kitchen screen, modifiers ("no onions") and size variants,
    recipes (menu item consumes ingredients; stock depletes in ingredient
    units).
  - **Food vendor**: restaurant **preset** — takeaway-only ticket queue with
    order numbers, daily menu availability, plate-based prep counts. No tables.
  - **Salon/Barbershop**: services with duration + price, staff with skills and
    schedules, appointments calendar + walk-in queue, client visit history with
    service notes, packages/loyalty credits, per-service staff commission, and
    the ability to also sell retail products (hybrid).
- Terminology adapts per type everywhere in the UI (nav, buttons, empty states,
  reports, receipts).
- Existing stores upgrade cleanly: they default to **retail** and nothing about
  their data or UX changes (user decision).
- Both apps get this in the same effort; shared Supabase schema and shared
  type/feature/terminology contracts.

## Non-goals

- Multi-currency, payroll, full accounting, tax-filing integrations.
- Regulatory compliance beyond flags and records (e.g. no official controlled-
  substances register filing, no NHIS claims integration).
- Laundry services — **wave 2** (docket status pipeline, per-garment lines,
  express pricing, commercial clients, damage claims).
- Per-business-type forks of the app, or separate app store listings.
- Replacing the local-first store with a server-driven model. Mobile stays
  offline-first with sync; desktop stays Supabase-backed.

## Anti-goals (what would make this a failure even if it works)

- Any regression for existing retail stores (data, performance, or UX).
- Feature-flag sprawl that makes screens unreadable (flags must live in a
  dedicated module, not scattered conditionals).
- Terminology baked into components (hardcoded "Product"/"Customer" strings
  that don't follow the type).

## Constraints (platform facts)

- Mobile: Next static export (`next build --webpack`), **no dynamic route
  segments** — detail/edit pages take `?id=`; every screen that uses
  `useSearchParams()` is a `"use client"` screen file wrapped in `<Suspense>` by
  its `app/<route>/page.tsx`.
- `next build --webpack` (Turbopack unavailable); must pass
  `tsc --noEmit` and `eslint app components lib` before any claim of done.
- **BANNED**: `useSyncExternalStore` / `useClientValue` with non-memoized
  structured readers (React #185 crash class). New derived reads: `useState` +
  `useEffect`, zustand-style store, or memoized readers only.
- Mobile store is zustand-like local-first (`lib/store.ts`) with a sync engine
  (`lib/sync/*`) over Supabase (`backend/supabase/migrations`, currently
  0001–0011). Desktop (`apps/desktop`) uses Clerk auth + Supabase directly.
- Desktop is **NOT stock Next.js** — read `apps/desktop/node_modules/next/dist/docs/`
  before writing Next code there; heed deprecation notices in that folder.
- Tailwind tokens on both apps: only `surface, surface2, line, line2,
  ink/ink2/ink3, accent, accentink, accentsoft, danger` (+ `bg-white` invalid on
  desktop side too — use tokens). UI kit: `components/ui/*` (Button, Card, Chip,
  Input, Sheet, NumberPad, StatusPill, SegmentList, Avatar, Confirm, EmptyState,
  StatCard, SearchBar…). Icons: lucide-react.
- Android delivery: `npm run build` → `cap sync android`; finished APK goes to
  `~/storage/downloads/`.

## Decisions made (by the owner)

- v1 lineup: **retail (default, as-is) + pharmacy + restaurant + salon**; food
  vendor is a restaurant preset; laundry deferred to wave 2.
- v1 ships the **full feature set** per type (option 1).
- Existing stores default to retail on upgrade.
- Approach: extend shared components/pages + add per-type screens; business type
  chosen at onboarding/shop creation; type drives modules, features, naming.
- **Paywall**: all four business types are free on every plan tier — the
  type/preset picker is never gated by billing. `lib/features.ts` derives from
  `businessType` only; billing/entitlement checks stay entirely separate from
  feature gating.

## 1. Business-type model

- `businessType: "retail" | "pharmacy" | "restaurant" | "salon"` on Settings.
  Default `"retail"`.
- Optional `preset` on settings for variants that only change configuration:
  `restaurant.preset: "foodVendor"` (takeaway-only, no tables), and salon
  naming variant (hairdresser vs barber) if we want it later. Presets change
  *configuration and labels*, never the feature contract of the type.
- Feature gating lives in one module: `lib/features.ts` (mobile) and mirrored
  constants on desktop. It derives a feature set from the type:

```ts
type Feature =
  | "stock" | "batches" | "feo" | "prescription" | "unitConversions"
  | "purchaseOrders" | "expiryAlerts"
  | "tables" | "orderTypes" | "kitchen" | "modifiers" | "recipes"
  | "services" | "appointments" | "staffSchedules" | "commissions"
  | "packages";
```

| Feature | retail | pharmacy | restaurant | salon | restaurant+foodVendor |
|---|---|---|---|---|---|
| stock | y | y | ingredients only | supplies only | ingredients only |
| batches/FEFO/expiryAlerts | – | y | – | – | – |
| prescription | – | y | – | – | – |
| unitConversions | – | y | – | – | – |
| purchaseOrders | – | y | – | – | – |
| tables/orderTypes | – | – | y | – | orderTypes only |
| kitchen | – | – | y | – | y |
| modifiers | – | – | y | – | y |
| recipes | – | – | y | – | y |
| services | – | – | – | y | – |
| appointments | – | – | – | y | – |
| staffSchedules/commissions | – | – | – | y | – |
| packages | – | – | – | y | – |

Screens check features via this module only — never inline `businessType ===`
string comparisons in components (my call; keeps flags auditable).

## 2. Terminology layer

- `lib/terms.ts` (mobile) + mirrored file on desktop: a dictionary keyed by
  businessType with universal concept keys:

```ts
terms.for("pharmacy") // { catalog:"Medicines", item:"Medicine", customers:"Patients",
                      //   customer:"Patient", orders:"Dispensing", order:"Dispense",
                      //   inventory:"Stock", sell:"Dispense", ... }
```

- Components consume via `useTerms()` (from the store, memoized — see banned-
  pattern rule) and in plain contexts via `terms.for(type).customer`.
- Applied to: nav labels, page titles, buttons, empty states, reports,
  receipts, toasts. **Not** applied to internal field names (data stays
  `customers`).
- Salon variant naming (barbershop vs hairdresser) is a label tweak only.

## 3. Data model changes (mobile types + Supabase mirror)

New/changed types in `lib/types.ts`, mirrored by migration
`backend/supabase/migrations/0012_business_types.sql` (desktop reads/writes the
same shapes). Sync merge must treat missing new fields as defaults so old
records and old clients survive.

**Storage decision (owner-approved)**: every new entity below — Batch, Recipe,
Appointment, Package, PurchaseOrder, Table — lives in the **main synced
register store** exactly like products and orders (same outbox, merge,
backup, demo-wipe paths). No second persistence layer, no device-local
exemptions. Desktop reads/writes the same Supabase tables.

**Settings** += `businessType: BusinessType` (default "retail"),
`restaurantConfig?: { tables: boolean; orderTypes: OrderType[] }`,
`salonConfig?: { openDays, openHours }`.

**Product** (catalog — becomes kind-aware):
- += `kind: "product" | "service"` (service: no stock, has duration/price).
- += `prescriptionOnly?: boolean`, `controlled?: boolean` (pharmacy).
- += `durationMin?: number` (services, salon).
- += `packs?: { name: string; factor: number }[]` — unit conversions; `factor`
  = base units per pack (box=10 strips ×10 tabs → strip:10, box:100). Selling a
  pack deducts `factor` base units; selling a base unit is always possible
  (pharmacy). Sales price can differ per pack (line price is what the cashier
  picks).
- += `modifiers?: { id: string; name: string; priceDelta: number }[]` and
  `variants?: { id: string; name: string; priceDelta: number }[]` (restaurant
  menu items).

**Batch** (pharmacy, new entity): `{ id, productId, batchNo, expiry, qty,
cost }`. Stock per product = sum of batches; FEFO allocation on sale picks the
earliest-expiring batches; product-level `stock` stays as the derived total
for retail compatibility.

**Recipe** (restaurant, new entity): `{ productId, lines:
[{ ingredientProductId, qty, wastePct? }] }`. Placing an order line for a menu
item consumes ingredients via stock moves (reason `sale`, ref orderId) in
ingredient units. Recipes are edited on the product screen when `recipes` is
on.

**Order/OrderItem** (universal, optional extensions):
- Order += `orderType?: "dine-in" | "takeaway" | "delivery"`,
  `tableId?: string` (open tab = pending order bound to a table),
  `ticketStatus?: "queued" | "preparing" | "ready" | "served"` (kitchen
  pipeline; updates ride the same order object), `staffId?: string` (who
  served / who earns commission).
- OrderItem += `batchAllocations?: { batchId, qty }[]` (FEFO record),
  `packName?: string` (sold "1 box"), `modifierIds?: string[]`,
  `variantId?: string`, `prescriptionRef?: string` (rx number captured at
  sale), `serviceStaffId?: string` + `commissionAmt?: number` (salon).
- OrderStatus stays `pending | completed | refunded`; appointments carry their
  own status (below). Restaurant "open tabs" = pending orders grouped by table.
- **Refund semantics** (owner-approved): pharmacy restocks by the order's
  recorded `batchAllocations` (not FEFO — expired-in-the-meantime batches go
  back where they came from); restaurant orders re-credit ingredients via
  reverse stock moves, with a **per-order "skip restock" toggle** in the refund
  flow (waste/already-made case); retail keeps today's restock behavior.

**Appointment** (salon, new entity): `{ id, customerId, staffId,
serviceLines: [{ productId, price }], start, durationMin, status:
"booked" | "arrived" | "in-service" | "done" | "no-show" | "cancelled",
notes }`. Converting an appointment to a sale creates an Order (visit record)
with the same lines + services. Walk-in = appointment created with status
`in-service` straight away.

**Customer** += `allergies?: string` (pharmacy patients), `visitNotes?:
{ t, text }[]` (salon service history notes), `packageCredits?: { packageId,
remaining }[]` (salon packages).

**Package** (salon, new entity): `{ id, name, price, credits: [{ productId,
qty }] }` — sold as an order item; credits consumed by subsequent visits.
Credit mechanics (owner-approved): consuming a credit is a **"use credit"
flag on the order line** (the line prices to 0 and decrements the matching
`packageCredits` entry); refunding such a line **restores the credit**;
refunding the **package purchase itself restores nothing** (credits already
consumed stay consumed, un-consumed credits are simply voided).

**Staff** (exists in `lib/staff.ts`, currently device-local and deliberately
outside the register store) **moves into the synced register store** so
schedules, commissions and appointments work across devices and ride
backups/sync like products and orders. Same roster as owner/cashier roles
(one staff list, extended). New fields: `skills: string[]` (product/service
ids), `schedule: { day: number; start: string; end: string }[]`,
`commissionPct: number`. Removing the device-local exemption updates
`lib/staff.ts` storage, backup, demo-wipe and sync accordingly.

**PurchaseOrder** (pharmacy; desktop already has a suppliers page):
`{ id, supplierId, lines: [{ productId, packName?, qty, unitCost }], status:
"draft" | "sent" | "received" }`. Receiving a PO creates purchase stock moves
(and pharmacy batches if batched items). **Desktop-only in v1** (owner call):
no mobile PO page; `"sent"` is a status the user sets by hand — no email/procurement integration.

**Table** (restaurant, new entity): `{ id, name, seats }` (seeded 1–N, admin
can edit). The Table list is **authoritative**: `restaurantConfig.tables`
merely records whether the module is shown; open tabs group by the actual
Table rows.

**Food vendor specifics** (owner-approved defaults): daily menu availability is
a **per-item toggle** that resets to available every morning (computed from
`date` of last change or a daily reset job in the store — builder's choice;
must survive neither cross-day staleness nor a restart); plate prep counts are
a **kitchen-side daily stat only** (counter on the kitchen board, reset each
day, no per-item prep ledger).

## 4. Screens / module map

Universal (all types, modified): home, sell/POS, orders(+detail), customers,
reports, settings, staff (mobile), account/security/billing unchanged.

Per-type additions / changes (mobile routes; desktop mirrors under
`/dashboard`):

| Route | Types | Notes |
|---|---|---|
| `/inventory` | retail, pharmacy, salon(supplies) | pharmacy adds expiry columns + batch editor in product detail; service toggle for salon |
| `/kitchen` | restaurant (+foodVendor) | ticket board, status pipeline, auto-refresh |
| `/appointments` | salon | day/week view, drag-less simple picker, walk-in button |
| `/orders` | all | restaurant: order-type chips + table grouping of open tabs; salon: visits |
| `/sell` | all | pharmacy: FEFO + pack picker + rx ref prompt; restaurant: modifiers/variants sheet; salon: services + staff pick |
| `/customers` | all | patient/clinic view (pharmacy), visit history (salon) |
| `/reports` | all | pharmacy: expiry report; restaurant: item+modifier mix; salon: staff commission |
| `/more` | all | module list filtered by features |
| dashboard (desktop) | all | same gating, plus `/dashboard/kitchen`, `/dashboard/appointments`, purchase orders page (pharmacy) |

Onboarding/shop-creation (`/onboarding`, `/shop`): a business-type picker step
(6 cards: shop, pharmacy, restaurant, food vendor, salon, barbershop) writing
`businessType` + preset to settings; then the normal flow. Changing type later
is possible in shop settings with a confirm dialog (data is never deleted;
hidden modules just hide).

## 5. Migration & back-compat

- No data migration needed for retail: absent fields = defaults.
- Old synced clients receiving new-field records ignore unknown fields (sync
  merge is field-based; verify `lib/sync/merge.ts` handles unknowns additively).
- Migration 0012 adds columns as nullable/with defaults; RLS unchanged
  (ownership rules already row-scoped).

## 6. What's left to the builder (my calls, adjust with taste)

- Exact visual design of kitchen board and appointments calendar (stay inside
  the existing UI kit and design tokens; no new deps).
- Kitchen refresh mechanism (poll vs existing realtime channel — reuse
  `lib/sync/realtime.ts` if trivial, else 5s poll).
- Whether salon walk-in flow lives on `/appointments` or `/sell` first.
- Receipt layout extensions (pack name, batch/expiry footer for pharmacy,
  table label for restaurant).
- Component decomposition of the type-aware sell flow.
- All copy/toast strings through the terms layer.

## 7. Verification expectations

- `./node_modules/.bin/tsc --noEmit` + `eslint app components lib` on mobile;
  desktop equivalent per its AGENTS.md; `next build --webpack` static export.
- Runtime check: headless chromium CDP on the desktop app (no Playwright).
- No `useSyncExternalStore` with fresh-object readers (grep check before done).
- APK delivered to `~/storage/downloads/` after `cap sync android`.
