import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getSessionSafe } from '@/lib/supabase'
import { ALL_CATEGORIES, toCategory } from '@/lib/categories'
import type {
  ProductPriceHistory,
  ShoppingStatistic,
  PriceChange,
  InflationByCategory,
  ItemCategory,
} from '@/types'

// v3: invalidates stale cache written with null-user (auth timing bug)
const CACHE_KEY = 'bevasarlo_prices_v3'

export type Period = 7 | 30 | 90

export interface PriceKpi {
  mostExpensiveMonth: { label: string; amount: number } | null
  weeklyAverage: number
  trackedProducts: number
}

interface PriceState {
  priceHistory: ProductPriceHistory[]
  statistics: ShoppingStatistic[]
  period: Period
  isLoading: boolean
  error: string | null

  loadPriceData: (period?: Period) => Promise<void>
  setPeriod: (period: Period) => void
  computePriceChanges: () => PriceChange[]
  computeInflation: () => InflationByCategory[]
  computeKpis: () => PriceKpi
}

type CacheData = { priceHistory: ProductPriceHistory[]; statistics: ShoppingStatistic[] }

async function saveCache(data: CacheData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function loadCache(): Promise<CacheData | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CacheData
}

export const usePriceStore = create<PriceState>((set, get) => ({
  priceHistory: [],
  statistics: [],
  period: 30,
  isLoading: false,
  error: null,

  setPeriod: (period) => {
    set({ period })
    void get().loadPriceData(period)
  },

  loadPriceData: async (period) => {
    const p = period ?? get().period
    set({ isLoading: true, error: null, period: p })

    // getSession() a tárolt session-t adja vissza és lejárt access token esetén
    // frissíti azt. A getUser() ezzel szemben friss hálózati kérést indít, és lejárt
    // token mellett null usert ad — ettől nem töltődtek be az árak.
    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      set({ ...(cached ?? { priceHistory: [], statistics: [] }), isLoading: false })
      return
    }

    const since = new Date()
    since.setDate(since.getDate() - p)
    const sinceStr = since.toISOString().split('T')[0]!

    // A bejelentkezés / cold start utáni ELSŐ authentikált lekérés gyakran némán
    // ÜRESEN tér vissza: a frissen kiállított JWT-t a szerver pár másodpercig még nem
    // fogadja el (vagy a token épp lejárt), így az RLS `auth.uid()` null → 0 sor, HIBA
    // NÉLKÜL. A második próbálkozás (eddig: kézi újrafókusz) már működik. Ezért hibára
    // ÉS üres eredményre is egyszer újrapróbálunk rövid késleltetéssel — automatikusan.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [histRes, statRes] = await Promise.all([
          supabase
            .from('product_price_history')
            .select('*')
            .eq('user_id', user.id)
            .gte('price_date', sinceStr)
            .order('price_date', { ascending: false }),
          supabase
            .from('shopping_statistics')
            .select('*')
            .eq('user_id', user.id)
            .gte('shopping_date', sinceStr),
        ])

        if (histRes.error) throw histRes.error
        if (statRes.error) throw statRes.error

        const priceHistory = ((histRes.data ?? []) as ProductPriceHistory[]).map((r) => ({
          ...r,
          unit_price: Number(r.unit_price),
          quantity: Number(r.quantity),
          total_price: Number(r.total_price),
        }))
        const statistics = ((statRes.data ?? []) as ShoppingStatistic[]).map((r) => ({
          ...r,
          unit_price: Number(r.unit_price),
          quantity: Number(r.quantity),
          total_price: Number(r.total_price),
        }))

        if (priceHistory.length === 0 && statistics.length === 0 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600))
          continue
        }

        await saveCache({ priceHistory, statistics })
        set({ priceHistory, statistics, isLoading: false })
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
          set({ priceHistory: [], statistics: [], isLoading: false, error: 'Adatok betöltése sikertelen' })
        }
      }
    }
  },

  computePriceChanges: () => {
    const { priceHistory } = get()

    const grouped = new Map<string, ProductPriceHistory[]>()
    for (const entry of priceHistory) {
      const list = grouped.get(entry.product_name) ?? []
      list.push(entry)
      grouped.set(entry.product_name, list)
    }

    const changes: PriceChange[] = []
    for (const [name, entries] of grouped) {
      if (entries.length < 2) continue
      const sorted = [...entries].sort((a, b) => a.price_date.localeCompare(b.price_date))
      const oldest = sorted[0]!
      const newest = sorted[sorted.length - 1]!
      if (oldest.unit_price === 0) continue
      const change_ft = newest.unit_price - oldest.unit_price
      if (change_ft === 0) continue
      const change_pct = (change_ft / oldest.unit_price) * 100
      changes.push({
        product_id: newest.product_id ?? oldest.product_id,
        product_name: name,
        product_category: newest.product_category,
        store_name: newest.store_name,
        old_price: oldest.unit_price,
        new_price: newest.unit_price,
        change_pct,
        change_ft,
        date: newest.price_date,
      })
    }
    return changes.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
  },

  computeInflation: () => {
    const { priceHistory } = get()

    const grouped = new Map<ItemCategory, Map<string, ProductPriceHistory[]>>()
    for (const cat of ALL_CATEGORIES) grouped.set(cat, new Map())

    for (const entry of priceHistory) {
      const cat = toCategory(entry.product_category)
      const catMap = grouped.get(cat)!
      const list = catMap.get(entry.product_name) ?? []
      list.push(entry)
      catMap.set(entry.product_name, list)
    }

    // Költés-súlyozott árindex. Termékenként árváltozás (legrégebbi→legújabb
    // egységár), súlyozva a termékre költött összeggel. Csak a ≥2 áradatú
    // termékek adnak súlyt — ezekhez van mérhető változás. Ugyanaz a súlybázis
    // adja a kategória százalékos változását ÉS a donut-szeletek méretét (share),
    // így a középső headline = Σ(change_pct × share) a valódi személyes infláció.
    const catResults = new Map<ItemCategory, { weightedChange: number; weight: number }>()
    let totalWeight = 0

    for (const [cat, products] of grouped) {
      let weightedChange = 0
      let weight = 0

      for (const [, entries] of products) {
        if (entries.length < 2) continue
        const sorted = [...entries].sort((a, b) => a.price_date.localeCompare(b.price_date))
        const oldest = sorted[0]!
        const newest = sorted[sorted.length - 1]!
        if (oldest.unit_price <= 0) continue
        const change = ((newest.unit_price - oldest.unit_price) / oldest.unit_price) * 100
        const spend = entries.reduce((s, e) => s + e.total_price, 0)
        weightedChange += change * spend
        weight += spend
      }

      catResults.set(cat, { weightedChange, weight })
      totalWeight += weight
    }

    if (totalWeight === 0) {
      return ALL_CATEGORIES.map((category) => ({ category, change_pct: 0, share: 0 }))
    }

    return ALL_CATEGORIES.map((category) => {
      const { weightedChange, weight } = catResults.get(category)!
      return {
        category,
        change_pct: weight > 0 ? weightedChange / weight : 0,
        share: weight / totalWeight,
      }
    })
  },

  computeKpis: () => {
    const { statistics, priceHistory, period } = get()

    const monthlyTotals = new Map<string, number>()
    for (const stat of statistics) {
      const month = stat.shopping_date.slice(0, 7)
      monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + stat.total_price)
    }

    let mostExpensiveMonth: PriceKpi['mostExpensiveMonth'] = null
    for (const [month, amount] of monthlyTotals) {
      if (!mostExpensiveMonth || amount > mostExpensiveMonth.amount) {
        const [y, m] = month.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
        })
        mostExpensiveMonth = { label, amount }
      }
    }

    const totalSpend = statistics.reduce((s, st) => s + st.total_price, 0)
    const weeklyAverage = period > 0 ? totalSpend / (period / 7) : 0

    const productCounts = new Map<string, number>()
    for (const entry of priceHistory) {
      productCounts.set(entry.product_name, (productCounts.get(entry.product_name) ?? 0) + 1)
    }
    const trackedProducts = [...productCounts.values()].filter((c) => c >= 2).length

    return { mostExpensiveMonth, weeklyAverage, trackedProducts }
  },
}))
