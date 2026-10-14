-- Termék-adattisztítás 3/3: kézzel jóváhagyott, névelütéses / eltérő írásmódú csoportok.
-- Előfeltétel: 1/3 (mentés + bolt-nevek) és 2/3 (azonos normalizált név) lefutott.
-- Egy tranzakcióban futtatandó. Visszaállítás: a *_backup_20261014 táblákból.
--
-- Minden csoport első neve a kanonikus (ez a túlélő sor neve). A túlélő egysége a
-- saját egysége marad, ára a csoport legutóbb látott sorának ára.
-- Kihagyva (külön termék): Sertés bécsi szelet/szeletelt, Roberto toast / toast kenyér,
-- Joghurt (679 Ft), Teljes kiőrlésű csirkemellsonka, Paradicsom-félék.
-- Az „Édesburgonya 500g" a „Édesburgonyás hasáb" termékbe olvad.
-- A Magnum vegán mangó / vegan mango már nem kapható: a termék és az árhistóriája törlődik
-- (a shopping_statistics vásárlási sorai megmaradnak).

-- Ide tartozik a bolt nélküli „MAGNUM VEGYI JÉGKRÉM 90ML" is.
delete from public.product_price_history
 where product_id in (select id from public.products
                       where (store_name = 'Aldi'
                              and name in ('Magnum vegán mangó', 'Magnum vegan mango'))
                          or (store_name is null and name = 'MAGNUM VEGYI JÉGKRÉM 90ML'))
    or (store_name = 'Aldi' and product_name in ('Magnum vegán mangó', 'Magnum vegan mango'))
    or (store_name is null and product_name = 'MAGNUM VEGYI JÉGKRÉM 90ML');

delete from public.products
 where (store_name = 'Aldi' and name in ('Magnum vegán mangó', 'Magnum vegan mango'))
    or (store_name is null and name = 'MAGNUM VEGYI JÉGKRÉM 90ML');

create temp table fuzzy_groups (gid int, store_name text, name text, canonical boolean)
  on commit drop;

insert into fuzzy_groups values
  -- A csoport
  (1,'Aldi','Trappista light sajt',true), (1,'Aldi','Trappista sajt light',false),
  (1,'Aldi','Trappista light sajt 125g',false), (1,'Aldi','TRAPPISTA SAJT LIGHT 125G',false),
  (2,'Aldi','Csirkemell sonka 92%',true), (2,'Aldi','Csirkemell sonka 92% 150g',false),
  (3,'Aldi','Vajkrém',true), (3,'Aldi','vajkrém',false), (3,'Aldi','VAJKRÉM 250G',false),
  (4,'Aldi','Laktózmentes túró',true), (4,'Aldi','TÚRÓ LAKTÓZMENTES',false),
  (5,'Aldi','Meggyes párna',true), (5,'Aldi','Meggyes párna 108g',false),
  (6,'Aldi','Mosogatógép tabletta',true), (6,'Aldi','Mosogatógép tabletta 70db',false),
  (7,'Aldi','Pizza twist',true), (7,'Aldi','Pizza twist 100g',false),
  (8,'Aldi','Light majonéz',true), (8,'Aldi','LIGHT MAJONÉZ 480G',false),
  (9,'Aldi','Zöldborsó',true), (9,'Aldi','Zöldborsó 450g',false),
  (10,'Aldi','Pur-Pur vekni',true), (10,'Aldi','Pur-Pur vekni 500g',false),
  (11,'Aldi','Burgonyás pogácsa',true), (11,'Aldi','Burgonyás pogácsa 77g',false),
  (12,'Aldi','Szentkirályi Csepp',true), (12,'Aldi','Szentkirályi Csepp ásványvíz',false),
  (12,'Aldi','Szentkirályi cseppmentes 1.5L',false),
  (13,'Aldi','Burgonya étkezési',true), (13,'Aldi','Burgonya étk.',false),
  (13,'Aldi','Burgonya étkezési sárga 2kg',false),
  (14,'Aldi','Purpur szilvás',true), (14,'Aldi','Purpur szilvas párna',false),
  (14,'Aldi','Pur-Pur szilvás párnácska 100g',false),
  (15,'Lidl','Boo Görög fetasajt',true), (15,'Lidl','Görög fetasajt',false),
  -- B csoport
  (16,'Aldi','Teljes kiőrlésű csirkemell',true), (16,'Aldi','TELJES KIŐRLÉSŰ CSIRKE',false),
  (17,'Aldi','Teljes kiőrlésű panírozott csirkemell',true),
  (17,'Aldi','Teljes kiőrlésű panírozott rántott csirkemell',false),
  (18,'Aldi','Édesburgonyás hasáb',true), (18,'Aldi','ÉDESBURGONYA HASÁB 500G',false),
  (18,'Aldi','Édesburgonya 500g',false),
  (19,'Aldi','Joghurt LF',true), (19,'Aldi','JOGHURT 250G LF',false),
  (21,'Tesco','Kinley Gyömbér Zero',true), (21,'Tesco','Kinley',false);

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

-- Hivatkozók átkötése
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

-- Statisztika-sorok neve a kanonikus névre (név + bolt alapján, nincs FK)
update public.shopping_statistics s
   set product_name = m.canonical_name
  from fuzzy_rows r
  join fuzzy_map m on m.old_id = r.id
 where s.user_id = r.user_id
   and s.product_name = r.name
   and s.store_name = (select p.store_name from public.products p where p.id = r.id)
   and s.product_name <> m.canonical_name;

-- Duplikált termékek törlése, majd a túlélő átnevezése / újraárazása
-- (törlés ELŐBB, hogy az egyedi index ne ütközzön)
delete from public.products p
 using fuzzy_map m
 where p.id = m.old_id and m.old_id <> m.survivor_id;

update public.products p
   set name  = m.canonical_name,
       price = m.recent_price
  from (select distinct survivor_id, canonical_name, recent_price from fuzzy_map) m
 where p.id = m.survivor_id
   and (p.name is distinct from m.canonical_name or p.price is distinct from m.recent_price);

-- Árhistória: név/bolt igazítás a termékhez, majd azonos sorok deduplikálása
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
