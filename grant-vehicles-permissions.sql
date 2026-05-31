-- Behörighet för Helsingbuss egna fordon/flotta
-- Kör i Supabase SQL Editor

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.vehicles to service_role;

notify pgrst, 'reload schema';
