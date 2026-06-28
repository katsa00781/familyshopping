import { supabase } from '@/lib/supabase'
import type {
  BudgetCategorySummary,
  BudgetPlan,
  BudgetSummary,
  SavingsGoal,
  WalletCategoryDetail,
  WalletSpending,
} from '@/types'

// ─── Apró, biztonságos parserek (any tilos) ───────────────────────────────────
function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim().length > 0 ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

// ─── budget_data normalizálás ─────────────────────────────────────────────────
// A familybudget `budget_data` három formátumot vehet fel; mindet egységes
// `BudgetCategorySummary[]`-vé alakítjuk (kategórianév + összeg).
//   1. BudgetItem[]            – [{ category, subcategory, amount }]
//   2. BudgetCategory[]        – [{ name, items?, amount? }]
//   3. { categories: [...] }   – v2 wrapper (verziómezővel)
export function normalizeBudgetData(raw: unknown): BudgetCategorySummary[] {
  // 3. v2 wrapper: { version?, categories: [...] }
  const obj = asRecord(raw)
  if (obj && Array.isArray(obj['categories'])) {
    return normalizeCategoryArray(obj['categories'])
  }

  if (Array.isArray(raw)) {
    // 2. kategória-tömb vs. 1. tétel-tömb megkülönböztetése az első elem alapján.
    const first = asRecord(raw[0])
    if (first && ('name' in first || 'items' in first)) {
      return normalizeCategoryArray(raw)
    }
    return normalizeItemArray(raw)
  }

  return []
}

function normalizeCategoryArray(cats: unknown[]): BudgetCategorySummary[] {
  const out: BudgetCategorySummary[] = []
  for (const c of cats) {
    const rec = asRecord(c)
    if (!rec) continue
    const name = asString(rec['name'], 'Egyéb')
    let amount = 0
    if (Array.isArray(rec['items'])) {
      for (const it of rec['items']) {
        const itr = asRecord(it)
        if (itr) amount += asNumber(itr['amount'])
      }
    } else {
      amount = asNumber(rec['amount'])
    }
    out.push({ name, amount, spent: 0, walletCategories: asStringArray(rec['walletCategories']) })
  }
  return out
}

function normalizeItemArray(items: unknown[]): BudgetCategorySummary[] {
  const map = new Map<string, number>()
  for (const it of items) {
    const rec = asRecord(it)
    if (!rec) continue
    const cat = asString(rec['category'], 'Egyéb')
    map.set(cat, (map.get(cat) ?? 0) + asNumber(rec['amount']))
  }
  // A tétel-tömb (régi formátum) nem hordoz Wallet-mappinget → nincs valós költés-join.
  return [...map.entries()].map(([name, amount]) => ({ name, amount, spent: 0, walletCategories: [] }))
}

// ─── Aktuális havi terv lekérése ──────────────────────────────────────────────
// Sorrend: user_preferences.active_budget_plan_id → is_active = true → legutóbbi.
export async function getCurrentBudgetPlan(userId: string): Promise<BudgetPlan | null> {
  const { data: pref } = await supabase
    .from('user_preferences')
    .select('active_budget_plan_id')
    .eq('user_id', userId)
    .maybeSingle()

  const activeId = (pref as { active_budget_plan_id: string | null } | null)?.active_budget_plan_id
  if (activeId) {
    const { data } = await supabase
      .from('budget_plans')
      .select('*')
      .eq('id', activeId)
      .maybeSingle()
    if (data) return data as BudgetPlan
  }

  const { data: active } = await supabase
    .from('budget_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
  if (active && active[0]) return active[0] as BudgetPlan

  const { data: recent } = await supabase
    .from('budget_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  return (recent?.[0] as BudgetPlan | undefined) ?? null
}

// ─── Megtakarítási célok ──────────────────────────────────────────────────────
export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as SavingsGoal[]).map((g) => ({
    ...g,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
  }))
}

// ─── Valós havi költés (Wallet REST proxy) ────────────────────────────────────
// Az aktuális hónap első napja YYYY-MM-DD (helyi idő szerint).
export function currentMonthStart(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

// A wallet-spending Edge Function hívása. A token szerver oldalon él; itt csak a
// Supabase JWT-vel hitelesítünk (a `functions.invoke` automatikusan csatolja).
export async function getWalletSpending(month: string): Promise<WalletSpending | null> {
  const { data, error } = await supabase.functions.invoke('wallet-spending', {
    body: { month },
  })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  const d = data as Partial<WalletSpending>
  if (!d.byCategory || typeof d.byCategory !== 'object') return null
  return {
    month: typeof d.month === 'string' ? d.month : month,
    currency: typeof d.currency === 'string' ? d.currency : 'HUF',
    byCategory: d.byCategory,
    totalSpent: asNumber(d.totalSpent),
    totalIncome: asNumber(d.totalIncome),
    syncedAt: typeof d.syncedAt === 'string' ? d.syncedAt : new Date().toISOString(),
  }
}

// Egy terv-kategória lebontása (Wallet-alkategória csoportok + tételek) az adott hónapra.
export async function getWalletSpendingDetail(
  month: string,
  category: string,
): Promise<WalletCategoryDetail | null> {
  const { data, error } = await supabase.functions.invoke('wallet-spending', {
    body: { month, detail: category },
  })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  const d = data as Partial<WalletCategoryDetail>
  if (!Array.isArray(d.groups)) return null
  return {
    month: typeof d.month === 'string' ? d.month : month,
    category: typeof d.category === 'string' ? d.category : category,
    currency: typeof d.currency === 'string' ? d.currency : 'HUF',
    total: asNumber(d.total),
    groups: d.groups,
    syncedAt: typeof d.syncedAt === 'string' ? d.syncedAt : new Date().toISOString(),
  }
}

// ─── Terv → összegzés ─────────────────────────────────────────────────────────
// Keret prioritás: tényleges bevétel (Wallet totalIncome) → actual_income → total_amount.
// Ha van tényleges bevétel-adat (hasActualIncome), azt vesszük alapnak — a tervezett
// összeg csak fallback (amikor a Wallet token nincs beállítva vagy a hónap elején 0).
export function summarizeBudget(
  plan: BudgetPlan,
  spending?: WalletSpending | null,
): BudgetSummary {
  const byCat = spending?.byCategory ?? null
  const hasSpending = byCat != null

  const totalIncome = spending?.totalIncome ?? 0
  const hasActualIncome = hasSpending && totalIncome > 0

  const categories = normalizeBudgetData(plan.budget_data)
    .filter((c) => c.amount > 0)
    .map((c) => ({
      ...c,
      spent: byCat ? (byCat[c.name] ?? 0) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const allocated = categories.reduce((s, c) => s + c.amount, 0)
  const hasIncome = plan.actual_income != null
  // A tervezett keret (remaining számításhoz): actual_income → total_amount
  const plannedKeret = hasIncome ? Number(plan.actual_income) : Number(plan.total_amount)
  // A tényleges keret: ha van Wallet bevétel-adat, azt használjuk; különben a terv
  const keret = hasActualIncome ? totalIncome : plannedKeret

  const totalSpent = hasSpending ? Number(spending?.totalSpent ?? 0) : 0

  return {
    keret,
    allocated,
    totalSpent,
    totalIncome,
    remaining: plannedKeret - allocated,
    remainingAfterSpent: keret - totalSpent,
    hasIncome,
    hasSpending,
    hasActualIncome,
    categories,
  }
}
