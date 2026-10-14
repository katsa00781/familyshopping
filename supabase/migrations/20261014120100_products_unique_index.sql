-- Egy boltból egy termék egy néven (és egységgel): az app upsertProduct a 23505
-- hibát DUPLICATE-ként kezeli. Csak a 20261014120000_products_dedupe UTÁN alkalmazható.

create unique index if not exists products_user_store_name_unit_uniq
  on public.products (user_id, coalesce(store_name, ''), lower(name), unit);
