-- 0004_storage.sql — product-images bucket (private) + org-scoped policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 52428800, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

-- SELECT: members of the org (folder = org_id)
create policy product_images_select on storage.objects for select
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships where user_id = auth.uid() and deleted_at is null
    )
  );

-- INSERT: owner/supervisor
create policy product_images_insert on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null
    )
  );

-- UPDATE: owner/supervisor
create policy product_images_update on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null
    )
  );

-- DELETE: owner/supervisor (hard delete of storage object allowed; domain rows stay soft-deleted)
create policy product_images_delete on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null
    )
  );
