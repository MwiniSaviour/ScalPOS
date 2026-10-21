# Nova POS — Backend Foundation (Multi-User Sync) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable, industry-standard backend (Supabase Postgres + RLS + Realtime + Storage) and rewire Nova POS to sync multi-user, multi-device, offline-first, with conflict resolution, while keeping the app fully usable with no network.

**Architecture:** (1) A standalone `backend/` folder with Supabase migrations + RLS + edge functions + a seed script + tests. (2) A `lib/sync/` module in the Next.js app that wraps the backend in an offline-first queue (outbox + idempotent writes + exponential backoff + realtime subscriptions), reusing the existing `lib/staff.ts` role model and `lib/store.ts` persist blob. (3) A small `lib/api/` typed client. The web app keeps its local-first data model; sync is additive and reversible (env flag `NEXT_PUBLIC_SYNC_ENABLED`).

**Tech Stack:** Supabase (Postgres 15 + RLS + Realtime + Storage), PostgREST, Deno edge functions, Node 26 (tests via `node --test`), Next.js 16 static export, Capacitor 8, TypeScript 5.9.

**Spec:** This plan (user request 2026-10-21: "plan this out and dispatch parallel agents to implement these completely, starting with a stronger backend foundation and industry standard approach and best practices for durability and efficiency").

## Global Constraints

- Offline-first is mandatory: every write succeeds locally first; backend sync is best-effort with retry; the UI never blocks on network.
- No breaking change to the persisted store: `nova-pos-v1` blob keeps its `version` field; backend is a *mirror*, not the source of truth for the client.
- RLS is the security boundary: every table has `ENABLE ROW LEVEL SECURITY` and a policy; never trust the client.
- Idempotency: every upsert carries a client-generated `op_id` (UUID) so retries are safe.
- Soft delete only: `deleted_at timestamptz` on every domain table; hard deletes never.
- Multi-tenant from day 1: every row carries `org_id`; no row is global except `auth.users`.
- Migrations are append-only and numbered; never edit a shipped migration.
- Static export constraint: no server routes in Next.js; all backend calls go to Supabase REST/Realtime/Storage.
- No native deps added to the web bundle beyond the Supabase JS client (`@supabase/supabase-js`).

## Review Focus

- RLS policies must be tested against a real Postgres (pgTAP or integration tests), not just read — a policy that reads `auth.uid()` wrong silently leaks data.
- Realtime subscriptions must be scoped to `org_id` via RLS on the publication; an unfiltered channel leaks cross-tenant rows.
- The outbox must survive app restarts (IndexedDB, not memory) and must not lose writes on quota errors.
- Conflict resolution (last-write-wins by `updated_at` with `op_id` tiebreak) must be deterministic and tested with concurrent edits.
- Soft-delete + RLS + Realtime combination has a known gotcha: a deleted row's `DELETE` event is only delivered if RLS still permits SELECT on it — must verify.
- Offline queue ordering: a child row (order line) must never sync before its parent (order) — topological sort by FK.
- Storage uploads (product photos) need signed URLs with short expiry; never expose bucket as public.

---

## Task Graph

Independent tracks (parallel-safe, no shared files):

- **Track A — Backend foundation** (new `backend/` folder): schema, RLS, migrations, seed, edge functions, tests.
- **Track B — Sync client** (new `lib/sync/` + `lib/api/`): outbox, idempotent client, realtime, conflict resolver.
- **Track C — App integration** (modify existing screens behind a flag): settings → "Connect to backend", status indicator, manual sync button, conflict UI.
- **Track D — Observability + tests** (new `tests/` + CI): pgTAP, integration tests, perf smoke.

Tracks A and B can run fully in parallel. C depends on B's interfaces. D depends on A+B.

---

## Task A1: Supabase project scaffold + migrations baseline

**Files:**
- Create: `backend/supabase/config.toml`
- Create: `backend/supabase/migrations/0001_init.sql`
- Create: `backend/supabase/migrations/0002_rls.sql`
- Create: `backend/supabase/migrations/0003_realtime.sql`
- Create: `backend/supabase/migrations/0004_storage.sql`
- Create: `backend/README.md`
- Create: `backend/.env.example`
- Modify: `package.json` (add `backend:*` scripts, `@supabase/supabase-js` dep)

**Interfaces produced:**
- `orgs(id uuid pk, name text, created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)`
- `memberships(org_id uuid, user_id uuid, role text check in ('owner','supervisor','cashier'), created_at, updated_at, deleted_at, pk(org_id,user_id))`
- `products(org_id, id uuid pk, name, sku, barcode, price numeric, cost numeric, stock int, low_stock_at int, category_id uuid, image_path text, created_at, updated_at, deleted_at, op_id uuid unique)`
- same shape for `categories`, `customers`, `orders`, `order_items`, `stock_moves`, `settings` (single row per org), `staff` (mirror of local staff).
- Every table has `updated_at` trigger (`moddatetime`).

- [ ] **Step 1: Write the failing test** — `backend/tests/migrations.test.ts` asserts every domain table exists, has RLS enabled, has `deleted_at`, `op_id` unique where applicable, and `updated_at` trigger. Run with `node --test` against a local Supabase started via `supabase start`.

- [ ] **Step 2: Run test to verify it fails** (tables don't exist yet).

- [ ] **Step 3: Write migrations** — `0001_init.sql` creates tables + triggers + indexes (org_id, updated_at, deleted_at partial). `0002_rls.sql` enables RLS + policies. `0003_realtime.sql` adds tables to the `supabase_realtime` publication filtered by org. `0004_storage.sql` creates `product-images` bucket (private) + storage policies scoped to org prefix.

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Commit** `feat(backend): baseline schema + rls + realtime + storage`.

---

## Task A2: RLS policies + multi-tenant isolation

**Files:**
- Modify: `backend/supabase/migrations/0002_rls.sql`
- Create: `backend/tests/rls.test.ts` (pgTAP via `supabase test db` or integration via supabase-js)

**Interfaces consumed:** Task A1 tables.

**Policies (one per table):**
- `SELECT`: `org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND deleted_at IS NULL)`
- `INSERT`: same check + `role IN ('owner','supervisor')` for products/categories/stock; cashiers allowed for orders/order_items/customers.
- `UPDATE`: same as insert per table.
- `DELETE`: soft-delete only via UPDATE setting `deleted_at`; revoke direct DELETE (policy `USING (false)`).

- [ ] **Step 1: Write failing RLS tests** — user A in org 1 cannot read org 2 rows; cashier cannot update products; soft delete works; hard delete blocked.

- [ ] **Step 2: Run to verify fail.**

- [ ] **Step 3: Implement policies.**

- [ ] **Step 4: Run to verify pass** (cross-tenant isolation + role gating).

- [ ] **Step 5: Commit** `feat(backend): rls multi-tenant policies`.

---

## Task A3: Edge functions (auth bootstrap + invite)

**Files:**
- Create: `backend/supabase/functions/bootstrap-org/index.ts` (creates org + owner membership on first sign-in)
- Create: `backend/supabase/functions/invite-member/index.ts` (owner invites by email, creates pending membership)
- Create: `backend/supabase/functions/accept-invite/index.ts`

**Interfaces produced:** HTTP endpoints documented in `backend/README.md`.

- [ ] Implement with Deno, validate JWT, idempotent on `op_id`.
- [ ] Tests: `backend/tests/functions.test.ts` against `supabase functions serve`.
- [ ] Commit.

---

## Task B1: Sync client — outbox + idempotent writes

**Files:**
- Create: `lib/sync/outbox.ts` (IndexedDB-backed queue: `enqueue(op)`, `drain()`, `peek()`)
- Create: `lib/sync/client.ts` (`SyncClient` class: `upsert(table, row)`, `softDelete(table, id)`, returns `op_id`)
- Create: `lib/sync/types.ts` (`Op`, `SyncStatus`, `Conflict`)
- Create: `lib/api/supabase.ts` (typed client factory from env)
- Modify: `package.json` (add `@supabase/supabase-js`)

**Interfaces produced:**
- `enqueue(op: Op): Promise<void>`
- `drain(): Promise<{applied: number; failed: Op[]}>`
- `SyncClient.upsert(table, row): Promise<{op_id: string}>`
- `SyncClient.pull(table, since: string): Promise<Row[]>`

- [ ] Outbox persists in IndexedDB (`nova-pos-outbox-v1`), survives reload.
- [ ] Drain sorts ops topologically by FK dependency (parents before children) using a declared dependency map.
- [ ] Idempotency: `op_id` is the row's PK in a `sync_ops` audit table; re-sending the same `op_id` is a no-op.
- [ ] Tests: `lib/sync/__tests__/outbox.test.ts` (node --test with fake-indexeddb).
- [ ] Commit.

---

## Task B2: Realtime subscriptions + conflict resolver

**Files:**
- Create: `lib/sync/realtime.ts` (`subscribe(orgId, tables, onChange)`)
- Create: `lib/sync/conflict.ts` (`resolve(local, remote): 'local'|'remote'|'merge'` with LWW by `updated_at` + `op_id` tiebreak)
- Create: `lib/sync/merge.ts` (field-level merge for non-conflicting edits where both sides changed disjoint fields)

**Interfaces produced:**
- `subscribe(orgId, tables, onChange): () => void` (unsubscribe)
- `resolve(local, remote): Resolution`

- [ ] Realtime channel filtered by `org_id` via RLS; unsubscribe on unmount.
- [ ] Conflict resolver: if `remote.updated_at > local.updated_at` → remote wins; if equal → higher `op_id` wins; if local has unpushed changes → enqueue a merge op.
- [ ] Tests: `lib/sync/__tests__/conflict.test.ts` with concurrent-edit fixtures.
- [ ] Commit.

---

## Task B3: Offline detection + sync status UI

**Files:**
- Modify: `lib/net.ts` (add `useSyncStatus()` hook: `{online, syncing, pendingCount, lastSyncAt, error}`)
- Create: `components/ui/syncstatus.tsx` (small pill: "Synced" / "Syncing…" / "Offline — N pending" / "Sync error")
- Modify: `components/shell/appshell.tsx` (mount SyncStatus next to NetStatus)

**Interfaces consumed:** Task B1 outbox, Task B2 realtime.

- [ ] Status reflects outbox depth + drain state.
- [ ] Manual "Sync now" button in `/settings` triggers `drain()`.
- [ ] Commit.

---

## Task C1: Settings → "Connect to backend"

**Files:**
- Modify: `app/settings-screen.tsx` (add "Backend" section: org code input, sign in (magic link), connect/disconnect, status)
- Create: `app/connect-screen.tsx` + `app/connect/page.tsx`
- Modify: `lib/store.ts` (READ ONLY — add `syncEnabled`, `orgId`, `userId` to *settings* via existing `updateSettings`? No — add a separate `lib/sync/state.ts` zustand-free module to avoid touching store persist version)

**Interfaces consumed:** Task B1/B2/B3, Task A3.

- [ ] Sign-in via Supabase magic link (email OTP) — no password.
- [ ] On first sign-in, call `bootstrap-org` edge function.
- [ ] Persist connection in `localStorage` `nova-pos-sync-v1` (separate key — never bump main store).
- [ ] Commit.

---

## Task C2: Conflict resolution UI

**Files:**
- Create: `components/ui/conflict-sheet.tsx` (shows local vs remote diff, "Keep mine" / "Take theirs" / "Merge")
- Modify: `app/orders-screen.tsx`? No — keep conflict UI in settings + a global toast with "Review conflicts (N)" link to `/conflicts`.
- Create: `app/conflicts-screen.tsx` + `app/conflicts/page.tsx`

**Interfaces consumed:** Task B2 `Conflict`.

- [ ] Conflicts queued in IndexedDB; badge count on `/more`.
- [ ] Commit.

---

## Task D1: Test harness + CI

**Files:**
- Create: `tests/integration/sync.test.ts` (offline → write → online → drain → verify row in DB)
- Create: `.github/workflows/ci.yml` (tsc + eslint + tests + supabase db test)
- Create: `backend/tests/rls.test.ts` (already in A2)

- [ ] CI runs on push; blocks merge on failure.
- [ ] Commit.

---

## Execution order

1. **Track A (backend)** and **Track B (sync client)** in parallel — 6 tasks, no file overlap.
2. **Track C (app integration)** after B's interfaces land — 2 tasks.
3. **Track D (tests/CI)** last — 1 task.

## Verification (global)

- `cd backend && supabase db test` (RLS + migrations)
- `npm test` (outbox + conflict + integration)
- `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint app components lib`
- `./node_modules/.bin/next build --webpack`
- Manual: two browsers, offline edit on one, reconnect, see the other update.

## Backend effort estimate

- Backend foundation (A): ~15/100 of the remaining 55 points (schema + RLS + edge functions).
- Sync client (B): ~20/100 (outbox + realtime + conflicts).
- App integration (C): ~12/100.
- Tests/CI (D): ~8/100.
- Total: ~55/100 — matches the earlier estimate; after this, multi-device sync is production-grade.
