# Nova POS — Backend Deployment Guide

The backend is a **Supabase** project: Postgres + Row Level Security + Realtime + Storage,
plus three Deno edge functions. The app stays fully offline-first without it — the backend
powers multi-user/multi-device sync, team roles, and cloud backup.

---

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard> → **New project**
   - Name: `nova-pos`
   - Database password: save it in your password manager
   - Region: pick the closest to your users (e.g. `Europe-West 1` for Ghana — Accra users
     are usually served best by EU/Africa regions)
2. Wait for the project to finish provisioning (~1 minute).

## 2. Install the Supabase CLI (done once)

```bash
npm install -g supabase
# Termux only: fix the shebang
find $PREFIX/lib/node_modules/supabase -type f -print0 \
  | xargs -0 sed -i '1s|^#!/usr/bin/env |#!/data/data/com.termux/files/usr/bin/env |'
supabase --version
```

## 3. Link this repo to the project

```bash
cd backend
supabase login                 # paste the access token from dashboard → Account → Access Tokens
supabase link --project-ref <PROJECT_REF>   # found in dashboard → Project Settings → API
```

`supabase link` writes `backend/supabase/.temp/project-ref` — **do not commit it** (already
git-ignored).

## 4. Apply the migrations

```bash
cd backend
supabase db push               # applies 0001..0004 in order, then records them
```

Or paste the same four files into **SQL Editor → New query → Run** (order matters:
`0001_init.sql`, `0002_rls.sql`, `0003_realtime.sql`, `0004_storage.sql`).

What this creates:

| Object | Purpose |
|---|---|
| `orgs`, `memberships` | tenants + who belongs to them, with role |
| `products`, `categories`, `customers`, `orders`, `order_items`, `stock_moves`, `settings`, `staff` | the mirrored business data |
| `public.current_org_ids()`, `public.has_org_role()` | `SECURITY DEFINER` helpers every policy uses (inlining a `memberships` subquery in a policy on `memberships` recurses infinitely) |
| RLS policies | 4 per table (select/insert/update/delete); delete is `USING (false)` — soft delete only |
| `supabase_realtime` publication | all domain tables, org-scoped by RLS |
| `product-images` bucket | private; product photos under `{org_id}/…` |

## 5. Deploy the edge functions

```bash
cd backend
supabase functions deploy bootstrap-org
supabase functions deploy invite-member
supabase functions deploy accept-invite
```

Set the function secrets if you later add a service key:

```bash
supabase secrets set SERVICE_ROLE_KEY=<your service_role key>
```

## 6. Configure auth

Dashboard → **Authentication → Sign In / Providers**:
- **Email** → enable. Turn *Confirm email* **off** for magic-link sign-in, or keep it on if
  you want verified staff only.
- Add **Redirect URLs**: `http://localhost:3000/**`, plus your Capacitor app scheme
  (`gg.novapos.app://**`) if you later add deep links.

Dashboard → **Authentication → URL Configuration** → set **Site URL** to the address the app
is served from (e.g. `https://nova-pos.pages.dev` or `http://localhost:3000` for dev).

## 7. Point the app at the backend

Create `.env.local` in the repo root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Both values are in **Project Settings → API**. The anon key is safe to ship in the app —
row security is what protects the data.

Then rebuild:

```bash
npm run build
./node_modules/.bin/cap sync android
```

Without those env vars the app runs exactly as before (local-only, no sync).

## 8. Verify

```bash
cd backend
supabase test db        # runs supabase/tests/rls_isolation_test.sql (11 assertions)
```

The test proves: cross-tenant isolation, cashier vs owner write permissions, hard delete
blocked, soft delete allowed, `updated_at` trigger, and outsider scoping.

Then in the app: **Settings → Backend → Sign in with email** → the shop creates its org on
first sign-in. Invite a teammate from the same screen; they sign in and see the same
catalogue.

---

## Local development (needs Docker)

```bash
cd backend
supabase start          # local Postgres + Auth + Storage + Realtime
supabase db reset       # apply migrations locally
supabase test db
supabase functions serve bootstrap-org
```

Point `.env.local` at the local stack:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed by `supabase start`>
```

> Docker is not available on this Termux host, so the local stack could not be started here.
> The migrations were instead executed against a plain Postgres 18 instance with the
> Supabase-internal objects (`auth.uid()`, `auth.users`, `storage.buckets`,
> `storage.foldername()`, `extensions.moddatetime()`) shimmed, and the isolation test was
> run there: 11/11 assertions pass.

---

## Operational notes

- **Never edit an applied migration.** Add a new numbered file instead.
- **Backups first.** `supabase db dump --linked > backup.sql` before any risky change.
- **Realtime** needs the tables in the publication (migration 0003) — they are.
- **Storage** objects must be uploaded under `{org_id}/{productId}.jpg` so the storage
  policies scope them per tenant.
- **Rate limits**: the free tier allows 500MB egress and 5GB DB — fine for a shop.
- **Rotating the anon key** is safe: it is public by design; RLS does the protecting.
