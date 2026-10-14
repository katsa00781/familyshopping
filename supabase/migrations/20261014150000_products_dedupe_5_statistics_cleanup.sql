-- Termék-adattisztítás 5/5: shopping_statistics bolt-nevek + kézi javítások.
-- Egy tranzakcióban futtatandó. Visszaállítás: a *_backup_20261014 táblákból
-- (a shopping_statistics_backup_20261014 az 1/5 lépésben készült).

-- 1) Rossz árú, bolt nélküli, előzmény nélküli termék törlése
delete from public.products p
 where p.store_name is null
   and p.name = 'TRAPPISTA FÜSTÖLT SAJT 125G'
   and not exists (select 1 from public.product_price_history h where h.product_id = p.id);

-- 2) 2025-10-19: a „34. SZ. ÜZLET" 8 sora ugyanaz a nyugta, mint a „CBA" 10 sora
--    (duplán számolt vásárlás) -> a 34. SZ. ÜZLET-es sorok törlődnek, a CBA marad.
delete from public.shopping_statistics
 where store_name = '34. SZ. ÜZLET'
   and shopping_date = date '2025-10-19';

-- 3) 2025-12-12: a mennyiség grammban (100–400) lett beolvasva, ezért az összeg
--    többszázezres. Javítás: mennyiség 1, összeg = egységár.
update public.shopping_statistics
   set quantity    = 1,
       total_price = unit_price
 where store_name = '34. SZ. ÜZLET'
   and shopping_date = date '2025-12-12'
   and quantity >= 100;

-- 4) Bolt-nevek rendezése
update public.shopping_statistics set store_name = 'Lidl'   where store_name = 'NEMZETI BOLT';
update public.shopping_statistics set store_name = 'Glória' where store_name = 'GLÓRIA';

-- Ismeretlen bolt -> NULL (a megmaradt 34. SZ. ÜZLET sorok 2025-12-12-ről valók)
update public.shopping_statistics
   set store_name = null
 where store_name in ('34. SZ. ÜZLET', 'NYUGTA', 'NEM MEGADOTT', 'BOLT NEVE NEM OLVASHATÓ');
