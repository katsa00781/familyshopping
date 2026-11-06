-- FamilyHub család-megosztás (2026-11-06).
--
-- Modell: „családi tér a tulajdonos adatain". A családnak egy tulajdonosa (owner_id)
-- van; a közös bevásárló-adatok (listák, termékek, árelőzmény, vásárlási statisztika,
-- boltsorrend) az Ő user_id-ja alatt élnek. A tagok RLS-en keresztül olvassák (és a
-- 'viewer' kivételével írják) ezeket. A meglévő „own" policy-k érintetlenek, a
-- családi policy-k permissive kiegészítések → a familybudget web (user_id szűrés)
-- viselkedése nem változik.
--
-- Csatlakozás: 6 karakteres, 7 napig érvényes meghívókód (`join_family`).
--
-- Újrafuttatható (idempotens): táblák `if not exists`, függvények `create or replace`,
-- triggerek/policy-k előtt `drop … if exists`.

-- ─── Táblák ──────────────────────────────────────────────────────────────────

create table if not exists public.families (
  id                uuid primary key default gen_random_uuid(),
  name              text not null default 'Családunk',
  owner_id          uuid not null references auth.users (id) on delete cascade,
  invite_link       text unique,          -- a meghívókód (a familyStore ezt a nevet használja)
  invite_expires_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  -- profiles FK: a PostgREST beágyazás (family_members → profiles) miatt.
  -- unique: egy felhasználó egyszerre egy családhoz tartozik.
  user_id    uuid not null unique references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  joined_at  timestamptz not null default now()
);

create index if not exists family_members_family_idx on public.family_members (family_id);

-- Bevásárlási beállítások az adatgazdához kötve (családban: a tulajdonos sora).
create table if not exists public.shopping_preferences (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  store_order jsonb not null default '["Lidl", "Aldi"]'::jsonb,
  updated_at  timestamptz not null default now()
);

drop trigger if exists update_families_updated_at on public.families;
create trigger update_families_updated_at
  before update on public.families
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_shopping_preferences_updated_at on public.shopping_preferences;
create trigger update_shopping_preferences_updated_at
  before update on public.shopping_preferences
  for each row execute function public.update_updated_at_column();

-- ─── Segédfüggvények (security definer: a family_members RLS-t megkerülik) ────

create or replace function public.my_family_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

create or replace function public.is_family_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_members where user_id = auth.uid() and role = 'admin'
  )
$$;

-- Igaz, ha a `target` felhasználó a hívóval egy családban van. `needs_write`
-- esetén a hívónak írási szerepkör kell (admin/member).
create or replace function public.is_family_peer(target uuid, needs_write boolean default false)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members me
    join public.family_members other on other.family_id = me.family_id
    where me.user_id = auth.uid()
      and other.user_id = target
      and (not needs_write or me.role in ('admin', 'member'))
  )
$$;

-- A közös adatok gazdája: a család tulajdonosa, család nélkül a hívó maga.
create or replace function public.family_data_owner()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select f.owner_id
       from public.family_members m
       join public.families f on f.id = m.family_id
      where m.user_id = auth.uid()),
    auth.uid()
  )
$$;

-- ─── RPC-k ───────────────────────────────────────────────────────────────────

create or replace function public.regenerate_family_invite()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  fid  uuid := public.my_family_id();
  code text;
begin
  if fid is null or not public.is_family_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  loop
    -- Félreolvasható karakterek (0/O, 1/I) nélkül.
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.families where invite_link = code);
  end loop;
  update public.families
     set invite_link = code, invite_expires_at = now() + interval '7 days'
   where id = fid;
  return code;
end
$$;

create or replace function public.create_family(p_name text default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_FAMILY';
  end if;
  insert into public.families (name, owner_id)
  values (coalesce(nullif(trim(p_name), ''), 'Családunk'), auth.uid())
  returning id into fid;
  insert into public.family_members (family_id, user_id, role) values (fid, auth.uid(), 'admin');
  perform public.regenerate_family_invite();
  return fid;
end
$$;

create or replace function public.join_family(p_code text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_FAMILY';
  end if;
  select id into fid
    from public.families
   where invite_link = upper(trim(p_code))
     and invite_expires_at > now();
  if fid is null then
    raise exception 'INVALID_CODE';
  end if;
  insert into public.family_members (family_id, user_id, role) values (fid, auth.uid(), 'member');
  return fid;
end
$$;

revoke execute on function public.my_family_id() from public, anon;
revoke execute on function public.is_family_admin() from public, anon;
revoke execute on function public.is_family_peer(uuid, boolean) from public, anon;
revoke execute on function public.family_data_owner() from public, anon;
revoke execute on function public.regenerate_family_invite() from public, anon;
revoke execute on function public.create_family(text) from public, anon;
revoke execute on function public.join_family(text) from public, anon;
grant execute on function public.my_family_id() to authenticated;
grant execute on function public.is_family_admin() to authenticated;
grant execute on function public.is_family_peer(uuid, boolean) to authenticated;
grant execute on function public.family_data_owner() to authenticated;
grant execute on function public.regenerate_family_invite() to authenticated;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;

-- ─── RLS: családi táblák ─────────────────────────────────────────────────────

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.shopping_preferences enable row level security;

-- Létrehozás csak a create_family RPC-n át (nincs insert policy).
drop policy if exists "families - select own family" on public.families;
create policy "families - select own family"
  on public.families for select
  using (id = public.my_family_id());

drop policy if exists "families - admin update" on public.families;
create policy "families - admin update"
  on public.families for update
  using (id = public.my_family_id() and public.is_family_admin())
  with check (id = public.my_family_id() and public.is_family_admin());

drop policy if exists "families - owner delete" on public.families;
create policy "families - owner delete"
  on public.families for delete
  using (owner_id = auth.uid());

-- Csatlakozás csak a join_family RPC-n át (nincs insert policy).
drop policy if exists "family_members - select own family" on public.family_members;
create policy "family_members - select own family"
  on public.family_members for select
  using (family_id = public.my_family_id());

drop policy if exists "family_members - admin update" on public.family_members;
create policy "family_members - admin update"
  on public.family_members for update
  using (family_id = public.my_family_id() and public.is_family_admin())
  with check (family_id = public.my_family_id());

-- Kilépés (saját sor) vagy admin eltávolítás; a tulajdonos sora nem törölhető
-- (a közös adatok az ő fiókja alatt vannak).
drop policy if exists "family_members - leave or admin remove" on public.family_members;
create policy "family_members - leave or admin remove"
  on public.family_members for delete
  using (
    family_id = public.my_family_id()
    and (user_id = auth.uid() or public.is_family_admin())
    and user_id <> (select f.owner_id from public.families f where f.id = family_id)
  );

drop policy if exists "shopping_preferences - select own or family" on public.shopping_preferences;
create policy "shopping_preferences - select own or family"
  on public.shopping_preferences for select
  using (user_id = auth.uid() or public.is_family_peer(user_id));

drop policy if exists "shopping_preferences - insert own or family" on public.shopping_preferences;
create policy "shopping_preferences - insert own or family"
  on public.shopping_preferences for insert
  with check (user_id = auth.uid() or public.is_family_peer(user_id, true));

drop policy if exists "shopping_preferences - update own or family" on public.shopping_preferences;
create policy "shopping_preferences - update own or family"
  on public.shopping_preferences for update
  using (user_id = auth.uid() or public.is_family_peer(user_id, true))
  with check (user_id = auth.uid() or public.is_family_peer(user_id, true));

-- A tagok lássák egymás nevét/e-mailjét (Család képernyő).
drop policy if exists "profiles - family members can view" on public.profiles;
create policy "profiles - family members can view"
  on public.profiles for select
  using (public.is_family_peer(id));

-- ─── RLS: közös bevásárló-adatok (kiegészítő családi policy-k) ───────────────

drop policy if exists "shopping_lists - family select" on public.shopping_lists;
create policy "shopping_lists - family select"
  on public.shopping_lists for select using (public.is_family_peer(user_id));
drop policy if exists "shopping_lists - family insert" on public.shopping_lists;
create policy "shopping_lists - family insert"
  on public.shopping_lists for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "shopping_lists - family update" on public.shopping_lists;
create policy "shopping_lists - family update"
  on public.shopping_lists for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "shopping_lists - family delete" on public.shopping_lists;
create policy "shopping_lists - family delete"
  on public.shopping_lists for delete using (public.is_family_peer(user_id, true));

drop policy if exists "products - family select" on public.products;
create policy "products - family select"
  on public.products for select using (public.is_family_peer(user_id));
drop policy if exists "products - family insert" on public.products;
create policy "products - family insert"
  on public.products for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "products - family update" on public.products;
create policy "products - family update"
  on public.products for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "products - family delete" on public.products;
create policy "products - family delete"
  on public.products for delete using (public.is_family_peer(user_id, true));

drop policy if exists "product_price_history - family select" on public.product_price_history;
create policy "product_price_history - family select"
  on public.product_price_history for select using (public.is_family_peer(user_id));
drop policy if exists "product_price_history - family insert" on public.product_price_history;
create policy "product_price_history - family insert"
  on public.product_price_history for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "product_price_history - family update" on public.product_price_history;
create policy "product_price_history - family update"
  on public.product_price_history for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "product_price_history - family delete" on public.product_price_history;
create policy "product_price_history - family delete"
  on public.product_price_history for delete using (public.is_family_peer(user_id, true));

drop policy if exists "shopping_statistics - family select" on public.shopping_statistics;
create policy "shopping_statistics - family select"
  on public.shopping_statistics for select using (public.is_family_peer(user_id));
drop policy if exists "shopping_statistics - family insert" on public.shopping_statistics;
create policy "shopping_statistics - family insert"
  on public.shopping_statistics for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "shopping_statistics - family update" on public.shopping_statistics;
create policy "shopping_statistics - family update"
  on public.shopping_statistics for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "shopping_statistics - family delete" on public.shopping_statistics;
create policy "shopping_statistics - family delete"
  on public.shopping_statistics for delete using (public.is_family_peer(user_id, true));
