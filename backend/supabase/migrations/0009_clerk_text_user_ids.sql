-- Clerk is the only auth provider; memberships key off Clerk `sub`, not auth.users.
drop policy if exists product_images_select on storage.objects;
drop policy if exists product_images_insert on storage.objects;
drop policy if exists product_images_update on storage.objects;
drop policy if exists product_images_delete on storage.objects;

alter table public.memberships drop constraint if exists memberships_user_id_fkey;
alter table public.memberships alter column user_id type text using user_id::text;

create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from public.memberships
  where user_id = (auth.jwt() ->> 'sub')
    and deleted_at is null
$$;

create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = (auth.jwt() ->> 'sub')
      and deleted_at is null
      and role = any (roles)
  )
$$;

create or replace function public.has_org_role(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = (auth.jwt() ->> 'sub')
      and org_id = org
      and deleted_at is null
      and role = any (roles)
  )
$$;

create policy product_images_select on storage.objects for select
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships
      where user_id = (auth.jwt() ->> 'sub') and deleted_at is null
    )
  );

create policy product_images_insert on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships
      where user_id = (auth.jwt() ->> 'sub') and role in ('owner','supervisor') and deleted_at is null
    )
  );

create policy product_images_update on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships
      where user_id = (auth.jwt() ->> 'sub') and role in ('owner','supervisor') and deleted_at is null
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships
      where user_id = (auth.jwt() ->> 'sub') and role in ('owner','supervisor') and deleted_at is null
    )
  );

create policy product_images_delete on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.memberships
      where user_id = (auth.jwt() ->> 'sub') and role in ('owner','supervisor') and deleted_at is null
    )
  );
