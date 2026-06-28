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
  rawName: string // a blokkon betűhíven szereplő szöveg (tanuló glosszárium kulcsa)
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
  suggestedName: string // a modell eredeti (tiszta) javaslata — ehhez mérjük, hogy a user javított-e
  isDuplicate: boolean
  existingProductId: string | null
  matchedProductName: string | null
  skip: boolean
}

// ─── Család ───────────────────────────────────────────────────────────────────
// v1: a családtagok lokálisak (AsyncStorage), nincs DB-oldali tábla. Az étrend +
// (később) a naptár tagszínes megjelenítését szolgálják. A `color` a memberColors
// készletből való hex.
export interface FamilyMemberLocal {
  id: string
  name: string
  color: string
}

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
  member_id: string | null // a lokális tag-store azonosítója (null = közös/mindenki)
  color: string | null
  rrule: string | null // ismétlődés (RFC 5545 részhalmaz); null = egyszeri
}

export interface CalendarEvent extends CalendarEventInput {
  id: string
  user_id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─── Műszakbeosztás (lokális sablon → naptáreseményeket generál) ───────────────
// v1: a sablon lokális (AsyncStorage), a generált események viszont valódi
// `calendar_events` sorok (heti ismétlődés, INTERVAL = ciklus hossza hétben). A
// `generatedEventIds` a legutóbbi generálás eseményeit tartja számon (frissítés/
// törlés ezeket cseréli/törli).
export interface ShiftType {
  id: string
  name: string // pl. „Délelőttös"
  startMinutes: number // perc éjféltől (pl. 360 = 06:00)
  endMinutes: number // perc éjféltől; ha <= start → másnap (éjszakai műszak)
  color: string
}

export interface ShiftSchedule {
  cycleWeeks: number // a ciklus hossza hetekben (pl. 6)
  anchorDate: string // helyi YYYY-MM-DD, a ciklus 1. hetének hétfője
  memberId: string | null // melyik családtaghoz (szín/hozzárendelés)
  days: (string | null)[] // hossz = cycleWeeks*7; index → ShiftType.id vagy null (pihenő)
  generatedEventIds: string[] // a legutóbbi generálás calendar_events id-jei
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
  // A familybudget terv-kategóriához rendelt Wallet-kategória UUID-k. (Megjegyzés:
  // ezek az ID-k elavultak / nem egyeznek az élő Wallet kategóriákkal, ezért a valós
  // költés-join NEM ezek mentén, hanem terv-kategória NÉV szerint történik — a
  // Wallet→terv koncepció-mapping a wallet-spending Edge Functionben él.)
  walletCategories?: string[]
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
// `amount` = betervezett keret; `spent` = valós (Wallet) költés a hónapban
// (0, ha nincs spending adat); `walletCategories` = a join-hoz használt UUID-k.
export interface BudgetCategorySummary {
  name: string
  amount: number
  spent: number
  walletCategories: string[]
}

// A Wallet REST-ből (wallet-spending Edge Function) érkező valós havi költés.
// A függvény a Wallet→terv koncepció-mapping mentén már TERV-KATEGÓRIA NÉV szerint
// összegzett (belső átvezetések kihagyva), így a kliens egyszerű név-join-nal köti be.
export interface WalletSpending {
  month: string // YYYY-MM-DD, a hónap első napja
  currency: string // 'HUF'
  byCategory: Record<string, number> // terv-kategória neve → elköltött (pozitív, Ft)
  totalSpent: number
  totalIncome: number // tényleges havi bevétel összege (0 ha nem sikerült lekérni)
  syncedAt: string
}

// Egy terv-kategória lebontása (a wallet-spending `detail` módja): Wallet-alkategória
// csoportok, azon belül a konkrét tételek. A koppintásos részletező nézethez.
export interface WalletSpendingRecord {
  label: string // jegyzet / partner / alkategória
  amount: number // pozitív, Ft
  date: string // ISO időbélyeg (recordDate)
}

export interface WalletSpendingGroup {
  subCategory: string // magyar alkategória-címke
  total: number
  records: WalletSpendingRecord[]
}

export interface WalletCategoryDetail {
  month: string
  category: string // terv-kategória neve
  currency: string
  total: number
  groups: WalletSpendingGroup[]
  syncedAt: string
}

// Kezdőlap + Kassza tab összegzése.
//   keret            = totalIncome (ha > 0) → actual_income → total_amount (terv)
//   allocated        = Σ betervezett kategória
//   totalSpent       = Σ valós kiadás (Wallet, 0 ha nincs adat)
//   totalIncome      = tényleges havi bevétel (Wallet, 0 ha nincs adat)
//   remaining        = tervezett keret − allocated
//   remainingAfterSpent = keret − totalSpent (valós szabad keret)
//   hasIncome        = van-e actual_income a tervben
//   hasSpending      = van-e élő Wallet kiadás-adat
//   hasActualIncome  = van-e tényleges bevétel-adat (totalIncome > 0)
export interface BudgetSummary {
  keret: number
  allocated: number
  totalSpent: number
  totalIncome: number
  remaining: number
  remainingAfterSpent: number
  hasIncome: boolean
  hasSpending: boolean
  hasActualIncome: boolean
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
  product_id: string | null // a familyshopping `products` katalógus sora (ár a listához)
  created_at: string | null
}

// Recept létrehozás/szerkesztés bemenete (v1: user_id-scoped, saját receptek írhatók).
export interface RecipeInput {
  name: string
  description: string | null
  prep_time: number | null // perc
  servings: number | null
  instructions: string | null
}

export interface RecipeIngredientInput {
  name: string
  quantity: number
  unit: string
  product_id: string | null
}

// Egy étrend-tétel vagy receptre (recipe_id), vagy nyers termékre (item_name +
// quantity + unit, opcionálisan product_id-vel a katalógusból) mutat. A member_id a
// lokális tag-store azonosítója (v1: a tagok appban élnek, nincs DB-családtábla);
// null = közös/mindenki.
export interface MealPlanEntryInput {
  date: string // helyi YYYY-MM-DD
  meal_type: MealType
  member_id: string | null
  recipe_id: string | null
  servings: number
  item_name: string | null
  product_id: string | null
  quantity: number | null
  unit: string | null
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
