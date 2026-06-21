-- Heti étkezésterv tételei. v1: user_id-scoped RLS (a calendar_events mintát
-- követve), NEM family_id. Egy recept egy adott nap egy adott étkezéséhez
-- (reggeli/ebéd/vacsora) — a (user_id, date, meal_type) páros egyedi.

create table if not exists public.meal_plan_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  date        date not null,
  meal_type   text not null check (meal_type in ('reggeli', 'ebéd', 'vacsora')),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  servings    integer not null default 4 check (servings > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, date, meal_type)
);

create index if not exists meal_plan_entries_user_date_idx
  on public.meal_plan_entries (user_id, date);

alter table public.meal_plan_entries enable row level security;

create policy "meal_plan_entries - select own"
  on public.meal_plan_entries for select
  using (auth.uid() = user_id);

create policy "meal_plan_entries - insert own"
  on public.meal_plan_entries for insert
  with check (auth.uid() = user_id);

create policy "meal_plan_entries - update own"
  on public.meal_plan_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_plan_entries - delete own"
  on public.meal_plan_entries for delete
  using (auth.uid() = user_id);
