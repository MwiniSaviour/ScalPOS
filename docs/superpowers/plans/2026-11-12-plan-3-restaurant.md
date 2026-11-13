# Plan 3 — Restaurant (order types, tables/tabs, kitchen, modifiers, recipes)

Source spec: `docs/superpowers/specs/2026-11-11-business-agnostic-design.md`
(§3 Recipe/Order/Table/foodVendor, §4 `/kitchen` `/orders` `/sell` rows, §6).

**Goal**: A restaurant store can sell with order types (dine-in / takeaway /
delivery), open tabs grouped by table, ticket pipeline on a `/kitchen` board,
modifiers ("no onions") and size variants on menu items, and recipes that
consume ingredient stock on every sale. A **foodVendor preset** gives the
takeaway-only version: no tables, just a ticket queue with order numbers.
Retail/pharmacy/salon stores see none of it.

**Deliverable you can test**: switch a shop to restaurant → `/sell` gains an
order-type strip and a modifier/variant sheet on tap; dine-in carts open a tab
bound to a table; `/kitchen` shows tickets moving queued → preparing → ready →
served with auto-refresh; selling a plated dish (with a recipe) decrements the
ingredient products' stock; reports gain an item + modifier-mix section;
receipts show the table label; `/orders` groups open tabs by table; foodVendor
preset hides tables and shows only the queue; a synced second device receives
`recipes` and `restaurant_tables`.

**Out of scope**: staff serving attribution with commission payout (salon
mechanics, Plan 4 — Order.staffId column lands here but no UI claims it);
daily-menu per-item toggles are the simple store-based toggle (no cron); no
printer integration; no multi-kitchen routing; no salon/pharmacy features.

## Verified code facts (do not re-derive)

- `lib/types.ts` — `Product` (:7-23) has no `modifiers`/`variants`;
  `Order`/`OrderItem` (~:55-101) have no `orderType`/`tableId`/`ticketStatus`/
  `modifierIds`/`variantId`; `CartLine` (:103-106) already generalized to
  `{ productId, qty, packIdx?, price? }` by Plan 2 T1 (cart identity key
  `${productId}#${packIdx}` when packed). Settings has
  `restaurantConfig?: { tables, orderTypes }` from Plan 1 (types.ts).
- `lib/store.ts` — `placeOrder` (:327-339 base loop; Plan 2 adds FEFO/
  allocation branches) is the single order-creation path; refund path
  `refundOrder` restocks 1:1. `upsertProduct` (:424-474) persists Product
  fields; `useCartTotals` (:628-660) price basis is `line.price ?? product.price`.
- `lib/sync/outbox.ts` `DEPS` (:8-19) — new tables must declare shop_id deps.
- `app/sell-screen.tsx` — `tap()` (:85-89) calls `addToCart(pid,1)`; grid
  :172-201; charge bar :204-222. Tap interception point for the modifier/
  variant sheet.
- `app/pay-screen.tsx` — payment flow creates the order via `placeOrder`;
  order-type/table binding must be decided before or at `placeOrder` call.
- `app/orders-screen.tsx` — flat list filtered by status pills; open-tab
  grouping slot. Order detail shows items; modifier/variant labels add there.
- `app/reports-screen.tsx` — client-side sections; Top products ~:286-290
  (item/modifier-mix section slot after it).
- `lib/receipt.ts` — grep before editing; layout extension point for table
  label + ticket number.
- `lib/staff.ts` — staff roster exists (moved into synced store in Plan 1
  T7); server columns already exist via `0013` (`staff_local_id` groundwork).
- `lib/features.ts` — the Feature union is kebab-case; the restaurant set is
  `tables`, `order-types`, `kitchen`, `modifiers`, `recipes`,
  `daily-availability`. **`modifiers` did not exist in the union** (the spec
  §3 has it, Plan 1's union did not) — Plan 3 T1 adds it, to the union and to
  the restaurant set, in `lib/features.ts` AND
  `apps/desktop/src/lib/features.ts`. `hasFeature(bt, f)` takes **two**
  arguments: `hasFeature(settings.businessType, "tables")`.
  foodVendor = `order-types` + `kitchen` + `modifiers` only (no `tables`).
- `app/stock-screen.tsx` `REASON_LABELS` (:22-30) — recipes consume with
  reason `sale` (existing), no new reason needed.
- Sync registration checklist (`lib/sync/engine.ts`): `TABLES` (:35),
  `emptyMap()` (:43-45), push branch (:214-233), pull mapper, `localStamp/
  remoteStamp` (:473-493), `fingerprint` (:738-746), first-push `asks`,
  watchers; plus `outbox.ts` `DEPS`, `onRemoteChange`, `requeueMissing()`.
  RLS pattern `0002_rls.sql:121-129`; realtime `0003_*`.
- Desktop: `apps/desktop/src/lib/types.ts:33-50`; `ProductRow` + `mapRow`
  (`api/data.ts:23-40`, `:188-218`); `createProduct`/`updateProduct`
  (`:379-404`, `:407-418`); orders page exists under `/dashboard/orders`;
  `NAV_ITEMS` in `constants.ts`; `next/dist/docs` read-first rule (desktop is
  not stock Next.js).
- **BANNED**: `useSyncExternalStore` / `useClientValue` with fresh-object
  readers (React #185). New derived reads: `useState`+`useEffect` or zustand.
- Gates every task: `./node_modules/.bin/tsc --noEmit` +
  `./node_modules/.bin/eslint app components lib`; whole-plan adds
  `./node_modules/.bin/next build --webpack`.

## Modeling decisions (fixed before tasks)

- **`restaurantConfig`** (Plan 3 T1): `Settings.restaurantConfig?: { tables:
  boolean; orderTypes: string[] }`. It did not exist before this plan — the
  business type alone never carried the restaurant setup.
- **Order types**: `orderType` is chosen once per cart on the sell screen
  (segmented strip, default = first configured type) and stamped on the Order
  at `placeOrder`. `restaurantConfig.orderTypes` lists the enabled ones.
- **Tables & open tabs**: when `hasFeature("tables")` and type is dine-in, the
  cashier picks a table; the order is created as `status:"pending"` with
  `tableId` (an open tab). Adding to an open tab = load that order's items
  into the cart, continue selling, `placeOrder` updates the same order
  (append items, keep pending). Settling the tab = pay flow completing the
  order to `completed`. Table list is authoritative (`restaurant_tables`
  rows); seeded 1–N on first entry, admin-editable.
- **Ticket pipeline**: `placeOrder` stamps `ticketStatus:"queued"`. `/kitchen`
  advances status with store action `setTicketStatus(oid, s)`; `served` is set
  from the board (no auto). Kitchen board lists non-refunded, non-completed
  orders that have queued/preparing/ready tickets; refresh = 5s poll (simple;
  realtime channel exists but poll is the low-risk default per spec §6).
- **Modifiers/variants**: `Product.modifiers[]` / `Product.variants[]` =
  `{ id, name, priceDelta }`. On tap (restaurant, `hasFeature("modifiers")`),
  if the product has any, open a selection sheet; chosen variant sets
  `CartLine.price = product.price + variant.priceDelta` and `variantId` goes
  on the OrderItem; modifiers are multi-select checkboxes, sum their deltas
  into the line price, and land as `modifierIds`. Without a sheet selection,
  tapping adds the plain product as today. Editor lives on the product edit
  screen (add/remove rows, name + delta inputs).
- **Recipes**: `Recipe { productId, lines: [{ ingredientProductId, qty,
  wastePct? }] }`, one recipe per menu item, edited on the product screen
  (`recipes` feature on). Consuming: in `placeOrder`, for each item whose
  product has a recipe, write one stock move per ingredient line
  (`reason:"sale"`, ref=orderId, qty = `line.qty * lineQty * (1 + wastePct/100)`
  in ingredient base units) and decrement ingredient `stock`. Selling a
  menu item does NOT decrement the menu item's own stock when it has a recipe.
- **Refund with skip-restock toggle**: `refundOrder(oid, opts?: { skipRestock? })`
  — when the order has recipe-consumed items and skipRestock is false,
  write reverse moves (`reason:"return"`, ref=refund) re-crediting ingredients;
  when true, refund prices only. Retail path unchanged; the toggle shows in
  the refund confirm only when the order contains recipe items.
- **FoodVendor preset**: `businessType:"restaurant"` with
  `restaurantConfig = { tables:false, orderTypes:["takeaway"] }`. Same feature
  flags minus `tables`; sell screen hides the table picker; kitchen board
  shows a running order-number column; daily menu toggle: per-item
  `unavailableUntil` date stamp on Product (set from product edit/kitchen).
  `unavailableUntil` is the **last day** the item is off the menu, so marking
  it off for today clears itself the next morning; the sell screen and the
  kitchen board hide an unavailable item (they compare it against today's
  start of day).
- **Order numbers**: existing `nextNo` order id numbering is the ticket
  number; no separate counter.
- **Open tab merge** (Plan 3 T1): the tab's items stay on the tab; the cart
  carries the difference. A cart line that matches a tab line (same product,
  variant and modifiers) changes that line by the delta — so lowering the
  quantity on screen lowers it on the tab. A line that is not on the tab yet
  is appended. `mergeTabItems()` in `lib/restaurant.ts` does this.
- **Recipe consumption** is recorded per order line in
  `OrderItem.recipeConsumption` so a refund credits exactly what the sale
  took — a recipe edited after the sale cannot distort the credit. A plated
  dish never comes off its own shelf; its ingredients do.
- **Refund with `skipRestock`** (Plan 3 T1): `refundOrder(oid, { skipRestock:
  true })` returns **no** stock at all — prices only. That is the honest
  behaviour for a restaurant: the dish was cooked and the drink was poured.
  The toggle only appears for orders that contain recipe items.
- **New module `lib/restaurant.ts`**: the pure restaurant maths — option
  matching, recipe draw and delta, tab merge, ingredient restock, daily
  availability. Unit tested in `tests/unit/restaurant.test.ts`.

## Task 1 — Data core (types, migration 0015, store actions)

Files: `lib/types.ts`, `lib/store.ts`,
`backend/supabase/migrations/0015_restaurant.sql`, `lib/sync/outbox.ts`

1. Types: Product += `modifiers?: { id, name, priceDelta }[]`, `variants?`
   same shape, `unavailableUntil?: string`; Order += `orderType?`,
   `tableId?`, `ticketStatus?`; OrderItem += `modifierIds?: string[]`,
   `variantId?: string`; Recipe + Table entity types; store gains
   `recipes: Recipe[]`, `tables: Table[]` (synced, like batches in Plan 2).
2. Store actions: `upsertTable(t)` / `deleteTable(id)` (admin edit; seed
   1–N lazily on first sell-screen table render if empty), `upsertRecipe(r)`
   (one per product), `setTicketStatus(oid, status)`, `refundOrder` skipRestock
   option, recipe consumption in `placeOrder` per decision,
   open-tab update path (appending to a pending tabbed order instead of
   creating a new one — keyed on the loaded tab).
3. `partialize` includes `recipes` and `tables`; the cart gains
   `cartOrderType`/`cartTableId`/`cartTabOrderId` (cleared on `clearCart`).
   **They ARE persisted with the cart** (deviation from the plan text): an
   in-progress sale must survive a reload, and a table binding lost to a
   reload would put a customer's order on the wrong table.
4. Migration `0015_restaurant.sql`: `restaurant_tables` (id uuid, shop_id,
   name, seats int, timestamps) + RLS (`0002_rls.sql:121-129` pattern) +
   realtime (`0003` pattern); `recipes` (id uuid, shop_id, product_id FK,
   lines jsonb, timestamps) + RLS + realtime; products += `modifiers jsonb`,
   `variants jsonb`, `unavailable_until date`; orders += `order_type text`,
   `table_id uuid`, `ticket_status text`; order_items += `modifier_ids jsonb`,
   `variant_id uuid`. All nullable / with defaults.
5. Sync registration for `recipes` + `restaurant_tables` in `engine.ts`
   (TABLES, emptyMap, push, pull mappers, stamps, fingerprint, asks, watchers)
   and `outbox.ts` `DEPS`.

Verify: tsc, eslint. Manual: retail shop unchanged (no recipes/tables rows).

## Task 2 — Sell flow: order types, tables, open tabs

Files: `app/sell-screen.tsx`, `app/pay-screen.tsx`, `lib/store.ts`

1. Sell screen: order-type segmented strip (only configured types;
   `hasFeature("orderTypes")`); dine-in table picker (grid of table chips,
   `hasFeature("tables")`); "open tab" entry — picking a table with an open
   tab offers Continue tab vs New sale (Continue loads the tab's lines into
   the cart and remembers the pending order id).
2. `placeOrder` gains the tab path: with a loaded pending tab, append items,
   recompute totals, keep `status:"pending"`; the pay screen settles it
   (payments → completed). Charge bar label switches to "Settle tab" on a
   tabbed cart.
3. Pay screen: stamps `orderType`/`tableId` on the created order; shows the
   table label on the receipt summary.

Verify: tsc, eslint. Manual: dine-in tab open → add items → leave → return →
settle; takeaway completes immediately; retail shows no strip.

## Task 3 — Modifiers & variants (sell sheet + product editor)

Files: `app/sell-screen.tsx`, `app/product-edit-screen.tsx`,
`components/ui/*` (Sheet reuse)

1. Tap on a menu item with modifiers/variants (restaurant, `modifiers` on):
   selection sheet — variant radio group, modifier checkboxes, live line
   price, Add button calls `addToCart` with the computed price; plain tap
   (no options) unchanged.
2. Product edit screen: modifiers/variants editor rows (name + priceDelta,
   add/remove) shown when `hasFeature("modifiers")`.
3. `qtyInCart` unchanged (cart key already per-line from Plan 2; modifiers
   make each selection a distinct line — verify keying and adjust to
   `${productId}#${variantId}` suffix when variant chosen).

Verify: tsc, eslint. Manual: add "Large +50" variant line; "no onions" shows
on the order item in orders detail.

## Task 4 — `/kitchen` ticket board

Files: `app/kitchen-screen.tsx` (new), `app/kitchen/page.tsx` (new, Suspense
wrapper pattern), `lib/store.ts` (setTicketStatus), more-menu/nav registration

1. Board: columns or stacked list per ticketStatus (queued / preparing /
   ready); each ticket card shows order number, type/table, items (+modifier
   labels), elapsed time; tap advances status (queued→preparing→ready; ready
   row offers "Served" which removes it from the board).
2. Refresh: 5s poll via `setInterval` in a `useEffect` (no
   `useSyncExternalStore`); foodVendor shows the same board minus table label.
3. Register route in the more-menu / dashboard nav behind `hasFeature("kitchen")`.

Verify: tsc, eslint, build. Manual: sell → ticket appears queued → advance →
served disappears; board survives reload (state from store).

## Task 5 — Recipes: editor + ingredient consumption + refund toggle

Files: `app/product-detail-screen.tsx` (recipe editor slot),
`lib/store.ts`, `app/orders-detail` refund flow (grep the confirm component)

1. Recipe editor on the product screen (`recipes` on): ingredient lines
   (product picker from catalog, qty, wastePct) — one recipe per item.
2. Consumption already wired in T1 `placeOrder`; verify with a sale that
   ingredient stock decrements and moves show reason `sale` ref orderId.
3. Refund: skipRestock checkbox in the refund confirm when order contains
   recipe items; reverse moves on uncheck; retail untouched.

Verify: tsc, eslint. Manual: 2× plated dish with 150g rice recipe → rice
stock −300g equivalent; refund with skip → stock unchanged; refund without →
re-credited.

## Task 6 — FoodVendor preset, reports mix, receipts

Files: `lib/terms.ts` (labels), `app/reports-screen.tsx`, `lib/receipt.ts`,
settings/onboarding preset wiring (grep `businessType` writers)

1. foodVendor preset: shop-creation card and settings type change write
   `restaurantConfig { tables:false, orderTypes:["takeaway"] }`; sell screen
   hides table picker; kitchen board hides table column.
2. Reports: item + modifier-mix section after Top products (~:286-290) —
   counts per item, per modifier selection, revenue per type.
3. Receipts: table label line (dine-in), ticket/order number line;
   modifier/variant names on item lines.

Verify: tsc, eslint, build. Manual: foodVendor shop → no tables anywhere,
queue works; report shows mix; receipt prints "Table 4".

## Task 7 — Desktop parity + final build

Files: `apps/desktop/src/lib/types.ts`, `api/data.ts` (mapRow/createProduct/
updateProduct, orders + new tables endpoints), `/dashboard/kitchen` page,
product form modifiers/variants editor, `NAV_ITEMS`, mobile
`./node_modules/.bin/next build --webpack`

1. Desktop types + mappers for the new Product/Order/OrderItem fields and
   `recipes`/`restaurant_tables` tables (read `next/dist/docs` before adding
   pages).
2. Product form: modifiers/variants editor; recipe editor optional-lite
   (desktop view + edit of lines).
3. `/dashboard/kitchen` board page mirroring mobile statuses; order-type and
   table columns on the orders page; receipt/preview shows table label.
4. Mobile full build (`next build --webpack`) + desktop build; chromium CDP
   smoke: restaurant shop → sell with modifier → kitchen board → settle tab.

Verify: tsc + eslint both apps; mobile + desktop builds pass.

## Final verification (whole plan)

- `./node_modules/.bin/tsc --noEmit` + `eslint app components lib` (mobile),
  desktop equivalents, `next build --webpack`, desktop build, `npm test`.
- Chromium smoke (serve-export + CDP, `CapacitorCustomPlatform` inject,
  localhost): restaurant round-trip sell→tab→kitchen→settle; retail regression
  sell unchanged.
- Sync: second device pull receives `recipes`/`restaurant_tables` rows
  (migration applied live via supabase MCP).
- Grep ban: no new `useSyncExternalStore`/`useClientValue` fresh readers.

---

## Status: COMPLETE (2026-11-13)

- T1–T6: done, merged into `wave1` (T6 = `4da67e9`). 58 unit tests pass.
- T7 desktop parity: commit `a41460e` on `wave1` — types/mappers/endpoints,
  product-form menu options + recipe editor, `/dashboard/kitchen` board,
  orders Type column, receipt ticket/type/table, NAV_ITEMS Kitchen.
  Desktop tsc + eslint + build clean.
- `0015_restaurant.sql` applied to live DB (version `20261113142551`); advisors clean.
- Chromium CDP smoke (static export + `CapacitorCustomPlatform` head-injection
  via serve-export.cjs): **all 17 checks pass** — sell sheet variant/modifier/
  order-type, kitchen board ticket/type/table/advance (queued→preparing),
  reports menu mix rows, pay→Complete sale → order placed with
  `recipeConsumption [{p-eggs,2}]`, eggs stock 200→198, sale move qty −2.
  Note: CDP `addScriptToEvaluateOnNewDocument` does NOT fire in this
  chromium build; injection had to happen server-side in the static server.
- Known follow-up (out of scope): `lib/sync/settings.ts` does not sync
  `restaurantConfig`; add when settings sync is next touched.
- Deferred: PIN recovery flow needs a physical device.
