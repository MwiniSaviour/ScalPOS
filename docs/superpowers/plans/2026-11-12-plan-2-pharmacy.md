# Plan 2 — Pharmacy (batches, expiry, packs, prescriptions)

Source spec: `docs/superpowers/specs/2026-11-11-business-agnostic-design.md` (§3 Batch/Product, §4 `/inventory` `/sell` `/customers` `/reports` rows, §6).

**Goal**: A pharmacy store can sell from batches (FEFO), see and manage expiry
risk, sell packs (unit conversions) alongside base units, record prescription
refs at dispensing, keep patient allergies, and run a purchase-order flow on
desktop. Retail/restaurant/salon stores see none of it.

**Deliverable you can test**: switch a shop to pharmacy → products gain
batch/controlled/rx fields; creating batches and selling shows FEFO allocation
in the order item; pay screen demands an rx ref when cart has
prescription-only items; reports gains an "Expiring soon" section; a pack
(1 box = 10 strips) deducts 10 base units; desktop product form and a new
Purchase Orders page work; a synced second device receives `product_batches`.

**Out of scope**: suppliers list itself already exists on desktop; no mobile PO
page (desktop-only per owner); no email/procurement integration (`"sent"` is
hand-set); no restaurant/salon features.

## Verified code facts (do not re-derive)

- `lib/types.ts` — `Product` (:7-23) has `stock`, `cost`, `price`, no batches;
  `StockMove` (:72-79) has no `batchId`; `CartLine` (:103-106) is
  `{ productId, qty }`; `Customer` (:63-70) has no allergies.
- `lib/store.ts` — `placeOrder` decrements `p.stock` in one loop (:327-339) and
  writes `adjust`/sale moves; `upsertProduct` (:424-474); `useCartTotals`
  (:628-660) reads prices off the product; `partialize` includes orders
  (~:502). Cart actions: `addToCart/setCartQty/clearCart`.
- `app/sell-screen.tsx` — selectors :35-44; `qtyInCart` keys by productId
  (:75-79); `tap()` calls `addToCart(pid,1)` (:85-89); cart row key = productId
  (:247); product grid :172-201; charge bar :204-222.
- `app/product-edit-screen.tsx` — closed `UNITS` union 6 literals (:21-28);
  save() :130-166. `app/product-detail-screen.tsx` — stock card :64-92, adjust
  sheet :96-140, moves list :148-165. `app/stock-screen.tsx` — `REASON_LABELS`
  :22-30 (add `expiry` here).
- `backend/supabase/migrations/0001_init.sql:156` — `stock_moves.reason` CHECK
  constraint enumerates reasons; adding `expiry` requires migrating that check.
- `app/reports-screen.tsx` — client-side sections; Top products ~:286-290 (expiry
  report slot after it).
- `app/customers-screen.tsx` + detail purchase history :161-208.
- Sync registration checklist (`lib/sync/engine.ts`): `TABLES` (:35),
  `emptyMap()` (:43-45), push branch (:214-233), pull mapper `prodLocal`
  (:391-409 — note the unit whitelist ~:400), `localStamp/remoteStamp`
  (:473-493), `fingerprint` (:738-746), first-push `asks`, watchers; plus
  `lib/sync/outbox.ts` `DEPS` (:8-19), `onRemoteChange`, `requeueMissing()`.
  RLS pattern `0002_rls.sql:121-129`; realtime `0003_*`.
- Desktop: types `apps/desktop/src/lib/types.ts:33-50`; `ProductRow` + `mapRow`
  (`api/data.ts:23-40`, `:188-218`); `createProduct`/`updateProduct`
  (`:379-404`, `:407-418`); suppliers CRUD `:832-878`; product form/table/detail
  pages; `NAV_ITEMS` in `constants.ts`.
- `lib/features.ts` features already exist from Plan 1 (pharmacy set includes
  `batches`, `feo`, `expiryAlerts`, `prescription`, `unitConversions`,
  `purchaseOrders`); `hasFeature()` currently unused by screens.
- **BANNED**: `useSyncExternalStore` / `useClientValue` with fresh-object
  readers (React #185). New derived reads: `useState`+`useEffect` or zustand.
- Gates every task: `./node_modules/.bin/tsc --noEmit` +
  `./node_modules/.bin/eslint app components lib`; whole-plan adds
  `./node_modules/.bin/next build --webpack`.

## Modeling decisions (fixed before tasks)

- **Batch invariant**: when a product has ≥1 batch, `product.stock` is derived
  = `sum(batch.qty)`. Batch create/edit/delete adjusts product.stock by the
  delta. A batched product never has `product.stock` edited directly; retail
  path (no batches) unchanged.
- **FEFO**: `placeOrder` on a batched pharmacy product allocates from the
  earliest-expiring batches with qty>0, writes
  `item.batchAllocations: { batchId, qty }[]`, decrements those batches (and
  product.stock via derived total), and stamps each move `batchId`. Non-batched
  products behave exactly as today.
- **Refund**: restocks by the order's recorded `batchAllocations` (not FEFO),
  batchId on the reverse moves. Expired batches may receive stock back — that
  is per owner semantics.
- **Product-level `adjustStock`** on a batched product applies the delta to the
  earliest-expiring batch (UI elsewhere routes to batch adjust).
- **CartLine generalization (once, here — foundation for Plan 4 credits)**:
  `CartLine { productId, qty, packIdx?, price? }`. Cart identity key =
  `productId` when no pack, else `` `${productId}#${packIdx}` ``. `useCartTotals`
  and `placeOrder` use `line.price ?? product.price`. Pack sale qty = base units
  (`qty * factor`); the line records pack qty and `packName` for the item.
- **Rx ref**: one field on the pay screen stamped onto every rx line as
  `OrderItem.prescriptionRef`; required (blocking) when the cart contains a
  `prescriptionOnly` product and `hasFeature("prescription")`.

## Task 1 — Data core (types, batches in store, CartLine, migration 0014)

Files: `lib/types.ts`, `lib/store.ts`, `lib/features.ts` (no change expected),
`backend/supabase/migrations/0014_pharmacy.sql`

1. Types: add `Batch { id, productId, batchNo, expiry, qty, cost }`,
   `BatchAllocation { batchId, qty }`, `Pack { name, factor }`; Product +=
   `prescriptionOnly?`, `controlled?`, `packs?`; StockMove += `batchId?`;
   OrderItem += `batchAllocations?`, `packName?`, `prescriptionRef?`; Customer
   += `allergies?`; CartLine per decision above; store gains `batches: Batch[]`.
2. Store actions: `upsertBatch(b)` (create/edit; adjusts product.stock by
   delta), `deleteBatch(id)` (same), and `placeOrder` FEFO path per decision
   (only when `hasFeature("batches")` and product has batches). `partialize`
   includes `batches`.
3. `addToCart(pid, qty?, factor?, packIdx?, price?)`; `useCartTotals`
   price/line changes per decision; cart totals unchanged for retail.
4. Add `"expiry"` to reason labels (`stock-screen.tsx:22-30`) and to the
   0001 CHECK constraint via 0014 (drop + re-create the check including all
   existing reasons + `expiry`).
5. Migration `0014_pharmacy.sql`: `product_batches` table (id uuid, shop_id,
   product_id FK, batch_no, expiry, qty numeric, cost numeric, timestamps) +
   RLS (pattern `0002_rls.sql:121-129`) + realtime (`0003` pattern); products
   += `prescription_only bool`, `controlled bool`, `packs jsonb`; customers
   += `allergies text`; order_items += `batch_allocations jsonb`,
   `pack_name text`, `prescription_ref text`; fix the stock_moves reason CHECK.
   All nullable / with defaults.

Verify: tsc, eslint. Manual: retail shop sells exactly as before (no batches).

## Task 2 — Batch UI (product detail + product edit)

Files: `app/product-detail-screen.tsx`, `app/product-edit-screen.tsx`,
`components/ui/*` (reuse Sheet/Input only)

1. Product detail: when `hasFeature("batches")`, batch list replaces the plain
   stock card rows (:64-92 zone) — batchNo, expiry (danger tone when within 90
   days or expired), qty, cost; "Add batch" sheet (batchNo, expiry date, qty,
   cost); edit + delete rows; adjust sheet (:96-140) routes to batch adjust
   when batched.
2. Product edit: gated fields — prescriptionOnly, controlled toggles; packs
   editor (name + factor rows) with base unit always implicit; expiry date
   field optional display; save() passes them through `upsertProduct`
   (:424-474 signature extension).
3. Stock screen: batched products show derived stock; nothing else changes.

Verify: tsc, eslint. Manual: create 2 batches (one near-expiry), see derived
stock and danger styling.

## Task 3 — Sell flow: pack picker + rx ref + FEFO stamps

Files: `app/sell-screen.tsx`, `app/pay-screen.tsx`, `lib/store.ts`,
`lib/receipt.ts` (or equivalent receipt builder — grep before editing)

1. Pack picker: tapping a product with `packs` opens a Sheet (base unit +
   each pack with editable price); selection calls the extended `addToCart`.
   Products without packs keep `tap()` (:85-89) behavior; cart row key +
   `qtyInCart` (:75-79, :247) switch to the composite key decision.
2. Pay screen: when cart has prescriptionOnly lines, show a required rx-ref
   Input before Charge; stamp `prescriptionRef` on those lines in `placeOrder`.
3. Receipt: for pharmacy, print pack name on the line and a batch/expiry
   footer line (allocations summarized); nothing else changes.
4. Orders detail: show `batchAllocations`/pack/rx data if present.

Verify: tsc, eslint. Manual: sell 1 box of a 2-batch product → correct base
deduction, earliest expiry first, allocations visible in order.

## Task 4 — Expiry report

Files: `app/reports-screen.tsx`

1. New section after Top products (~:286-290): batches with qty>0 grouped —
   expired, expiring ≤30d, ≤90d, with qty and cost-at-risk totals; only
   rendered when `hasFeature("expiryAlerts")`.
2. Reuse existing section scaffolding/Card styling; no new deps.

Verify: tsc, eslint. Manual: expired + near batches appear in correct buckets.

## Task 5 — Patients: allergies

Files: `app/customer-edit*` (grep exact file), `app/customers-screen.tsx`,
`app/customer-detail-screen.tsx`

1. Customer edit: `allergies` textarea when `hasFeature("prescription")`.
2. Detail: allergies shown prominently; purchase history (:161-208) shows rx
   refs when present.

Verify: tsc, eslint. Manual: set allergies on a patient, see them on detail.

## Task 6 — Desktop pharmacy parity (batches + product form)

Files: `apps/desktop/src/lib/types.ts`, `apps/desktop/src/lib/api/data.ts`,
product form/table/detail pages, `apps/desktop/src/lib/constants.ts`

1. Types + `ProductRow`/`mapRow`/:33-50 zone: `prescriptionOnly`, `controlled`,
   `packs`; batch read/write via `product_batches` (list/create/update/delete
   like the supplier CRUD pattern :832-878).
2. Product form: same gated fields as mobile; table shows expiry warning icon.
3. Product detail: batch table + adjust.

Verify: desktop tsc + eslint baseline rules; `next build --webpack` in
`apps/desktop` (run by coordinator, not per-worker).

## Task 7 — Desktop purchase orders

Files: `apps/desktop/src/app/dashboard/*` (new `purchase-orders` route + form),
`apps/desktop/src/lib/api/data.ts`, `constants.ts` NAV_ITEMS

1. `PurchaseOrder { id, supplierId, lines: [{ productId, packName?, qty,
   unitCost }], status: "draft"|"sent"|"received" }` in desktop types +
   data.ts CRUD; receiving creates purchase stock moves (and batches for
   batched items, qty in base units via pack factor).
2. Page: list with status chips, create form (supplier picker, product rows
   with pack option), Receive action with confirmation summary.
3. Nav item gated on `purchaseOrders` feature.

Verify: desktop gates; manual receive flow moves stock + creates batches.

## Task 8 — Sync registration (mobile)

Files: `lib/sync/engine.ts`, `lib/sync/outbox.ts`, `lib/sync/*` watchers

1. Register `product_batches` end-to-end per checklist (TABLES :35, emptyMap
   :43-45, push :214-233, pull mapper, stamps, fingerprint, first-push ask,
   watcher, outbox DEPS :8-19, onRemoteChange, requeueMissing).
2. Extend product/customer/order_item pull-push mappers for the new optional
   fields; missing fields = defaults (additive merge tolerance).
3. Batch product.stock derivation must survive merge (recompute locally after
   batch pull; never trust remote product.stock for batched items).

Verify: two-device smoke (coordinator chromium run): create batch → synced to
second device with product.stock consistent.

## Final verification (whole plan, coordinator)

1. All gates: mobile tsc + eslint + `next build --webpack`; desktop build.
2. `grep -rn "useSyncExternalStore\|useClientValue" app components lib` — audit
   every `getSnapshot`.
3. Migration `0014` applied to live Supabase via MCP; smoke via headless
   chromium CDP scripts in `$PREFIX/tmp/opencode/` (serve-export +
   inject `window.CapacitorCustomPlatform`): pharmacy sell FEFO, rx gate,
   expiry report, second-device sync.
4. Retail regression: retail smoke unchanged.
