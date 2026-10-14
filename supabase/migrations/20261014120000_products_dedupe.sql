-- Termék-adattisztítás 2/2: duplikált termékek összevonása.
-- Előfeltétel: az 1/2 migráció (mentő táblák + bolt-nevek) már lefutott.
-- Egy tranzakcióban futtatandó (Supabase SQL editor / apply_migration).
--
-- 1) Azonos (bolt, normalizált név) termékek összevonása egy túlélő sorra – kivéve a
--    kézzel kizárt, bizonytalan csoportokat (Vajkrém, Magnum vegan mangó, Basmati rizs).
-- 2) Hivatkozók átkötése: árhistória, recipe_ingredients, meal_plan_entries,
--    shopping_lists.items[].product_id.
-- 3) A bolt nélküli (product_id NULL) árhistória-sorok hozzákötése, ha a normalizált
--    név pontosan egy termékre illik.
-- 4) Azonos árhistória-sorok deduplikálása (a különböző árúak maradnak = árváltozás).
--
-- Az egyedi index szándékosan külön migrációban van (20261014120100).
-- Visszaállítás: a *_backup_20261014 táblákból.

create function pg_temp.norm_name(p text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      lower(translate(coalesce(p, ''), 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ', 'aeiooouuuaeiooouuu')),
      '[^[:alnum:] ]', '', 'g'),
    '\s+', ' ', 'g'))
$$;

-- 1) Duplikált termékek -> túlélő ----------------------------------------------
-- Kézzel kizárt (bizonytalan, külön termékként kezelt) csoportok: (bolt, normalizált név)
create temp table excluded_groups (store_name text, nn text) on commit drop;
insert into excluded_groups values
  ('Aldi', 'vajkrem'),
  ('Aldi', 'magnum vegan mango'),
  ('Lidl', 'basmati rizs');

create temp table product_ranked on commit drop as
select p.id,
       p.user_id,
       p.store_name,
       pg_temp.norm_name(p.name) as nn,
       p.name,
       p.price,
       p.unit,
       row_number() over (
         partition by p.user_id, coalesce(p.store_name, ''), pg_temp.norm_name(p.name)
         order by (p.name = upper(p.name)),            -- csupa nagybetűs a végére
                  (p.name = lower(p.name)),            -- csupa kisbetűs a végére
                  p.last_seen_at desc nulls last,
                  p.updated_at   desc nulls last,
                  p.id
       ) as rn_name,                                   -- legszebb írásmódú
       row_number() over (
         partition by p.user_id, coalesce(p.store_name, ''), pg_temp.norm_name(p.name)
         order by p.last_seen_at desc nulls last,
                  p.updated_at   desc nulls last,
                  p.id
       ) as rn_recent,                                 -- legutóbbi ár / egység
       count(*) over (
         partition by p.user_id, coalesce(p.store_name, ''), pg_temp.norm_name(p.name)
       ) as group_size
  from public.products p
 where not exists (
         select 1 from excluded_groups e
          where e.store_name is not distinct from p.store_name
            and e.nn = pg_temp.norm_name(p.name));

-- Túlélő = a legszebb írásmódú sor; a termék ára/egysége a legutóbbi sorból jön.
create temp table product_map on commit drop as
select o.id as old_id,
       s.id as survivor_id,
       s.user_id,
       s.store_name,
       s.nn,
       s.name as survivor_name,
       r.price as recent_price,
       r.unit  as recent_unit
  from product_ranked o
  join product_ranked s on s.user_id = o.user_id
                       and s.store_name is not distinct from o.store_name
                       and s.nn = o.nn
                       and s.rn_name = 1
  join product_ranked r on r.user_id = o.user_id
                       and r.store_name is not distinct from o.store_name
                       and r.nn = o.nn
                       and r.rn_recent = 1
 where o.group_size > 1;

update public.products p
   set name  = m.survivor_name,
       price = m.recent_price,
       unit  = m.recent_unit
  from (select distinct survivor_id, survivor_name, recent_price, recent_unit from product_map) m
 where p.id = m.survivor_id;

-- 2) Hivatkozók átkötése ------------------------------------------------------
update public.product_price_history h
   set product_id = m.survivor_id
  from product_map m
 where h.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.recipe_ingredients i
   set product_id = m.survivor_id
  from product_map m
 where i.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.meal_plan_entries e
   set product_id = m.survivor_id
  from product_map m
 where e.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.shopping_lists l
   set items = (
     select jsonb_agg(
              case when m.survivor_id is not null
                   then jsonb_set(t.e, '{product_id}', to_jsonb(m.survivor_id::text))
                   else t.e end
              order by t.ord)
       from jsonb_array_elements(l.items) with ordinality as t(e, ord)
       left join product_map m
              on m.old_id::text = t.e ->> 'product_id' and m.old_id <> m.survivor_id)
 where jsonb_typeof(l.items) = 'array'
   and exists (
     select 1
       from jsonb_array_elements(l.items) as x(e)
       join product_map m
         on m.old_id::text = x.e ->> 'product_id' and m.old_id <> m.survivor_id);

-- Duplikált termékek törlése (a hivatkozók már a túlélőre mutatnak)
delete from public.products p
 using product_map m
 where p.id = m.old_id and m.old_id <> m.survivor_id;

-- 3) Bolt nélküli / árva árhistória-sorok hozzákötése -------------------------
-- Csak akkor, ha a normalizált név pontosan egy termékre illik (és a bolt nem ellentmond).
update public.product_price_history h
   set product_id = c.id,
       store_name = c.store_name
  from (
    select h2.id as hid, min(p.id::text)::uuid as id, min(p.store_name) as store_name
      from public.product_price_history h2
      join public.products p
        on p.user_id = h2.user_id
       and pg_temp.norm_name(p.name) = pg_temp.norm_name(h2.product_name)
       and (h2.store_name is null or p.store_name is not distinct from h2.store_name)
     where h2.product_id is null
     group by h2.id
    having count(distinct p.id) = 1
  ) c
 where h.id = c.hid;

-- Az összevont termékek előzménysorainak név/bolt értéke a túlélőéhez igazodik.
update public.product_price_history h
   set product_name = p.name,
       store_name   = p.store_name
  from public.products p
 where h.product_id = p.id
   and (h.product_name is distinct from p.name or h.store_name is distinct from p.store_name);

update public.shopping_statistics s
   set product_name = m.survivor_name
  from (select distinct user_id, store_name, nn, survivor_name from product_map) m
 where s.user_id = m.user_id
   and s.store_name is not distinct from m.store_name
   and pg_temp.norm_name(s.product_name) = m.nn
   and s.product_name <> m.survivor_name;

-- 4) Azonos árhistória-sorok deduplikálása -------------------------------------
-- Azonos termék + nap + egységár + mennyiség + összeg = ugyanaz a vásárlás kétszer
-- (pl. lista + OCR); a különböző árú sorok maradnak (ezek az árváltozás).
delete from public.product_price_history h
 using (
   select id,
          row_number() over (
            partition by user_id,
                         coalesce(product_id::text, pg_temp.norm_name(product_name)),
                         price_date, unit_price, quantity, total_price
            order by (source = 'ocr') desc, created_at, id
          ) as rn
     from public.product_price_history
 ) d
 where h.id = d.id and d.rn > 1;
