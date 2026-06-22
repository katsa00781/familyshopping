import { supabase } from '@/lib/supabase'
import { inferCategory } from '@/lib/categories'
import type {
  MealPlanEntry,
  MealPlanEntryInput,
  MealType,
  Product,
  Recipe,
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeInput,
  ShoppingItem,
} from '@/types'

// ─── Étkezés-típusok (megjelenítési konfiguráció) ─────────────────────────────
// A meal_type érték magyar, ékezetes — a DB check-constraint ezeket fogadja el.
export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'reggeli', label: 'Reggeli' },
  { key: 'ebéd', label: 'Ebéd' },
  { key: 'vacsora', label: 'Vacsora' },
]

// ─── Hét-helperek (helyi idő, hétfő-első) ─────────────────────────────────────
const MONTHS_ABBR = [
  'jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.',
  'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.',
] as const
const WEEKDAY_FULL = [
  'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap',
] as const

/** Az adott naphoz tartozó hét hétfője (helyi idő, idő nélkül). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // hétfő = 0
  d.setDate(d.getDate() - offset)
  return d
}

/** Nap-eltolás (új Date, idő nélkül). */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** A hét 7 napja a megadott hétfőtől. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** „jún. 16–22." vagy hónaphatáron „jún. 30. – júl. 6." */
export function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const m1 = MONTHS_ABBR[monday.getMonth()]!
  if (monday.getMonth() === sunday.getMonth()) {
    return `${m1} ${monday.getDate()}–${sunday.getDate()}.`
  }
  const m2 = MONTHS_ABBR[sunday.getMonth()]!
  return `${m1} ${monday.getDate()}. – ${m2} ${sunday.getDate()}.`
}

/** ISO hétszám (1–53). */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** „Hétfő" – nap teljes neve (hétfő-indexelt). */
export function weekdayFull(date: Date): string {
  return WEEKDAY_FULL[(date.getDay() + 6) % 7]!
}

/** „jún. 16." – nap rövid dátuma. */
export function dayDateLabel(date: Date): string {
  return `${MONTHS_ABBR[date.getMonth()]!} ${date.getDate()}.`
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Receptek + hozzávalók olvasása (familybudget tábla) ──────────────────────
export async function fetchRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Recipe[]
}

// ─── Recept írása (saját recept; RLS: user_id = auth.uid()) ───────────────────
export async function insertRecipe(userId: string, input: RecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Recipe
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Recipe
}

/** Recept törlése — a hozzávalók és a hozzá kötött étrend-tételek ON DELETE CASCADE-del törlődnek. */
export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

/** A recept hozzávalóit teljesen lecseréli (régiek törlése + újak beszúrása). */
export async function replaceIngredients(
  recipeId: string,
  items: RecipeIngredientInput[],
): Promise<RecipeIngredient[]> {
  const { error: delErr } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId)
  if (delErr) throw delErr

  if (items.length === 0) return []

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert(items.map((i) => ({ ...i, recipe_id: recipeId })))
    .select('*')
  if (error) throw error
  return (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity) })) as RecipeIngredient[]
}

export async function fetchIngredients(recipeIds: string[]): Promise<RecipeIngredient[]> {
  if (recipeIds.length === 0) return []
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds)
  if (error) throw error
  return (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity) })) as RecipeIngredient[]
}

// ─── Heti terv tételei (CRUD) ─────────────────────────────────────────────────
export async function fetchMealPlanEntries(userId: string): Promise<MealPlanEntry[]> {
  const { data, error } = await supabase
    .from('meal_plan_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []) as MealPlanEntry[]
}

/** Új étrend-tétel beszúrása (egy slothoz több tétel tartozhat → nincs upsert/konfliktus). */
export async function insertMealPlanEntry(
  userId: string,
  input: MealPlanEntryInput,
): Promise<MealPlanEntry> {
  const { data, error } = await supabase
    .from('meal_plan_entries')
    .insert({ ...input, user_id: userId, created_by: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as MealPlanEntry
}

export async function deleteMealPlanEntry(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id)
  if (error) throw error
}

// ─── Bevásárlólista-generálás ─────────────────────────────────────────────────
// A kiválasztott napok tételeiből összevonja a beszerzendőket (név + egység szerint):
//  - recept-tétel → a hozzávalói, a recept alap-adagjához képest arányosítva;
//  - nyers termék-tétel → önmaga (mennyiség + egység).
// Ahol van katalógus-termék (ing.product_id / entry.product_id), a termék ára (egységár)
// és product_id is bekerül a listatételbe.
export function buildShoppingItems(
  entries: MealPlanEntry[],
  recipesById: Map<string, Recipe>,
  ingredientsByRecipe: Map<string, RecipeIngredient[]>,
  productsById: Map<string, Product>,
): ShoppingItem[] {
  type Agg = { name: string; unit: string; quantity: number; productId: string | null; price: number | null }
  const agg = new Map<string, Agg>()

  function add(rawName: string, rawUnit: string, quantity: number, productId: string | null): void {
    const name = rawName.trim()
    const unit = rawUnit.trim()
    if (!name) return
    const price = productId ? productsById.get(productId)?.price ?? null : null
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`
    const prev = agg.get(key)
    if (prev) {
      prev.quantity += quantity
      // Az első katalógus-termékhez kötött tétel ára „nyeri" az aggregátumot.
      if (prev.productId == null && productId != null) {
        prev.productId = productId
        prev.price = price
      }
    } else {
      agg.set(key, { name, unit, quantity, productId, price })
    }
  }

  for (const entry of entries) {
    if (entry.recipe_id) {
      const recipe = recipesById.get(entry.recipe_id)
      const ings = ingredientsByRecipe.get(entry.recipe_id) ?? []
      const base = recipe?.servings && recipe.servings > 0 ? recipe.servings : entry.servings
      const ratio = base > 0 ? entry.servings / base : 1
      for (const ing of ings) {
        add(ing.name, ing.unit, ing.quantity * ratio, ing.product_id)
      }
    } else if (entry.item_name) {
      add(entry.item_name, entry.unit ?? '', entry.quantity ?? 1, entry.product_id)
    }
  }

  return [...agg.values()].map((a) => ({
    id: generateId(),
    name: a.name,
    quantity: Math.round(a.quantity * 100) / 100,
    unit: a.unit,
    category: inferCategory(a.name),
    checked: false,
    price: a.price,
    product_id: a.productId,
  }))
}
