import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getSessionSafe } from '@/lib/supabase'
import type { Purchase, ShoppingStatistic } from '@/types'

const CACHE_KEY = 'bevasarlo_purchases_v1'

interface PurchaseState {
  statistics: ShoppingStatistic[]
  isLoading: boolean
  error: string | null

  loadPurchases: () => Promise<void>
  getPurchases: () => Purchase[]
  getPurchase: (id: string) => Purchase | undefined
}

async function saveCache(rows: ShoppingStatistic[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rows))
}

async function loadCache(): Promise<ShoppingStatistic[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as ShoppingStatistic[]
}

// Csoportkulcs egy vásárláshoz:
//  - befejezett lista → egy vásárlás a shopping_list_id alapján,
//  - OCR / kézi (nincs lista-id) → bolt + dátum + forrás szerint.
function purchaseKey(stat: ShoppingStatistic): string {
  return stat.shopping_list_id
    ? `list:${stat.shopping_list_id}`
    : `${stat.source}:${stat.shopping_date}:${stat.store_name ?? '-'}`
}

function groupPurchases(statistics: ShoppingStatistic[]): Purchase[] {
  const map = new Map<string, ShoppingStatistic[]>()
  for (const stat of statistics) {
    const key = purchaseKey(stat)
    const list = map.get(key) ?? []
    list.push(stat)
    map.set(key, list)
  }

  const purchases: Purchase[] = []
  for (const [id, items] of map) {
    const first = items[0]!
    purchases.push({
      id,
      store_name: first.store_name,
      date: first.shopping_date,
      source: first.source,
      item_count: items.length,
      total: items.reduce((s, i) => s + i.total_price, 0),
      items,
    })
  }

  return purchases.sort((a, b) => b.date.localeCompare(a.date))
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  statistics: [],
  isLoading: false,
  error: null,

  loadPurchases: async () => {
    set({ isLoading: true, error: null })

    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      set({ statistics: cached ?? [], isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('shopping_statistics')
        .select('*')
        .eq('user_id', user.id)
        .order('shopping_date', { ascending: false })

      if (error) throw error

      const statistics = ((data ?? []) as ShoppingStatistic[]).map((r) => ({
        ...r,
        unit_price: Number(r.unit_price),
        quantity: Number(r.quantity),
        total_price: Number(r.total_price),
      }))
      await saveCache(statistics)
      set({ statistics, isLoading: false })
    } catch {
      const cached = await loadCache()
      if (cached) {
        set({ statistics: cached, isLoading: false, error: 'Offline – tárolt adatok' })
      } else {
        set({ statistics: [], isLoading: false, error: 'Adatok betöltése sikertelen' })
      }
    }
  },

  getPurchases: () => groupPurchases(get().statistics),
  getPurchase: (id) => groupPurchases(get().statistics).find((p) => p.id === id),
}))
