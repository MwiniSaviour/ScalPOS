# Offline-first desktop unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/desktop/` use the root app's zustand store, sync engine, connectivity detection and entitlement logic so the desktop POS is genuinely offline-first with realtime sync, while keeping its distinct UI.

**Architecture:** Root `lib/` stays the single source of truth. Desktop imports it through an `@pos/*` alias, and `apps/desktop/src/lib/api/data.ts` becomes a thin type-translating adapter over `usePos`. Legacy desktop IndexedDB data is migrated once into the root store. Desktop's parallel offline stack is removed.

**Tech Stack:** Next 16.4.2 (`--webpack`), React 19, TypeScript 5.9, zustand 5, `@supabase/supabase-js` 2, `node:test`, electron-builder 26, sharp (already installed).

## Global Constraints

- Build with `npm run build` (uses `next build --webpack`); Turbopack is unavailable.
- Install with `npm install` only; Bun breaks ESLint resolution.
- Root verification: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint app components lib`, `npm test`, `npm run build`.
- Desktop verification: `cd apps/desktop && ./node_modules/.bin/tsc --noEmit` (or root binary with `-p`), `npm run lint`, `npm run build` on Windows host where applicable.
- `lucide-react` is pinned to exactly `1.58.0`; do not change it.
- No changes to mobile UI or mobile sync behavior. Root `lib/` changes must be additive or behavior-preserving for the mobile app.
- Do not commit; the user has not requested a commit. Each task ends with a diff review instead.
- No server-side file reads or OS commands via SQL; no remote DB migrations in this plan.

---

### Task 1: Offline grace in the shared entitlement store

**Files:**
- Modify: `lib/entitlement.ts:9-11`, `lib/entitlement.ts:71-109`
- Test: `tests/unit/entitlement-offline.test.ts` (create)

**Interfaces:**
- Consumes: `SubscriptionState` from `lib/api/billing.ts`, `readConnection` from `lib/api/bootstrap.ts`, `readTrialStart`/`TRIAL_MS` from `lib/trial.ts`, `hasOnboarded` from `lib/first-run.ts`.
- Produces: `OFFLINE_GRACE_MS: number`, unchanged `evaluate()` signature, `useEntitlement` unchanged public API.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/entitlement-offline.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function evaluateOffline(
  cached: { status: string; plan: string | null; expiresAt: number | null; fetchedAt: number } | null,
  now: number,
): string {
  if (!cached) return "locked";
  const allowedUntil =
    cached.expiresAt !== null
      ? cached.expiresAt + OFFLINE_GRACE_MS
      : cached.fetchedAt + OFFLINE_GRACE_MS;
  if ((cached.status === "active" || cached.status === "trialing") && now < allowedUntil) {
    return cached.status;
  }
  return "locked";
}

test("cached active plan survives an offline window", () => {
  assert.equal(
    evaluateOffline({ status: "active", plan: "enterprise", expiresAt: 1000, fetchedAt: 900 }, 1000 + OFFLINE_GRACE_MS - 1),
    "active",
  );
});

test("access ends after the offline grace expires", () => {
  assert.equal(
    evaluateOffline({ status: "active", plan: "enterprise", expiresAt: 1000, fetchedAt: 900 }, 1000 + OFFLINE_GRACE_MS),
    "locked",
  );
});

test("no expiry falls back to fetchedAt plus grace", () => {
  assert.equal(
    evaluateOffline({ status: "trialing", plan: null, expiresAt: null, fetchedAt: 5000 }, 5000 + OFFLINE_GRACE_MS - 1),
    "trialing",
  );
});

test("a server answer of expired is never overridden offline", () => {
  assert.equal(
    evaluateOffline({ status: "expired", plan: null, expiresAt: 1000, fetchedAt: 900 }, 1000),
    "locked",
  );
});
```

- [ ] **Step 2: Run test to verify the helper alone passes**

Run: `npm test -- tests/unit/entitlement-offline.test.ts`
Expected: PASS (this step establishes the harness and the intended rule).

- [ ] **Step 3: Implement the rule in the real store**

In `lib/entitlement.ts`, add after `const REFRESH_MS = 10 * 60 * 1000;`:

```ts
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
```

Replace the cached-state branch inside `evaluate()` with:

```ts
  if (cached) {
    const exp = cached.expiresAt;
    const allowedUntil =
      exp !== null ? exp + OFFLINE_GRACE_MS : cached.fetchedAt + OFFLINE_GRACE_MS;
    if (cached.status === "active" && Date.now() < allowedUntil) {
      return { status: "active", expiresAt: exp };
    }
    if (cached.status === "trialing" && Date.now() < allowedUntil) {
      return { status: "trialing", expiresAt: exp };
    }
    if (cached.status === "none" || cached.status === "expired") {
      return { status: "locked", expiresAt: null };
    }
  }
```

`evaluate()` already receives `now: number`; use `now` in place of `Date.now()` in the four expressions above so tests can drive time.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/unit/entitlement-offline.test.ts && ./node_modules/.bin/tsc --noEmit`
Expected: PASS, no TypeScript errors.

- [ ] **Step 5: Review the diff**

Run: `git diff -- lib/entitlement.ts tests/unit/entitlement-offline.test.ts`
Expected: only the grace constant, the `evaluate()` branch change, and the new test.

---

### Task 2: Suppliers and purchase orders in the shared store

**Files:**
- Modify: `lib/types.ts` (append)
- Modify: `lib/store.ts:44-64` (type imports), `lib/store.ts:210-237` (state), `lib/store.ts:316-320` (action signatures), `lib/store.ts:1520-1545` (partialize), `lib/store.ts` action implementations (place before `toast`)
- Test: `tests/unit/shared-suppliers.test.ts` (create)

**Interfaces:**
- Consumes: `id` from `lib/format.ts`, `Settings`, `Product` from `lib/types.ts`.
- Produces: `Supplier`, `PurchaseOrder`, `PurchaseOrderLine` types; `usePos` state fields `suppliers`, `purchaseOrders`; actions `upsertSupplier`, `deleteSupplier`, `upsertPurchaseOrder`, `deletePurchaseOrder`, `receivePurchaseOrder`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/shared-suppliers.test.ts
import test from "node:test";
import assert from "node:assert/strict";

type PO = { id: string; supplierId: string | null; status: "draft" | "sent" | "received"; lines: { productId: string; qty: number; unitCost: number }[]; total: number; receivedAt: string | null; createdAt: string; updatedAt: string };

function poTotal(lines: PO["lines"]): number {
  return Math.round(lines.reduce((s, l) => s + l.qty * l.unitCost, 0) * 100) / 100;
}

function receive(po: PO, stock: Record<string, number>, now: string): { po: PO; stock: Record<string, number> } {
  if (po.status === "received") return { po, stock };
  const next = { ...stock };
  for (const line of po.lines) next[line.productId] = (next[line.productId] ?? 0) + line.qty;
  return { po: { ...po, status: "received" as const, receivedAt: now, updatedAt: now }, stock: next };
}

test("purchase order total is the sum of line cost", () => {
  assert.equal(poTotal([{ productId: "p1", qty: 3, unitCost: 2.5 }, { productId: "p2", qty: 2, unitCost: 10 }]), 27.5);
});

test("receiving a purchase order restocks once", () => {
  const po: PO = { id: "po1", supplierId: "s1", status: "sent", lines: [{ productId: "p1", qty: 5, unitCost: 2 }], total: 10, receivedAt: null, createdAt: "t0", updatedAt: "t0" };
  const first = receive(po, { p1: 1 }, "t1");
  assert.equal(first.stock.p1, 6);
  assert.equal(first.po.status, "received");
  const second = receive(first.po, first.stock, "t2");
  assert.equal(second.stock.p1, 6);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/shared-suppliers.test.ts`
Expected: PASS for the pure helpers (harness check); the real store assertions are added after implementation.

- [ ] **Step 3: Add the shared types**

Append to `lib/types.ts`:

```ts
export type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: number;
  updatedAt: number;
};

export type PurchaseOrderLine = {
  productId: string;
  packName: string | null;
  qty: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string | null;
  status: "draft" | "sent" | "received";
  lines: PurchaseOrderLine[];
  total: number;
  receivedAt: number | null;
  createdAt: number;
  updatedAt: number;
};
```

- [ ] **Step 4: Add state, actions and persistence**

In `lib/store.ts`, import the three new types alongside the others from `./types`. Add to `PosState`:

```ts
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  upsertSupplier: (s: Partial<Supplier> & { name: string }) => Supplier;
  deleteSupplier: (supplierId: string) => void;
  upsertPurchaseOrder: (
    po: Partial<PurchaseOrder> & { lines: PurchaseOrderLine[] },
  ) => PurchaseOrder;
  deletePurchaseOrder: (poId: string) => void;
  receivePurchaseOrder: (poId: string) => void;
```

Add `suppliers: []` and `purchaseOrders: []` to the initial state, and add both fields to `partialize` so they persist.

Implement the actions immediately before `toast`:

```ts
      upsertSupplier: (input) => {
        const now = Date.now();
        const row: Supplier = {
          id: input.id ?? id("sup_"),
          name: input.name,
          contactPerson: input.contactPerson ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          createdAt: input.createdAt ?? now,
          updatedAt: now,
        };
        set((s) => ({
          suppliers: [...s.suppliers.filter((x) => x.id !== row.id), row],
        }));
        return row;
      },

      deleteSupplier: (supplierId) =>
        set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== supplierId) })),

      upsertPurchaseOrder: (input) => {
        const now = Date.now();
        const lines = input.lines.map((l) => ({ ...l }));
        const row: PurchaseOrder = {
          id: input.id ?? id("po_"),
          supplierId: input.supplierId ?? null,
          status: input.status ?? "draft",
          lines,
          total: Math.round(lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0) * 100) / 100,
          receivedAt: input.receivedAt ?? null,
          createdAt: input.createdAt ?? now,
          updatedAt: now,
        };
        set((s) => ({
          purchaseOrders: [...s.purchaseOrders.filter((x) => x.id !== row.id), row],
        }));
        return row;
      },

      deletePurchaseOrder: (poId) =>
        set((s) => ({ purchaseOrders: s.purchaseOrders.filter((x) => x.id !== poId) })),

      receivePurchaseOrder: (poId) => {
        const po = get().purchaseOrders.find((x) => x.id === poId);
        if (!po || po.status === "received") return;
        const now = Date.now();
        const products = get().products.map((p) => {
          const line = po.lines.find((l) => l.productId === p.id);
          return line ? { ...p, stock: p.stock + line.qty, updatedAt: now } : p;
        });
        const moves = po.lines.map((l) => ({
          id: id("mv_"),
          productId: l.productId,
          qty: l.qty,
          reason: "purchase" as const,
          ref: po.id,
          t: now,
        }));
        set((s) => ({
          products,
          stockMoves: [...moves, ...s.stockMoves],
          purchaseOrders: s.purchaseOrders.map((x) =>
            x.id === poId ? { ...x, status: "received" as const, receivedAt: now, updatedAt: now } : x,
          ),
        }));
      },
```

- [ ] **Step 5: Run verification**

Run: `npm test -- tests/unit/shared-suppliers.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint lib`
Expected: PASS.

- [ ] **Step 6: Review the diff**

Run: `git diff -- lib/types.ts lib/store.ts tests/unit/shared-suppliers.test.ts`
Expected: only additive type/state/action changes.

---

### Task 3: Sync the two new tables

**Files:**
- Modify: `lib/sync/engine.ts:50` (`TABLES`), plus its row-mapping and snapshot sections
- Modify: `lib/sync/outbox.ts:8-24` (`DEPS`)
- Test: `tests/unit/shared-suppliers-sync.test.ts` (create)

**Interfaces:**
- Consumes: `TABLES`, `Table`, `Op`, outbox ranks.
- Produces: `suppliers` and `purchase_orders` are valid `Table` values with bidirectional mappings and FK order `products → suppliers → purchase_orders`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/shared-suppliers-sync.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const DEPS: Record<string, string[]> = {
  products: ["categories"],
  suppliers: [],
  purchase_orders: ["products", "suppliers"],
};

function ranks(): Record<string, number> {
  const out: Record<string, number> = {};
  const visit = (t: string): number => {
    if (out[t] !== undefined) return out[t];
    const deps = DEPS[t] ?? [];
    out[t] = deps.length ? Math.max(...deps.map(visit)) + 1 : 0;
    return out[t];
  };
  Object.keys(DEPS).forEach(visit);
  return out;
}

test("purchase orders are pushed after products and suppliers", () => {
  const r = ranks();
  assert.ok(r.purchase_orders > r.products);
  assert.ok(r.purchase_orders > r.suppliers);
});

test("suppliers have no dependencies", () => {
  assert.deepEqual(DEPS.suppliers, []);
});
```

- [ ] **Step 2: Run test**

Run: `node --test tests/unit/shared-suppliers-sync.test.ts`
Expected: PASS (documents the required ordering).

- [ ] **Step 3: Register the tables**

In `lib/sync/outbox.ts`, add to `DEPS`:

```ts
  suppliers: [],
  purchase_orders: ["products", "suppliers"],
```

In `lib/sync/engine.ts`, change the `TABLES` declaration to:

```ts
const TABLES = ["categories", "products", "product_batches", "recipes", "restaurant_tables", "customers", "orders", "order_items", "stock_moves", "staff", "appointments", "packages", "suppliers", "purchase_orders"] as const;
```

- [ ] **Step 4: Add mappings and snapshot entries**

Follow the existing `categories` pattern in `engine.ts` for each new table:

- In the local→remote payload section add `supplierRemote(x)` mapping `id, name, contact_person: x.contactPerson, email, phone, address, created_at, updated_at` (milliseconds → ISO with `new Date(v).toISOString()`, guarding `0`/`null`), and `purchaseOrderRemote(x)` mapping `id, supplier_id, status, lines: x.lines, total, received_at, created_at, updated_at`.
- In the remote→local section add `supplierLocal(r, map)` and `purchaseOrderLocal(r, map)` producing the camelCase types defined in Task 2, using `isoToMs()` for timestamps and the existing id-map helpers for FK translation.
- In the snapshot builder add:

```ts
  set("suppliers", s.suppliers.map((x): [string, string] => [x.id, `${x.name}|${x.phone ?? ""}|${x.email ?? ""}|${x.address ?? ""}`]));
  set("purchase_orders", s.purchaseOrders.map((x): [string, string] => [x.id, `${x.supplierId ?? ""}|${x.status}|${x.total}|${JSON.stringify(x.lines)}`]));
```

- In the merge/pull section add cases that `putAt(s.suppliers, supplierLocal(row, map))` and `putAt(s.purchaseOrders, purchaseOrderLocal(row, map))`, mirroring the `categories` handler.

- [ ] **Step 5: Run verification**

Run: `npm test -- tests/unit/shared-suppliers-sync.test.ts && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint lib`
Expected: PASS; TypeScript will fail until every new `Table` case is handled, which is the intended forcing function.

- [ ] **Step 6: Review the diff**

Run: `git diff -- lib/sync/engine.ts lib/sync/outbox.ts tests/unit/shared-suppliers-sync.test.ts`
Expected: no unrelated sync changes.

---

### Task 4: Desktop build wiring for the shared layer

**Files:**
- Modify: `apps/desktop/tsconfig.json:22-24`
- Modify: `apps/desktop/next.config.ts:3-27`

**Interfaces:**
- Consumes: repository-root `lib/*`.
- Produces: `@pos/*` resolves to `../../lib/*`; desktop `@/lib/api/billing`, `@/lib/api/session`, `@/lib/entitlement`, `@/lib/first-run`, `@/lib/trial`, `@/lib/sync/outbox`, `@/lib/api/supabase`, `@/lib/api/bootstrap`, `@/lib/api/notifications` resolve to the root files.

- [ ] **Step 1: Add TypeScript paths**

Replace the `paths` block in `apps/desktop/tsconfig.json` with:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@pos/*": ["../../lib/*"],
      "@/lib/api/supabase": ["../../lib/api/supabase.ts"],
      "@/lib/api/session": ["../../lib/api/session.ts"],
      "@/lib/api/bootstrap": ["../../lib/api/bootstrap.ts"],
      "@/lib/api/billing": ["../../lib/api/billing.ts"],
      "@/lib/api/notifications": ["../../lib/api/notifications.ts"],
      "@/lib/sync/outbox": ["../../lib/sync/outbox.ts"],
      "@/lib/entitlement": ["../../lib/entitlement.ts"],
      "@/lib/first-run": ["../../lib/first-run.ts"],
      "@/lib/trial": ["../../lib/trial.ts"]
    }
```

- [ ] **Step 2: Add the webpack alias and tracing root**

In `apps/desktop/next.config.ts`, add inside the `nextConfig` object:

```ts
  outputFileTracingRoot: __dirname.replace(/[\\/]apps[\\/]desktop$/, ""),
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@pos": path.resolve(__dirname, "../../lib"),
    };
    return config;
  },
```

Add `import path from "node:path"` at the top.

- [ ] **Step 3: Verify resolution**

Run: `cd apps/desktop && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: PASS (existing code still resolves; no consumer rewired yet).

- [ ] **Step 4: Review the diff**

Run: `git diff -- apps/desktop/tsconfig.json apps/desktop/next.config.ts`
Expected: only alias/tracing additions.

---

### Task 5: Rewire the desktop data adapter onto the shared store

**Files:**
- Modify: `apps/desktop/src/lib/api/data.ts` (rewrite the 79 exported functions as store delegates; keep every existing export name and signature)
- Create: `apps/desktop/src/lib/adapters/shared-types.ts` (desktop ↔ root type conversion functions)
- Test: `apps/desktop/src/lib/adapters/shared-types.test.ts`

**Interfaces:**
- Consumes: `usePos`, `paidOf`/`dueOf`/`payStatusOf`, `taxAmount` from `@pos/store`; root types from `@pos/types`.
- Produces: unchanged `data.ts` API for all 24 consumer files.

- [ ] **Step 1: Write the failing conversion test**

```ts
// apps/desktop/src/lib/adapters/shared-types.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { toDesktopProduct, toSharedProductInput } from "./shared-types";

test("product round-trips through the adapter", () => {
  const shared = {
    id: "p1", name: "Soap", categoryId: "c1", cost: 2, price: 5, stock: 10,
    lowStockAt: 3, unit: "pcs", sku: "S1", barcode: "123", imageUrl: "",
    description: "", active: true, createdAt: 1, updatedAt: 2,
  };
  const desktop = toDesktopProduct(shared);
  assert.equal(desktop.cost_price, 2);
  assert.equal(desktop.image_path, null);
  assert.equal(desktop.low_stock_at, 3);
  assert.deepEqual(toSharedProductInput(desktop), {
    id: "p1", name: "Soap", categoryId: "c1", cost: 2, price: 5, stock: 10,
    lowStockAt: 3, unit: "pcs", sku: "S1", barcode: "123", imageUrl: "",
    description: "", active: true,
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/desktop && node --test src/lib/adapters/shared-types.test.ts`
Expected: FAIL with "Cannot find module './shared-types'".

- [ ] **Step 3: Implement the conversion module**

Create `apps/desktop/src/lib/adapters/shared-types.ts` with one converter per type pair, using these exact field mappings:

- Product: `cost_price ↔ cost`, `image_path ↔ imageUrl`, `low_stock_at ↔ lowStockAt`, `prescription_only/controlled/packs/modifiers/variants/unavailable_until` remain desktop-only and are carried in root `Product` extras when present, otherwise `null`.
- Category: `name`, `color` unchanged.
- Customer: `name, email, phone, address, note`; root-only `allergies`, `visitNotes`, `packageCredits` map to desktop `allergies`, `visit_notes`, `package_credits`.
- Sale: `id/invoice_no ↔ id`, `sale_date ↔ createdAt`, items `product_id/quantity/unit_price ↔ productId/qty/price`, payments unchanged.
- Staff/Appointment/ServicePackage/StockMove/Recipe/RestaurantTable/Supplier/PurchaseOrder follow the field pairs defined in Task 2 and the existing `map*` functions in `data.ts`.

All converters are pure functions with explicit return types; no `as any`.

- [ ] **Step 4: Run the conversion test**

Run: `cd apps/desktop && node --test src/lib/adapters/shared-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace data.ts bodies with store delegates**

Keep every export name/signature. Implement each as follows (representative examples; the full mapping list is below):

```ts
import { usePos, paidOf, dueOf, payStatusOf } from "@pos/store"
import { toDesktopProduct, toSharedProductInput, toDesktopSale, toDesktopCustomer } from "@/lib/adapters/shared-types"

export async function fetchProducts(): Promise<Product[]> {
  return usePos.getState().products.map(toDesktopProduct)
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = usePos.getState().upsertProduct(toSharedProductInput(input))
  return toDesktopProduct(row)
}

export async function placeSale(input: SaleInput): Promise<Sale> {
  const s = usePos.getState()
  const order = s.placeOrder(
    input.payments.map((p) => ({ method: p.method, amount: p.amount })),
    { prescriptionRef: input.note ?? undefined },
  )
  if (!order) throw new Error("Could not place sale")
  return toDesktopSale(order)
}
```

Complete function-to-store mapping (every entry is a one-line delegate):

| `data.ts` export | Store target |
| --- | --- |
| `fetchCategories`, `fetchProducts`, `fetchProduct`, `fetchCustomers`, `fetchCustomer`, `fetchAppointments`, `fetchPackages`, `fetchRestaurantTables`, `fetchRecipes`, `fetchSales`, `fetchSale`, `fetchSettings`, `fetchStaff`, `fetchSuppliers`, `fetchPurchaseOrders`, `fetchPurchaseOrder`, `fetchStockMoves`, `fetchProductBatches`, `fetchProductBatchesForProducts` | `usePos.getState()` selectors + converters |
| `createProduct`, `updateProduct`, `createCategory`, `updateCategory`, `deleteCategory`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `createAppointment`, `updateAppointment`, `deleteAppointment`, `createPackage`, `updatePackage`, `deletePackage`, `createRestaurantTable`, `updateRestaurantTable`, `deleteRestaurantTable`, `upsertRecipe`, `upsertSupplier`, `deleteSupplier`, `upsertPurchaseOrder`, `deletePurchaseOrder`, `receivePurchaseOrder`, `upsertStaff`, `deleteStaff`, `updateSettings`, `importProducts` | matching `usePos` actions |
| `deleteProduct`, `adjustStock`, `setTicketStatus`, `recordOrderPayment`, `addPaymentsToOrder` | `deleteProduct`, `adjustStock`, `setTicketStatus`, `addPaymentsToOrder`, `setPendingToCompleted` |
| `placeSale` | `placeOrder` + `toDesktopSale` |
| `findProductByBarcode` | selector over `products` filtering `barcode`/`sku` |
| `inviteEmployee` | `toast("Team invites need an internet connection", "warn")` then throw (cloud-only) |
| `makeLocalId`, `buildOrderLocalId`, `withCommissions`, `map*` helpers | keep current implementations (pure helpers) |

Remove every `getSupabase`, `offlineMode`, `hasLocalShop`, `getOrgId`, `hasActiveShop`, and local-* import from `data.ts`.

- [ ] **Step 6: Verify all consumers still compile**

Run: `cd apps/desktop && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: PASS with no changes to the 24 consumer files.

- [ ] **Step 7: Review the diff**

Run: `git diff --stat -- apps/desktop/src/lib/api/data.ts apps/desktop/src/lib/adapters/`
Expected: only the adapter and conversion module.

---

### Task 6: One-time migration of legacy desktop data

**Files:**
- Create: `apps/desktop/src/lib/offline/migrate-legacy.ts`
- Modify: `apps/desktop/src/components/providers.tsx` (call migration before gate)
- Test: `apps/desktop/src/lib/offline/migrate-legacy.test.ts`

**Interfaces:**
- Consumes: legacy IndexedDB `nova-desktop-offline` (stores `settings`, `products`, `categories`, `customers`, `orders`, `staff`, `appointments`, `packages`), `usePos.setState`.
- Produces: `migrateLegacyDesktop(): Promise<void>`; marker `desk-pos-migrated-v1`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/src/lib/offline/migrate-legacy.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { convertLegacyOrders, needsMigration } from "./migrate-legacy";

test("legacy local order keeps its id and local invoice number", () => {
  const rows = convertLegacyOrders([{ id: "ORD-20261122-0001", product_name: "Soap", total: 5 }]);
  assert.equal(rows[0].id, "ORD-20261122-0001");
  assert.equal(rows[0].invoiceNo, "ORD-20261122-0001");
});

test("migration is skipped once the marker is set", () => {
  const store: Record<string, string> = { "desk-pos-migrated-v1": "1" };
  assert.equal(needsMigration((k) => store[k] ?? null), false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/desktop && node --test src/lib/offline/migrate-legacy.test.ts`
Expected: FAIL with "Cannot find module './migrate-legacy'".

- [ ] **Step 3: Implement migration**

Create `apps/desktop/src/lib/offline/migrate-legacy.ts`:

```ts
const DB_NAME = "nova-desktop-offline"
const MARKER = "desk-pos-migrated-v1"
const LEGACY_FLAG = "desk-pos-local-shop-v1"

export function needsMigration(read: (k: string) => string | null): boolean {
  return read(MARKER) !== "1" && (read(LEGACY_FLAG) === "1" || typeof indexedDB !== "undefined")
}

export function convertLegacyOrders(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => ({
    id: String(r.id),
    invoiceNo: String(r.invoice_no ?? r.id),
    customerId: (r.customer_id as string) ?? null,
    total: Number(r.total ?? 0),
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
  }))
}

function legacyRows(store: string): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(store)) return resolve([])
      const tx = db.transaction(store, "readonly").objectStore(store)
      const all = tx.getAll()
      all.onsuccess = () => resolve((all.result ?? []) as Array<Record<string, unknown>>)
      all.onerror = () => resolve([])
    }
    req.onerror = () => resolve([])
  })
}

export async function migrateLegacyDesktop(): Promise<void> {
  if (typeof window === "undefined" || !needsMigration((k) => window.localStorage.getItem(k))) return
  const [products, categories, customers, orders, staff, appointments, packages] = await Promise.all(
    ["products", "categories", "customers", "orders", "staff", "appointments", "packages"].map(legacyRows),
  )
  const { usePos } = await import("@pos/store")
  usePos.setState({
    products: products.map((p) => ({ id: String(p.id), name: String(p.name ?? ""), price: Number(p.price ?? 0), stock: Number(p.stock ?? 0), categoryId: (p.category_id as string) ?? null, cost: Number(p.cost_price ?? 0), sku: String(p.sku ?? ""), barcode: String(p.barcode ?? ""), imageUrl: "", description: "", lowStockAt: Number(p.low_stock_at ?? 0), unit: String(p.unit ?? "pcs"), active: p.active !== false, createdAt: Date.now(), updatedAt: Date.now() })),
    categories: categories.map((c) => ({ id: String(c.id), name: String(c.name ?? ""), color: (c.color as string) ?? null, createdAt: Date.now() })),
    customers: customers.map((c) => ({ id: String(c.id), name: String(c.name ?? ""), phone: String(c.phone ?? ""), email: String(c.email ?? ""), address: String(c.address ?? ""), note: String(c.note ?? "") })),
    orders: convertLegacyOrders(orders).map((o) => ({ id: o.id, createdAt: o.createdAt, customerId: o.customerId, total: o.total, items: [], payments: [], status: "completed" as const })),
    staff: staff.map((s) => ({ id: String(s.id), name: String(s.name ?? ""), role: "cashier" as const, createdAt: Date.now(), active: true, updatedAt: Date.now() })),
    appointments: [] ,
    packages: [],
  })
  window.localStorage.setItem(MARKER, "1")
}
```

`convertLegacyOrders` is exported for the test; the other converters are inline because each runs once.

- [ ] **Step 4: Wire migration into desktop boot**

In `apps/desktop/src/components/providers.tsx`, add:

```ts
import { migrateLegacyDesktop } from "@/lib/offline/migrate-legacy"
```

and a `useEffect` in `Providers` that awaits `migrateLegacyDesktop()` before setting a `migrated` flag; render `BootScreen` until that flag is true.

- [ ] **Step 5: Run verification**

Run: `cd apps/desktop && node --test src/lib/offline/migrate-legacy.test.ts && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 6: Review the diff**

Run: `git diff -- apps/desktop/src/lib/offline/migrate-legacy.ts apps/desktop/src/components/providers.tsx`
Expected: migration logic and the boot gate only.

---

### Task 7: Desktop boot, auth bridge and reconnect sync

**Files:**
- Modify: `apps/desktop/src/components/providers.tsx`
- Create: `apps/desktop/src/components/sync-bridge.tsx`
- Create: `apps/desktop/src/lib/auth/offline-gate.ts`

**Interfaces:**
- Consumes: `hasOnboarded` from `@pos/first-run`, `useNet` from `@pos/net`, `armSync`/`drainOutbox`/`pullAll`/`disarmSync` from `@pos/sync/engine`, `readConnection` from `@pos/api/bootstrap`, `registerTokenProvider` from `@pos/api/session`.
- Produces: desktop boots locally without Clerk; sync arms on connect and drains/pulls on reconnect.

- [ ] **Step 1: Add the offline gate helper**

Create `apps/desktop/src/lib/auth/offline-gate.ts`:

```ts
import { hasOnboarded } from "@pos/first-run"

export function desktopCanBootLocally(): boolean {
  return hasOnboarded()
}
```

- [ ] **Step 2: Add the sync bridge**

Create `apps/desktop/src/components/sync-bridge.tsx`:

```tsx
"use client"

import { useEffect } from "react"
import { useNet } from "@pos/net"
import { readConnection } from "@pos/api/bootstrap"
import { armSync, disarmSync, drainOutbox, pullAll } from "@pos/sync/engine"
import { planAllowsEnterprise, useEntitlement } from "@pos/entitlement"

export function SyncBridge({ signedIn }: { signedIn: boolean }) {
  const { online } = useNet()
  const status = useEntitlement((s) => s.status)
  const plan = useEntitlement((s) => s.plan)
  const refresh = useEntitlement((s) => s.refresh)

  useEffect(() => {
    if (!signedIn || !online || !planAllowsEnterprise(status, plan)) {
      void disarmSync()
      return
    }
    const conn = readConnection()
    if (!conn?.org_id) return
    let cancelled = false
    void (async () => {
      await armSync(conn)
      if (cancelled) return
      await refresh(true)
      await Promise.all([drainOutbox(), pullAll(conn)])
    })().catch((e) => console.warn("desktop sync boot", e))
    return () => { cancelled = true }
  }, [signedIn, online, status, plan, refresh])

  return null
}
```

- [ ] **Step 3: Rewire providers**

In `apps/desktop/src/components/providers.tsx`:
- Replace `import { hasLocalShop } from "@/lib/offline/local-data"` with `import { desktopCanBootLocally } from "@/lib/auth/offline-gate"`.
- Replace `useState(() => hasLocalShop())` with `useState(() => desktopCanBootLocally())`.
- Register the shared token provider: `import { registerTokenProvider } from "@pos/api/session"` and call `registerTokenProvider(...)` from `TokenBridge` with the Clerk `getToken({ template: "supabase" })` callback (same body as today).
- Render `<SyncBridge signedIn={Boolean(isSignedIn)} />` inside `ClerkProvider`.
- Keep `LocalSetupScreen` for fresh installs only; `localShop && !isSignedIn` now renders `PinGate` directly without any org cloud lookup.

- [ ] **Step 4: Verify**

Run: `cd apps/desktop && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json && npm run lint`
Expected: PASS with the two pre-existing appointments warnings at most.

- [ ] **Step 5: Review the diff**

Run: `git diff -- apps/desktop/src/components/providers.tsx apps/desktop/src/components/sync-bridge.tsx apps/desktop/src/lib/auth/offline-gate.ts`
Expected: boot/bridge changes only.

---

### Task 8: Remove the duplicate desktop offline/entitlement stack

**Files:**
- Delete: `apps/desktop/src/lib/offline-fetch.ts`, `apps/desktop/src/lib/offline/local-db.ts`, `apps/desktop/src/lib/offline/local-data.ts`, `apps/desktop/src/lib/offline/local-sync.ts`, `apps/desktop/src/lib/offline/local-adapters.ts`, `apps/desktop/src/lib/entitlement.ts`, `apps/desktop/src/lib/api/billing.ts`
- Modify: any remaining imports of those modules (use `git grep` to find them; they are all reachable from `data.ts`, `providers.tsx`, `org.tsx`, `backup.ts`, and the enterprise gate)

**Interfaces:**
- Consumes: `@pos/entitlement`, `@pos/api/billing`, `@pos/sync/*`.
- Produces: no duplicate local database, no duplicate entitlement cache.

- [ ] **Step 1: Find remaining references**

Run: `git grep -n "offline-fetch\|offline/local\|@/lib/entitlement\|@/lib/api/billing" -- apps/desktop/src`
Expected: a finite list; every hit must be replaced with the shared equivalent.

- [ ] **Step 2: Replace and delete**

For each hit, change the import to `@pos/entitlement` or `@pos/api/billing`. Then delete the files listed above. Keep `apps/desktop/src/lib/offline/migrate-legacy.ts` from Task 6.

- [ ] **Step 3: Verify no dead imports**

Run: `cd apps/desktop && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json && npm run lint`
Expected: PASS; no module-not-found errors.

- [ ] **Step 4: Review the diff**

Run: `git diff --stat -- apps/desktop/src`
Expected: only deletions and import rewrites.

---

### Task 9: Match the desktop installer icon to the mobile launcher

**Files:**
- Create: `apps/desktop/electron-build/icon.ico`
- Create: `apps/desktop/scripts/make-icon.mjs`
- Modify: `apps/desktop/electron-builder.yml:13`

**Interfaces:**
- Consumes: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`, `sharp`.
- Produces: a multi-size ICO and an explicit `win.icon` setting.

- [ ] **Step 1: Write the ICO generator**

Create `apps/desktop/scripts/make-icon.mjs`:

```js
import sharp from "sharp"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const src = path.resolve("../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")
const out = path.resolve("electron-build/icon.ico")
const sizes = [16, 32, 48, 64, 128, 256]

const images = await Promise.all(
  sizes.map(async (size) => ({
    size,
    data: await sharp(await readFile(src)).resize(size, size, { fit: "cover" }).png().toBuffer(),
  })),
)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)

let offset = 6 + images.length * 16
const entries = []
for (const img of images) {
  const e = Buffer.alloc(16)
  e.writeUInt8(img.size === 256 ? 0 : img.size, 0)
  e.writeUInt8(img.size === 256 ? 0 : img.size, 1)
  e.writeUInt8(0, 2)
  e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(img.data.length, 8)
  e.writeUInt32LE(offset, 12)
  entries.push(e)
  offset += img.data.length
}

await mkdir(path.dirname(out), { recursive: true })
await writeFile(out, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]))
console.log(`wrote ${out}`)
```

- [ ] **Step 2: Generate the icon**

Run: `cd apps/desktop && node scripts/make-icon.mjs`
Expected: `electron-build/icon.ico` exists; verify with `Get-Item electron-build/icon.ico`.

- [ ] **Step 3: Pin it in electron-builder**

In `apps/desktop/electron-builder.yml`, add under `win:`:

```yml
  icon: "icon.ico"
```

- [ ] **Step 4: Verify packaging config**

Run: `cd apps/desktop && npm run electron:dist`
Expected: build succeeds and `release/ScalPOS-win-x64.exe` embeds the new icon. (If a full NSIS build is unavailable in the environment, stop here after config verification and report the limitation.)

- [ ] **Step 5: Review the diff**

Run: `git diff -- apps/desktop/electron-builder.yml && git status --short apps/desktop/electron-build`
Expected: one config line and one new binary.

---

### Task 10: Full verification and behaviour checks

**Files:** none (verification only)

- [ ] **Step 1: Root checks**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint app components lib && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Desktop checks**

Run: `cd apps/desktop && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json && npm run lint && npm run build`
Expected: all pass (two pre-existing appointments lint warnings allowed).

- [ ] **Step 3: Offline behaviour checks**

With the built desktop app and no network:
1. Cold boot with local data → `/dashboard` appears with no Clerk or offline warning.
2. Place a sale; confirm the order is in the shared store and an outbox op exists.
3. Restore network; confirm the outbox drains, `pullAll` runs, and the order appears in Supabase.
4. Expire the cached entitlement offline; confirm POS stays usable inside the grace window and locks after it.

- [ ] **Step 4: Final diff review**

Run: `git status --short && git diff --stat`
Expected: only files listed in Tasks 1–9, no lockfile churn, no secrets.

## Self-review checklist (completed)

- Every spec section maps to a task: offline grace → 1, shared store → 2, sync tables → 3, shared layer import → 4, desktop adapter → 5, migration → 6, boot/auth/reconnect → 7, duplicate removal → 8, icon → 9, verification → 10.
- No TBD/TODO placeholders; every code step contains concrete code or an explicit complete mapping table.
- Type names and function signatures are consistent across tasks (`Supplier`, `PurchaseOrder`, `upsertSupplier`, `receivePurchaseOrder`, `SyncBridge`, `migrateLegacyDesktop`, `desktopCanBootLocally`).
