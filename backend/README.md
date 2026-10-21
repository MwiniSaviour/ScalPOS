# Nova POS Backend (Supabase)

Multi-tenant backend foundation: Postgres 15 + RLS + Realtime + Storage.

## Prerequisites
- Supabase CLI (`npm i -g supabase`) and Docker (for `supabase start`).
- Node 26 for tests.

## Quick start
```
cd backend
supabase start
supabase db reset   # applies migrations
```

## Environment
Copy `.env.example` to `.env` and fill in values from `supabase status`.

## Edge functions
- `bootstrap-org` (POST) — creates org + owner membership + settings on first sign-in; idempotent.
- `invite-member` (POST) — owner/supervisor invites by email; returns signed token.
- `accept-invite` (POST) — authenticated user accepts invite token; creates membership.

Serve locally: `supabase functions serve`.

## Tests
- Migrations/schema: `node --test backend/tests/migrations.test.ts` (requires SUPABASE_* env)
- RLS: `node --test backend/tests/rls.test.ts`
- pgTAP: `supabase test db`

## Notes
- All domain tables are org-scoped via RLS; hard deletes are blocked (soft delete via `deleted_at`).
- Storage bucket `product-images` is private; object paths must be `{org_id}/...`.
- Realtime publication includes all domain tables; RLS filters rows per org.
