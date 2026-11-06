-- FamilyHub közös naptár + közös taglista (2026-11-06).
--
-- A `calendar_events` a bevásárló-adatokkal azonos modellt kap: a sorok a család
-- adatgazdájának (tulajdonos) user_id-ja alatt élnek, a tagok a családi RLS
-- policy-kon át olvassák/írják (viewer csak olvas). Lásd
-- 20261106102748_family_sharing.sql (`is_family_peer`).
--
-- Új `household_members`: a háztartás tagjai (név + tagszín), fiók nélküli
-- gyerekek is. Eddig csak a telefonon (AsyncStorage) élt; a naptáresemények és az
-- étrend-tételek `member_id`-ja erre hivatkozik. Az id-t a kliens adja, hogy a
-- meglévő lokális tag-id-k (és így a régi hozzárendelések) megmaradjanak.
--
-- Újrafuttatható (idempotens).

create table if not exists public.household_members (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade, -- adatgazda
  name       text not null,
  color      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_members_user_idx
  on public.household_members (user_id, sort_order);

drop trigger if exists update_household_members_updated_at on public.household_members;
create trigger update_household_members_updated_at
  before update on public.household_members
  for each row execute function public.update_updated_at_column();

alter table public.household_members enable row level security;

drop policy if exists "household_members - own" on public.household_members;
create policy "household_members - own"
  on public.household_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "household_members - family select" on public.household_members;
create policy "household_members - family select"
  on public.household_members for select using (public.is_family_peer(user_id));
drop policy if exists "household_members - family insert" on public.household_members;
create policy "household_members - family insert"
  on public.household_members for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "household_members - family update" on public.household_members;
create policy "household_members - family update"
  on public.household_members for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "household_members - family delete" on public.household_members;
create policy "household_members - family delete"
  on public.household_members for delete using (public.is_family_peer(user_id, true));

-- ─── Naptár: kiegészítő családi policy-k (a meglévő „own" policy-k maradnak) ──

drop policy if exists "calendar_events - family select" on public.calendar_events;
create policy "calendar_events - family select"
  on public.calendar_events for select using (public.is_family_peer(user_id));
drop policy if exists "calendar_events - family insert" on public.calendar_events;
create policy "calendar_events - family insert"
  on public.calendar_events for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "calendar_events - family update" on public.calendar_events;
create policy "calendar_events - family update"
  on public.calendar_events for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "calendar_events - family delete" on public.calendar_events;
create policy "calendar_events - family delete"
  on public.calendar_events for delete using (public.is_family_peer(user_id, true));
