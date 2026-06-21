// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  family_id: string | null
  created_at: string
  updated_at: string
}

// ─── Bevásárlólista ───────────────────────────────────────────────────────────
export type ItemCategory = 'Zöldség' | 'Tejtermék' | 'Hús' | 'Pékáru' | 'Egyéb'

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: ItemCategory
  checked: boolean
  price: number | null
  product_id: string | null
}

export interface ShoppingList {
  id: string
  user_id: string
  name: string
  date: string
  items: ShoppingItem[]
  total_amount: number
  completed: boolean
  store_name: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ─── Termékek ─────────────────────────────────────────────────────────────────
export interface PriceHistoryEntry {
  price: number
  store_name: string | null
  date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
}

export interface Product {
  id: string
  user_id: string
  name: string
  brand: string | null
  category: string
  store_name: string | null
  price: number | null
  unit: string
  barcode: string | null
  last_price: number | null
  price_history: PriceHistoryEntry[]
  available: boolean
  created_at: string
  updated_at: string
}

// ─── Árváltozások ─────────────────────────────────────────────────────────────
export interface ProductPriceHistory {
  id: string
  user_id: string
  product_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  price_date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── Statisztikák ─────────────────────────────────────────────────────────────
export interface ShoppingStatistic {
  id: string
  user_id: string
  shopping_list_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  shopping_date: string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── Vásárlások ───────────────────────────────────────────────────────────────
// Egy vásárlás = a shopping_statistics sorok egy csoportja (egy blokk vagy egy
// befejezett lista). Származtatott típus, nem külön tábla.
export interface Purchase {
  id: string
  store_name: string | null
  date: string
  source: ShoppingStatistic['source']
  item_count: number
  total: number
  items: ShoppingStatistic[]
}

// ─── OCR ─────────────────────────────────────────────────────────────────────
export interface OCRItem {
  name: string
  qty: number
  unit: string | null
  price: number
  conf: number
}

export interface OCRResponse {
  lines: string[]
  items: OCRItem[]
  total: number | null
  store: string | null
  date: string | null
  conf: number
}

export interface ReviewItem extends OCRItem {
  id: string
  rawName: string // amit az OCR eredetileg kiolvasott (tanuló glosszáriumhoz)
  isDuplicate: boolean
  existingProductId: string | null
  matchedProductName: string | null
  skip: boolean
}

// ─── Család ───────────────────────────────────────────────────────────────────
export type FamilyRole = 'admin' | 'member' | 'viewer'

export interface FamilyMember {
  id: string
  name: string
  email: string
  role: FamilyRole
  joinedAt: string
}

export interface Family {
  id: string
  name: string
  inviteLink: string
  inviteExpiresAt: string
  members: FamilyMember[]
}

// ─── Naptár ─────────────────────────────────────────────────────────────────
// v1: user_id-scoped (NEM family_id). A member_id/color a tagszínes megjelenítést
// szolgálja; v1-ben az esemény színét közvetlenül a `color` mező adja.
export interface CalendarEventInput {
  title: string
  description: string | null
  location: string | null
  starts_at: string // ISO timestamp (UTC)
  ends_at: string | null
  all_day: boolean
  member_id: string | null
  color: string | null
}

export interface CalendarEvent extends CalendarEventInput {
  id: string
  user_id: string
  created_by: string | null
  rrule: string | null
  created_at: string
  updated_at: string
}

// ─── Kassza (familybudget – CSAK olvasás) ─────────────────────────────────────
// A familybudget `budget_plans.budget_data` JSONB háromféle formátumot vehet fel
// (régi → új). Mindet a `normalizeBudgetData` egységesíti `BudgetCategorySummary`-vé.
export interface BudgetItem {
  category: string
  subcategory: string
  amount: number
}

export interface BudgetCategory {
  name: string
  items?: BudgetItem[]
  amount?: number
}

export interface BudgetStorageV2 {
  version?: string
  categories: BudgetCategory[]
}

export type BudgetStoragePayload = BudgetCategory[] | BudgetItem[] | BudgetStorageV2

export interface BudgetPlan {
  id: string
  user_id: string
  total_amount: number
  actual_income: number | null
  budget_data: BudgetStoragePayload | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

// Normalizált kategória-összeg (a 3 formátum bármelyikéből).
export interface BudgetCategorySummary {
  name: string
  amount: number
}

// Kezdőlap + Kassza tab tervezési nézete (v1: nincs valós „elköltött",
// csak terv-adat). keret = actual_income ?? total_amount; allocated = Σ kategória.
export interface BudgetSummary {
  keret: number
  allocated: number
  remaining: number
  hasIncome: boolean
  categories: BudgetCategorySummary[]
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  target_date: string | null
  color: string | null
  category: string | null
  created_at: string
  updated_at: string
}

// ─── Étkezéstervező ───────────────────────────────────────────────────────────
// recipes/recipe_ingredients: familybudget tábla (CSAK olvasás). A meal_plan_entries
// új, v1: user_id-scoped (NEM family_id).
export type MealType = 'reggeli' | 'ebéd' | 'vacsora'

export interface Recipe {
  id: string
  user_id: string
  name: string
  description: string | null
  prep_time: number | null // perc
  servings: number | null
  image_url: string | null
  instructions: string | null
  created_at: string | null
  updated_at: string | null
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: number
  unit: string
  created_at: string | null
}

export interface MealPlanEntryInput {
  date: string // helyi YYYY-MM-DD
  meal_type: MealType
  recipe_id: string
  servings: number
}

export interface MealPlanEntry extends MealPlanEntryInput {
  id: string
  user_id: string
  created_by: string | null
  created_at: string | null
}

// ─── UI helper típusok ────────────────────────────────────────────────────────
export interface PriceChange {
  product_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  old_price: number
  new_price: number
  change_pct: number
  change_ft: number
  date: string
}

export interface InflationByCategory {
  category: ItemCategory
  change_pct: number
  share: number
}
