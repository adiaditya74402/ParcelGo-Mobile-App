-- ParcelGo stage 2: sender-created parcel requests and private parcel photos.
-- Run after 0001_profiles.sql in the Supabase SQL Editor.

create table if not exists public.parcel_orders (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  courier_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 80),
  description text,
  package_size text not null check (package_size in ('small', 'medium', 'large')),
  pickup_address text not null,
  pickup_latitude double precision not null check (pickup_latitude between -90 and 90),
  pickup_longitude double precision not null check (pickup_longitude between -180 and 180),
  destination_address text not null,
  destination_latitude double precision not null check (destination_latitude between -90 and 90),
  destination_longitude double precision not null check (destination_longitude between -180 and 180),
  offered_price numeric(10, 2) not null check (offered_price > 0),
  photo_path text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists parcel_orders_sender_created_idx
  on public.parcel_orders (sender_id, created_at desc);

alter table public.parcel_orders enable row level security;

drop policy if exists "Senders can create their own parcel requests" on public.parcel_orders;
create policy "Senders can create their own parcel requests"
  on public.parcel_orders for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'sender'
    )
  );

drop policy if exists "Users can view their own parcel requests" on public.parcel_orders;
create policy "Users can view their own parcel requests"
  on public.parcel_orders for select to authenticated
  using (sender_id = auth.uid());

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