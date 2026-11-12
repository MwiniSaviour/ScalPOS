-- 0012_business_types.sql — shop business type
--
-- The business type is chosen at shop creation (retail, pharmacy, restaurant,
-- salon) and drives terminology and screen defaults. It lives on the
-- one-row-per-org settings document so a reinstall restores it alongside the
-- shop name. Existing rows default to retail, matching the client default.
--
-- Idempotent: safe to re-run.

-- ---------- business type ----------

alter table public.settings add column if not exists business_type text not null default 'retail';
