-- Shared rows must never store device-local image refs: no other device can
-- read the originating phone's IndexedDB, and clearing app storage destroys
-- the only copy. Portable refs are bucket paths (sb-product-images:...) or URLs.
update public.products set image_path = '' where image_path ilike 'idb:%';
update public.order_items set image_path = '' where image_path ilike 'idb:%';

alter table public.products
  add constraint products_image_path_portable
  check (image_path not ilike 'idb:%');

alter table public.order_items
  add constraint order_items_image_path_portable
  check (image_path not ilike 'idb:%');
