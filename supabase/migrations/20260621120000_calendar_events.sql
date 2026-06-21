-- Családi naptár események. v1: user_id-scoped RLS (a shopping_lists/products
-- mintát követve), NEM family_id — a valódi család-megosztás későbbi fázis (v2.x).
-- A member_id/color a tagszínes megjelenítést szolgálja (v1-ben opcionális).

create table if not exists public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_by   uuid references auth.users (id) on delete set null,
  title        text not null,
  description  text,
  location     text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  member_id    uuid,                      -- melyik családtaghoz tartozik (szín); v1-ben opcionális
  color        text,                      -- esemény szín (tagszín-palettából); felülírja a tag színt
  rrule        text,                      -- ismétlődés (RFC 5545); v1-ben nem használt
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists calendar_events_user_starts_idx
  on public.calendar_events (user_id, starts_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events - select own"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "calendar_events - insert own"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

create policy "calendar_events - update own"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "calendar_events - delete own"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- updated_at automatikus karbantartása
create or replace function public.set_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_calendar_events_updated_at();
