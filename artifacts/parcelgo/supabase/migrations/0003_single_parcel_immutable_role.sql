-- ParcelGo stage 3: one parcel per sender, immutable post-signup role, and storage repair.
-- Run after 0002_parcel_orders.sql in the Supabase SQL Editor.

create unique index if not exists parcel_orders_one_per_sender_idx
  on public.parcel_orders (sender_id);

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'The account role cannot be changed after signup'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parcel-photos',
  'parcel-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Senders can upload their parcel photos" on storage.objects;
create policy "Senders can upload their parcel photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'parcel-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Senders can view their parcel photos" on storage.objects;
create policy "Senders can view their parcel photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'parcel-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Senders can delete their parcel photos" on storage.objects;
create policy "Senders can delete their parcel photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'parcel-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );