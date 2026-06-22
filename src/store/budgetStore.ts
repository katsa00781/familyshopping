import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { loadWithSessionRetry } from '@/lib/loadWithRetry'
import {
  currentMonthStart,
  getCurrentBudgetPlan,
  getSavingsGoals,
  getWalletSpending,
  summarizeBudget,
} from '@/lib/budget'
import type { BudgetPlan, BudgetSummary, SavingsGoal, WalletSpending } from '@/types'

const CACHE_KEY = 'familyhub_budget_v1'

interface BudgetState {
  plan: BudgetPlan | null
  savingsGoals: SavingsGoal[]
  spending: WalletSpending | null
  isLoading: boolean
  error: string | null

  loadBudget: () => Promise<void>
  getSummary: () => BudgetSummary | null
}

type CacheData = {
  plan: BudgetPlan | null
  savingsGoals: SavingsGoal[]
  spending: WalletSpending | null
}

async function saveCache(data: CacheData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function loadCache(): Promise<CacheData | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CacheData
}

// Csak az aktuális hónapra szóló spending releváns — a régit eldobjuk.
function spendingForMonth(s: WalletSpending | null, month: string): WalletSpending | null {
  return s && s.month === month ? s : null
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  plan: null,
  savingsGoals: [],
  spending: null,
  isLoading: false,
  error: null,

  loadBudget: async () => {
    set({ isLoading: true, error: null })

    const month = currentMonthStart()
    const cached = await loadCache()
    const cachedSpending = spendingForMonth(cached?.spending ?? null, month)

    // 1. Terv + megtakarítások — cold-start-biztos betöltés (session a retry-cikluson belül).
    const result = await loadWithSessionRetry(
      async (userId) => {
        const [plan, savingsGoals] = await Promise.all([
          getCurrentBudgetPlan(userId),
          getSavingsGoals(userId),
        ])
        return { plan, savingsGoals }
      },
      (d) => !d.plan && d.savingsGoals.length === 0,
    )

    // 2. Valós Wallet költés — BEST-EFFORT. Sosem blokkolja a tervezési nézetet:
    //    ha a token nincs beállítva / a Wallet API hibázik / nincs session, a
    //    korábbi (aktuális hónapra szóló) cache-t tartjuk meg, spending nélkül is
    //    működik a Kassza.
    const loadSpending = async (): Promise<WalletSpending | null> => {
      if (result.status === 'failed') return cachedSpending // nincs élő session
      try {
        const fresh = await getWalletSpending(month)
        return fresh ?? cachedSpending
      } catch {
        return cachedSpending
      }
    }

    if (result.status === 'data') {
      const spending = await loadSpending()
      const data: CacheData = { ...result.data, spending }
      await saveCache(data)
      set({ ...data, isLoading: false, error: null })
      return
    }

    if (result.status === 'failed') {
      if (cached && (cached.plan || cached.savingsGoals.length > 0)) {
        set({
          plan: cached.plan,
          savingsGoals: cached.savingsGoals,
          spending: cachedSpending,
          isLoading: false,
          error: 'Offline – tárolt adatok',
        })
        return
      }
      set({
        plan: null,
        savingsGoals: [],
        spending: null,
        isLoading: false,
        error: 'Kassza betöltése sikertelen',
      })
      return
    }

    // `empty`: a szerver megerősítette, hogy nincs aktív terv és megtakarítási cél.
    const spending = await loadSpending()
    await saveCache({ plan: null, savingsGoals: [], spending })
    set({ plan: null, savingsGoals: [], spending, isLoading: false, error: null })
  },

  getSummary: () => {
    const { plan, spending } = get()
    return plan ? summarizeBudget(plan, spending) : null
  },
}))
