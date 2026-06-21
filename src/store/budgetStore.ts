import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getSessionSafe } from '@/lib/supabase'
import { getCurrentBudgetPlan, getSavingsGoals, summarizeBudget } from '@/lib/budget'
import type { BudgetPlan, BudgetSummary, SavingsGoal } from '@/types'

const CACHE_KEY = 'familyhub_budget_v1'

interface BudgetState {
  plan: BudgetPlan | null
  savingsGoals: SavingsGoal[]
  isLoading: boolean
  error: string | null

  loadBudget: () => Promise<void>
  getSummary: () => BudgetSummary | null
}

type CacheData = { plan: BudgetPlan | null; savingsGoals: SavingsGoal[] }

async function saveCache(data: CacheData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function loadCache(): Promise<CacheData | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CacheData
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  plan: null,
  savingsGoals: [],
  isLoading: false,
  error: null,

  loadBudget: async () => {
    set({ isLoading: true, error: null })

    // A getSession() a tárolt sessiont adja vissza (lejárt access token esetén
    // frissíti) — szemben a getUser()-rel, ami friss hálózati kérést indít és
    // cold start után átmenetileg null usert ad. Lásd priceStore.
    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      set({ ...(cached ?? { plan: null, savingsGoals: [] }), isLoading: false })
      return
    }

    // A bejelentkezés utáni első authentikált lekérés némán üresen térhet vissza
    // (a friss JWT-t a szerver pár másodpercig nem fogadja el → RLS 0 sor). Ezért
    // hibára és üres tervre is egyszer újrapróbálunk rövid késleltetéssel.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [plan, savingsGoals] = await Promise.all([
          getCurrentBudgetPlan(user.id),
          getSavingsGoals(user.id),
        ])

        if (!plan && savingsGoals.length === 0 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600))
          continue
        }

        await saveCache({ plan, savingsGoals })
        set({ plan, savingsGoals, isLoading: false })
        return
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        const cached = await loadCache()
        if (cached) {
          set({ ...cached, isLoading: false, error: 'Offline – tárolt adatok' })
        } else {
          set({ plan: null, savingsGoals: [], isLoading: false, error: 'Kassza betöltése sikertelen' })
        }
      }
    }
  },

  getSummary: () => {
    const { plan } = get()
    return plan ? summarizeBudget(plan) : null
  },
}))
