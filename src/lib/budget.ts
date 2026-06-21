import { supabase } from '@/lib/supabase'
import type {
  BudgetCategorySummary,
  BudgetPlan,
  BudgetSummary,
  SavingsGoal,
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
    out.push({ name, amount })
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
  return [...map.entries()].map(([name, amount]) => ({ name, amount }))
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

// ─── Terv → összegzés ─────────────────────────────────────────────────────────
// v1 tervezési nézet: keret = actual_income ?? total_amount; allocated = Σ kategória.
// Valós „elköltött" nincs a Supabase táblákban (a Wallet rendszerben él) → nem mutatjuk.
export function summarizeBudget(plan: BudgetPlan): BudgetSummary {
  const categories = normalizeBudgetData(plan.budget_data)
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const allocated = categories.reduce((s, c) => s + c.amount, 0)
  const hasIncome = plan.actual_income != null
  const keret = hasIncome ? Number(plan.actual_income) : Number(plan.total_amount)

  return {
    keret,
    allocated,
    remaining: keret - allocated,
    hasIncome,
    categories,
  }
}
