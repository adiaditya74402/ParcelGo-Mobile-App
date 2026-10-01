-- ParcelGo stage 1: auth-linked profiles and sender/courier roles.
-- Run this migration in the Supabase SQL Editor before creating app accounts.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'sender'
    check (role in ('sender', 'courier')),
  expo_push_token text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_parcelgo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  requested_name text := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  requested_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(requested_name, split_part(coalesce(new.email, ''), '@', 1), 'ParcelGo member'),
    requested_phone,
    case when requested_role in ('sender', 'courier') then requested_role else 'sender' end
  )
  on conflict (id) do update
    set name = excluded.name,
        phone = excluded.phone,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_parcelgo_user_created on auth.users;
create trigger on_parcelgo_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_parcelgo_user();