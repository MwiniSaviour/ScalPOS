-- 0020_settings_business_config.sql — sync restaurant/salon setup with settings
--
-- The settings row already carries business_type; the per-type setup lived only
-- in localStorage, so a reinstall or a second device lost table/order-type and
-- opening-days/hours choices. These jsonb columns ride with the settings
-- document; other business types push null and never see them.
--
-- Idempotent: safe to re-run.

alter table public.settings add column if not exists restaurant_config jsonb;
alter table public.settings add column if not exists salon_config jsonb;
