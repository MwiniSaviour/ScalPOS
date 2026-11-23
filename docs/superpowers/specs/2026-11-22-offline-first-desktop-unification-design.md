# Offline-first desktop unification design

Date: 2026-11-22
Status: approved — awaiting implementation plan
Scope: `apps/desktop/` (Electron) and additive changes to root `lib/`

## Context

Nova POS ships two Next applications in one repository:

- The root app is the Capacitor/mobile POS. It is already offline-first: a zustand store persisted to `localStorage` (`nova-pos-v1`), an IndexedDB outbox (`nova-pos-outbox-v1`), Supabase realtime, a 30-second pull loop, Capacitor `Network` detection, and reconnect drains. It needs no behavioral changes.
- `apps/desktop/` is the Electron POS with a different UI and a separate, weaker offline stack: IndexedDB `nova-desktop-offline`, a cached-`fetch` outbox, and a one-way `syncLocalToCloud()` bridge that pushes only products, customers, staff, packages and appointments. Offline sales and categories never reach the cloud.

The goal is one shared data layer. The desktop UI keeps its distinct appearance, but all state, persistence, sync, connectivity detection and subscription enforcement come from the mobile app's proven implementation.

`v1.3.4` is already tagged and pushed. These changes land after that release and will need a new tag.

## Decisions

1. Core POS screens stay fully usable offline. Cloud-only screens (connect, billing, team invites, notifications) show a clear offline state and queue only safe actions.
2. Boot is silent when local data exists: straight to `/dashboard`, no Clerk network check, no offline warning. Sign-in is a one-time setup step, not a boot gate.
3. On reconnect the app detects connectivity and immediately drains the outbox and pulls remote changes; realtime then keeps data current.
4. Subscription enforcement uses a local check plus a bounded offline grace so a network drop can never lock a user out mid-sale.
5. The mobile app's UI and behavior do not change. The shared store is extended only with the two entities desktop needs that mobile does not model.
6. Suppliers and purchase orders are added to the shared store and sync engine, giving desktop one data layer rather than a leftover adapter.

## Architecture

### Shared layer (root `lib/`)

The single source of truth remains:

- `lib/store.ts` — zustand store, `persist` middleware, all POS actions and derived helpers.
- `lib/sync/*` — `engine.ts` (arm/pull/push/realtime), `outbox.ts` (IndexedDB operations with FK ranks), `realtime.ts`, `client.ts`.
- `lib/net.ts` — `useNet()` (Capacitor on native, `navigator.onLine` on web/Electron) and `useSyncStatus()`.
- `lib/entitlement.ts` — cached subscription, trial anchor, plan checks.
- `lib/api/session.ts` — Clerk token provider registration and short-lived token caching.
- `lib/api/bootstrap.ts` — connection read/write.

Desktop consumes these directly through an `@pos/*` alias mapped to `../../lib/*` in `apps/desktop/tsconfig.json`, with a matching webpack alias in `apps/desktop/next.config.ts` and `outputFileTracingRoot` set to the repository root so the build traces parent-directory sources.

Root files that use `@/lib/...` internally are resolved inside desktop with exact path aliases: `@/lib/api/supabase`, `@/lib/api/session`, `@/lib/api/bootstrap`, `@/lib/api/billing`, `@/lib/api/notifications`, `@/lib/sync/outbox`, `@/lib/entitlement`, `@/lib/first-run`, and `@/lib/trial`. Exact aliases take precedence over the general `@/*` mapping, so all other desktop `@/lib/...` imports keep their current targets. No root source file needs editing for path portability.

### Desktop adapter

`apps/desktop/src/lib/api/data.ts` stays the public interface used by the 24 desktop consumer files. Its ~79 exported functions are rewritten to delegate to `usePos.getState()` and the store actions. Desktop snake_case types are converted to root camelCase types and back at this boundary; no screen changes its imports.

The adapter is the only translation surface. State ownership, conflict resolution, persistence and network behavior live entirely in root `lib/`.

### Removed desktop modules

- `src/lib/offline-fetch.ts`
- `src/lib/offline/local-db.ts`, `local-data.ts`, `local-sync.ts`, `local-adapters.ts`
- The Supabase `global.fetch` wrapper in `src/lib/supabase/client.ts`
- The cloud-shop flag logic in `src/lib/auth/org.tsx` (`hasActiveShop`, `desk-pos-local-shop-v1`)
- `src/lib/entitlement.ts` and `src/lib/api/billing.ts`, replaced by the root versions (their names are the exact aliases listed above)

Desktop Clerk integration remains solely to mint Supabase JWTs into root's `registerTokenProvider`. The existing Clerk screens and appearance are unchanged.

## Shared store extension

`lib/store.ts` gains:

- `suppliers: Supplier[]`, `purchaseOrders: PurchaseOrder[]`
- `upsertSupplier`, `deleteSupplier`, `upsertPurchaseOrder`, `deletePurchaseOrder`, `receivePurchaseOrder`

Types are added to `lib/types.ts` using the existing camelCase conventions, with `updatedAt`/`createdAt` stamps so the sync engine's LWW merge applies. `lib/sync/engine.ts` adds `suppliers` and `purchase_orders` to its synced table set, with mappings in both directions and dependency entries in `lib/sync/outbox.ts` (`purchase_orders` depends on `suppliers` and `products`).

These additions are inert for mobile: no mobile screen renders or calls them.

## Boot and authentication

`apps/desktop/src/components/providers.tsx` replaces the `hasLocalShop()` gate with root's `hasOnboarded()`. A desktop with persisted store data boots directly into `/dashboard` without awaiting Clerk. The existing `LocalSetupScreen` is shown only for a genuinely fresh install; sign-in becomes an explicit choice from settings/connect screens.

Pending writes and queued sync operations survive reload because they live in the shared IndexedDB outbox, not in component state.

## Subscription

`lib/entitlement.ts` gains an offline grace rule applied only when the network is unavailable:

- If the last cached check was `active` or `trialing`, access continues until `expiresAt + OFFLINE_GRACE_MS` when an expiry is cached, or `fetchedAt + OFFLINE_GRACE_MS` when it is not.
- `OFFLINE_GRACE_MS` is a named constant of seven days.
- A cache written for a different org is still discarded.
- On reconnect, `refresh(true)` revalidates immediately; a server answer of `none` or `expired` updates the cache and re-evaluates access.

Desktop's `src/components/auth/enterprise-gate.tsx` keeps its visuals but derives access from the shared entitlement. Its "Can't check your plan" state is reachable only for an actual server error while online, never for an offline boot.

## Connectivity and sync

On mount, desktop registers the Clerk token provider and arms the shared sync engine when a connection exists. A desktop-local effect subscribes to `useNet()`; when `online` flips true it calls `drainOutbox()` and `pullAll()` immediately rather than waiting for the 30-second interval. Realtime remains the ongoing update path.

The sync status pill continues to use `useSyncStatus()` from root, so pending-count and error reporting are identical on both platforms.

## Data migration

A one-time, idempotent migration runs before the first render of the migrated desktop build:

1. Detect legacy state: `nova-desktop-offline` IndexedDB or `desk-pos-local-shop-v1 === "1"`.
2. Read all legacy stores (`settings`, `products`, `categories`, `customers`, `orders`, `staff`, `appointments`, `packages`) and convert each row to the root type shape, preserving IDs so references stay intact.
3. Write the converted collections into `usePos` via a single `set()` call, then let the existing `persist` middleware write `nova-pos-v1`.
4. Set a `desk-pos-migrated-v1` marker only after every store converts successfully.

If migration fails partway, the marker is absent and the next boot retries from the still-intact legacy stores. No legacy data is deleted. The migration writes the local store only; cloud push is handled afterward by the normal outbox when a connection exists.

## Icon

Generate `apps/desktop/electron-build/icon.ico` as a multi-size ICO (16, 32, 48, 64, 128, 256 px) from `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`. Set `win.icon: "icon.ico"` explicitly in `apps/desktop/electron-builder.yml`; `buildResources: electron-build` already points at that directory. This is the only icon change — the mobile launcher icons and Capacitor config stay as they are.

## Error handling

- Network failures never surface as blocking errors on POS screens. Reads resolve from the local store; writes resolve locally and enqueue.
- A failed outbox operation records `last_error` on the operation and is retried on reconnect and on the shared 15-second retry loop. The status pill shows the error rather than spinning indefinitely.
- A rejected row (validation/conflict) is surfaced on the conflicts screen; it is never silently dropped.
- Clerk token mint failure disables cloud sync but leaves local POS fully functional.
- Migration errors leave legacy data untouched and retry on the next boot.

## Testing

- Unit tests: desktop-to-root type conversions; migration conversion and idempotency; offline grace boundaries (before expiry, inside grace, outside grace, org mismatch).
- Integration checks: offline boot shows no auth/offline warning; an offline sale persists locally, appears in the outbox, and reaches Supabase after reconnect; realtime updates from another device appear without a pull cycle.
- Regression: the 24 desktop consumer files compile with unchanged imports; both apps' `tsc --noEmit`, `eslint`, `npm test`, and `npm run build` pass.
- Packaging: built NSIS installer contains the new ICO and the desktop shortcut uses it.

## Non-goals

- No changes to mobile UI or mobile sync behavior.
- No redesign of the desktop UI.
- No new backend tables; Supabase already has the suppliers and purchase_orders tables used by desktop today.
- No release/tag work in this spec; a new tag follows implementation and verification.
