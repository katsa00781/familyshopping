-- Tagonkénti, több tételes étrend + recept-hozzávaló ↔ termékkatalógus összekötés.
--
-- 1) recipe_ingredients.product_id: egy hozzávaló a familyshopping `products`
--    katalógus egy sorához köthető → a bevásárlólista-generáláskor a termék ára is
--    bekerül. ON DELETE SET NULL: termék törlése nem törli a hozzávalót.
--
-- 2) meal_plan_entries: az eddigi „egy slot = egy recept" modellt felváltja a
--    „egy slot = több tétel, tagonként" modell. Egy tétel vagy receptre (recipe_id),
--    vagy nyers termékre (item_name + quantity + unit, opcionálisan product_id-vel
--    a katalógusból) mutat. A member_id a LOKÁLIS tag-store azonosítója (v1: a tagok
--    appban, AsyncStorage-ban élnek; nincs DB-oldali családtag-tábla).

-- 1) Recept-hozzávaló ↔ termék
alter table public.recipe_ingredients
  add column if not exists product_id uuid references public.products (id) on delete set null;

-- 2) meal_plan_entries átalakítás
alter table public.meal_plan_entries
  drop constraint if exists meal_plan_entries_user_id_date_meal_type_key;

alter table public.meal_plan_entries
  alter column recipe_id drop not null;

alter table public.meal_plan_entries
  add column if not exists member_id  text null,
  add column if not exists item_name  text null,
  add column if not exists product_id uuid null references public.products (id) on delete set null,
  add column if not exists quantity   numeric null,
  add column if not exists unit       text null;

-- Egy tétel vagy receptre, vagy nyers termékre mutat (legalább az egyik kötelező).
alter table public.meal_plan_entries
  drop constraint if exists meal_plan_entries_kind_check;
alter table public.meal_plan_entries
  add constraint meal_plan_entries_kind_check
  check (recipe_id is not null or item_name is not null);
