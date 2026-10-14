-- Termék-adattisztítás 1/2 (MÁR ALKALMAZVA a familyBudget projekten).
-- Mentő táblák + bolt-név kanonizálás márka szintre (Aldi, Lidl, Tesco, EcoFamily,
-- Hansa Italház, Müller Drogéria); BENU, Biobolt, Spar külön marad.

create table public.products_backup_20261014              as table public.products;
create table public.product_price_history_backup_20261014 as table public.product_price_history;
create table public.shopping_lists_backup_20261014        as table public.shopping_lists;
create table public.shopping_statistics_backup_20261014   as table public.shopping_statistics;

alter table public.products_backup_20261014              enable row level security;
alter table public.product_price_history_backup_20261014 enable row level security;
alter table public.shopping_lists_backup_20261014        enable row level security;
alter table public.shopping_statistics_backup_20261014   enable row level security;

create function pg_temp.canon_store(p text) returns text
language sql immutable as $$
  select case
    when p is null or btrim(p) = ''                             then null
    when lower(p) like '%aldi%'                                 then 'Aldi'
    when lower(p) like '%lidl%'                                 then 'Lidl'
    when lower(p) like '%tesco%'                                then 'Tesco'
    when lower(p) like '%ecofamily%'                            then 'EcoFamily'
    when lower(p) like '%italház%' or lower(p) like '%italhaz%' then 'Hansa Italház'
    when lower(p) like '%müller%'  or lower(p) like '%muller%'  then 'Müller Drogéria'
    else btrim(p)
  end
$$;

update public.products
   set store_name = pg_temp.canon_store(store_name)
 where store_name is distinct from pg_temp.canon_store(store_name);

update public.product_price_history
   set store_name = pg_temp.canon_store(store_name)
 where store_name is distinct from pg_temp.canon_store(store_name);

update public.shopping_statistics
   set store_name = pg_temp.canon_store(store_name)
 where store_name is distinct from pg_temp.canon_store(store_name);
