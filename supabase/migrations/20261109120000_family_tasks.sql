-- FamilyHub családi feladatlista (2026-11-09).
--
-- `family_tasks`: közös teendők (mit, kinek a dolga, opcionális határidő, 1 fotó).
-- A naptárral azonos adatgazda-modell: a sorok a család tulajdonosának user_id-ja
-- alatt élnek, a tagok a családi RLS policy-kon át olvassák/írják (viewer csak
-- olvas). Lásd 20261106102748_family_sharing.sql (`is_family_peer`).
--
-- `assignee_id` → `household_members.id` (null = „Közös"). Nincs FK, mert a
-- taglista kliens-oldali id-kkel szinkronizál (mint `calendar_events.member_id`).
--
-- Fotó: privát `task-photos` bucket, útvonal `{adatgazda user_id}/{task id}-{timestamp}.jpg`.
-- A storage policy-k az útvonal első mappáját (adatgazda) vetik össze a családdal.
--
-- Újrafuttatható (idempotens).

create table if not exists public.family_tasks (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade, -- adatgazda
  created_by   uuid references auth.users (id) on delete set null,
  title        text not null,
  notes        text,
  assignee_id  uuid,
  due_at       timestamptz,
  due_has_time boolean not null default false,
  photo_path   text,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists family_tasks_user_idx
  on public.family_tasks (user_id, completed_at, due_at);

drop trigger if exists update_family_tasks_updated_at on public.family_tasks;
create trigger update_family_tasks_updated_at
  before update on public.family_tasks
  for each row execute function public.update_updated_at_column();

alter table public.family_tasks enable row level security;

drop policy if exists "family_tasks - own" on public.family_tasks;
create policy "family_tasks - own"
  on public.family_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "family_tasks - family select" on public.family_tasks;
create policy "family_tasks - family select"
  on public.family_tasks for select using (public.is_family_peer(user_id));
drop policy if exists "family_tasks - family insert" on public.family_tasks;
create policy "family_tasks - family insert"
  on public.family_tasks for insert with check (public.is_family_peer(user_id, true));
drop policy if exists "family_tasks - family update" on public.family_tasks;
create policy "family_tasks - family update"
  on public.family_tasks for update
  using (public.is_family_peer(user_id, true)) with check (public.is_family_peer(user_id, true));
drop policy if exists "family_tasks - family delete" on public.family_tasks;
create policy "family_tasks - family delete"
  on public.family_tasks for delete using (public.is_family_peer(user_id, true));

-- ─── Storage: feladat-fotók ──────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-photos', 'task-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

-- Az útvonal első mappája az adatgazda user_id-ja. Hibás (nem uuid) mappanévnél a
-- regex-szűrés miatt nincs cast-hiba, egyszerűen nem illeszkedik.
create or replace function public.task_photo_owner(object_name text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end
$$;

drop policy if exists "task-photos - select" on storage.objects;
create policy "task-photos - select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-photos'
    and (
      public.task_photo_owner(name) = auth.uid()
      or public.is_family_peer(public.task_photo_owner(name))
    )
  );

drop policy if exists "task-photos - insert" on storage.objects;
create policy "task-photos - insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-photos'
    and (
      public.task_photo_owner(name) = auth.uid()
      or public.is_family_peer(public.task_photo_owner(name), true)
    )
  );

drop policy if exists "task-photos - update" on storage.objects;
create policy "task-photos - update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-photos'
    and (
      public.task_photo_owner(name) = auth.uid()
      or public.is_family_peer(public.task_photo_owner(name), true)
    )
  )
  with check (
    bucket_id = 'task-photos'
    and (
      public.task_photo_owner(name) = auth.uid()
      or public.is_family_peer(public.task_photo_owner(name), true)
    )
  );

drop policy if exists "task-photos - delete" on storage.objects;
create policy "task-photos - delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-photos'
    and (
      public.task_photo_owner(name) = auth.uid()
      or public.is_family_peer(public.task_photo_owner(name), true)
    )
  );
