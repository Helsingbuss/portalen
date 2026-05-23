create table if not exists public.sundra_departure_lines (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.sundra_departures(id) on delete cascade,
  line_id uuid not null references public.sundra_lines(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (departure_id, line_id)
);

insert into public.sundra_departure_lines (departure_id, line_id)
select id, line_id
from public.sundra_departures
where line_id is not null
on conflict (departure_id, line_id) do nothing;
