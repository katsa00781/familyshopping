-- OCR tanuló réteg: a felhasználó kézi javításait tároljuk, és az ocr-receipt
-- Edge Function ezekből glosszáriumot injektál a vision promptba.

create table if not exists public.ocr_corrections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  raw_name       text not null,            -- amit az OCR eredetileg kiolvasott (normalizált, nagybetűs)
  corrected_name text not null,            -- amire a felhasználó javította
  unit           text,
  use_count      integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, raw_name, corrected_name)
);

create index if not exists ocr_corrections_user_freq_idx
  on public.ocr_corrections (user_id, use_count desc);

alter table public.ocr_corrections enable row level security;

create policy "ocr_corrections - select own"
  on public.ocr_corrections for select
  using (auth.uid() = user_id);

create policy "ocr_corrections - insert own"
  on public.ocr_corrections for insert
  with check (auth.uid() = user_id);

create policy "ocr_corrections - update own"
  on public.ocr_corrections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ocr_corrections - delete own"
  on public.ocr_corrections for delete
  using (auth.uid() = user_id);

-- Atomikus rögzítés: új javítás beszúrása, ismétlésnél a use_count növelése.
-- security invoker → auth.uid() a hívó usert adja, és az RLS is érvényesül.
create or replace function public.record_ocr_correction(
  p_raw       text,
  p_corrected text,
  p_unit      text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(trim(p_raw), '') = '' or coalesce(trim(p_corrected), '') = '' then
    return;
  end if;

  insert into public.ocr_corrections (user_id, raw_name, corrected_name, unit)
  values (auth.uid(), upper(trim(p_raw)), trim(p_corrected), p_unit)
  on conflict (user_id, raw_name, corrected_name)
  do update set
    use_count  = public.ocr_corrections.use_count + 1,
    unit       = coalesce(excluded.unit, public.ocr_corrections.unit),
    updated_at = now();
end;
$$;
