-- Termék-adattisztítás 4/4: utólagos kézi javítások a 3/3 után.
-- Egy tranzakcióban futtatandó. Visszaállítás: a *_backup_20261014 táblákból.
--
-- 1) Vajkrém: a 2026-05-29-i 250 Ft-os OCR-sor a kiszerelés (250 g) félreolvasása volt,
--    nem ár -> a sor törlődik.
-- 2) Édesburgonyás hasáb ára 1249 Ft.
-- 3) Összevonás: Trappista füstölt sajt (Aldi), Rögös túró zsírszegény 500g (Aldi).

-- 1) Hibás árhistória-sor
delete from public.product_price_history h
 using public.products p
 where h.product_id = p.id
   and p.store_name = 'Aldi' and p.name = 'Vajkrém'
   and h.price_date = date '2026-05-29'
   and h.unit_price = 250
   and h.source = 'ocr';

-- 2) Édesburgonyás hasáb ára
update public.products
   set price = 1249
 where store_name = 'Aldi' and name = 'Édesburgonyás hasáb';

-- 3) Összevonás
create temp table fuzzy_groups (gid int, store_name text, name text, canonical boolean)
  on commit drop;

insert into fuzzy_groups values
  (1,'Aldi','Trappista füstölt sajt',true), (1,'Aldi','Trappista sajt füstölt',false),
  (2,'Aldi','Rögös túró zsírszegény 500g',true), (2,'Aldi','RÖGÖS TÚRÓ ZS.SZ.500G',false);

create temp table fuzzy_rows on commit drop as
select p.id, p.user_id, p.name, p.unit, p.price, g.gid, g.name as group_name, g.canonical,
       row_number() over (partition by p.user_id, g.gid
                          order by g.canonical desc, p.last_seen_at desc nulls last,
                                   p.updated_at desc nulls last, p.id) as rn_survivor,
       row_number() over (partition by p.user_id, g.gid
                          order by p.last_seen_at desc nulls last,
                                   p.updated_at desc nulls last, p.id) as rn_recent,
       count(*) over (partition by p.user_id, g.gid) as group_size
  from public.products p
  join fuzzy_groups g on g.store_name = p.store_name and g.name = p.name;

create temp table fuzzy_map on commit drop as
select o.id as old_id, s.id as survivor_id, o.user_id, o.gid,
       (select fg.name from fuzzy_groups fg where fg.gid = o.gid and fg.canonical) as canonical_name,
       r.price as recent_price
  from fuzzy_rows o
  join fuzzy_rows s on s.user_id = o.user_id and s.gid = o.gid and s.rn_survivor = 1
  join fuzzy_rows r on r.user_id = o.user_id and r.gid = o.gid and r.rn_recent = 1
 where o.group_size > 1;

update public.product_price_history h set product_id = m.survivor_id
  from fuzzy_map m where h.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.recipe_ingredients i set product_id = m.survivor_id
  from fuzzy_map m where i.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.meal_plan_entries e set product_id = m.survivor_id
  from fuzzy_map m where e.product_id = m.old_id and m.old_id <> m.survivor_id;

update public.shopping_lists l
   set items = (
     select jsonb_agg(
              case when m.survivor_id is not null
                   then jsonb_set(t.e, '{product_id}', to_jsonb(m.survivor_id::text))
                   else t.e end
              order by t.ord)
       from jsonb_array_elements(l.items) with ordinality as t(e, ord)
       left join fuzzy_map m
              on m.old_id::text = t.e ->> 'product_id' and m.old_id <> m.survivor_id)
 where jsonb_typeof(l.items) = 'array'
   and exists (
     select 1
       from jsonb_array_elements(l.items) as x(e)
       join fuzzy_map m
         on m.old_id::text = x.e ->> 'product_id' and m.old_id <> m.survivor_id);

update public.shopping_statistics s
   set product_name = m.canonical_name
  from fuzzy_rows r
  join fuzzy_map m on m.old_id = r.id
 where s.user_id = r.user_id
   and s.product_name = r.name
   and s.store_name = 'Aldi'
   and s.product_name <> m.canonical_name;

-- Törlés ELŐBB (egyedi index), utána a túlélő átnevezése / újraárazása
delete from public.products p
 using fuzzy_map m
 where p.id = m.old_id and m.old_id <> m.survivor_id;

update public.products p
   set name  = m.canonical_name,
       price = m.recent_price
  from (select distinct survivor_id, canonical_name, recent_price from fuzzy_map) m
 where p.id = m.survivor_id
   and (p.name is distinct from m.canonical_name or p.price is distinct from m.recent_price);

update public.product_price_history h
   set product_name = p.name,
       store_name   = p.store_name
  from public.products p
 where h.product_id = p.id
   and (h.product_name is distinct from p.name or h.store_name is distinct from p.store_name);

delete from public.product_price_history h
 using (
   select id,
          row_number() over (
            partition by user_id, product_id, price_date, unit_price, quantity, total_price
            order by (source = 'ocr') desc, created_at, id
          ) as rn
     from public.product_price_history
    where product_id is not null
 ) d
 where h.id = d.id and d.rn > 1;
