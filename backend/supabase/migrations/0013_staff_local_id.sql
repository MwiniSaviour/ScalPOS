-- 0013_staff_local_id.sql — local_id sync key for staff
--
-- The sync engine upserts every synced table on (org_id, local_id); staff was
-- created with op_id only. Add the local_id column and its unique index so
-- staff rows can be pushed and pulled exactly like products and customers.
--
-- Idempotent: safe to re-run.

-- ---------- local_id ----------

alter table public.staff add column if not exists local_id text;
create unique index if not exists staff_org_local_id_key on public.staff (org_id, local_id);
