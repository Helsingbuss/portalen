-- Komplettera vehicles för Helsingbuss egna flotta
-- Kör i Supabase SQL Editor

alter table public.vehicles
add column if not exists vehicle_code text,
add column if not exists registration_number text,
add column if not exists model text,
add column if not exists vehicle_type text,
add column if not exists km integer default 0,
add column if not exists next_service_km integer,
add column if not exists status text default 'available',
add column if not exists notes text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.vehicles to service_role;

notify pgrst, 'reload schema';
