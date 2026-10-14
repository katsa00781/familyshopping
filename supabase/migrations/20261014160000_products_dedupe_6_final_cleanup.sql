-- Termék-adattisztítás 6/6: lezárás.
-- 1) A 2025-12-12-i shopping_statistics sorok (55 db, kézi bevitel, használhatatlan) törlése.
-- 2) A mentő táblák eldobása – a felhasználó jóváhagyta; ezután nincs visszaállítási pont.

delete from public.shopping_statistics
 where shopping_date = date '2025-12-12';

drop table if exists public.products_backup_20261014;
drop table if exists public.product_price_history_backup_20261014;
drop table if exists public.shopping_lists_backup_20261014;
drop table if exists public.shopping_statistics_backup_20261014;
