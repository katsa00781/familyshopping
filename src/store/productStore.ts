import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { mockProducts } from '@/data/mockProducts'
import type { Product, PriceHistoryEntry } from '@/types'

const CACHE_KEY = 'bevasarlo_products'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function saveCache(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(products))
}

async function loadCache(): Promise<Product[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Product[]
  return parsed.map((p) => ({
    ...p,
    price_history: Array.isArray(p.price_history) ? p.price_history : [],
  }))
}

export type ProductDraft = {
  id?: string
  name: string
  brand: string | null
  category: string
  store_name: string | null
  price: number | null
  unit: string
  barcode: string | null
  last_price?: number | null
  price_history?: PriceHistoryEntry[]
  available?: boolean
}

interface ProductState {
  products: Product[]
  isLoading: boolean
  error: string | null
  searchQuery: string

  loadProducts: () => Promise<void>
  searchProducts: (query: string) => void
  upsertProduct: (draft: ProductDraft) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  searchProducts: (query) => set({ searchQuery: query }),

  loadProducts: async () => {
    set({ isLoading: true, error: null })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      try {
        const cached = await loadCache()
        const products = cached ?? mockProducts
        await saveCache(products)
        set({ products, isLoading: false })
      } catch {
        set({ products: mockProducts, isLoading: false })
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error

      const products = (data ?? []).map((p) => ({
        ...p,
        price_history: Array.isArray(p.price_history) ? p.price_history : [],
      })) as Product[]
      await saveCache(products)
      set({ products, isLoading: false })
    } catch {
      try {
        const cached = await loadCache()
        set({ products: cached ?? mockProducts, isLoading: false, error: 'Offline – tárolt adatok' })
      } catch {
        set({ products: mockProducts, isLoading: false, error: 'Termékek betöltése sikertelen' })
      }
    }
  },

  upsertProduct: async (draft) => {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? 'mock-user'
    const now = new Date().toISOString()
    const isNew = !draft.id

    const existing = isNew ? null : get().products.find((p) => p.id === draft.id)

    const product: Product = {
      id: draft.id ?? generateId(),
      user_id: userId,
      name: draft.name,
      brand: draft.brand,
      category: draft.category,
      store_name: draft.store_name,
      price: draft.price,
      unit: draft.unit,
      barcode: draft.barcode,
      last_price: draft.last_price ?? existing?.price ?? null,
      price_history: draft.price_history ?? existing?.price_history ?? [],
      available: draft.available ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    }

    const prev = get().products
    const next = isNew
      ? [product, ...prev]
      : prev.map((p) => (p.id === product.id ? product : p))
    set({ products: next })
    await saveCache(next)

    if (user) {
      const { updated_at: _u, ...payload } = product
      const { error } = await supabase.from('products').upsert(payload)
      if (error) {
        set({ products: prev })
        await saveCache(prev)
        if (error.code === '23505') {
          throw new Error('DUPLICATE')
        }
        throw new Error(error.message)
      }
    }
  },

  deleteProduct: async (id) => {
    const prev = get().products
    const next = prev.filter((p) => p.id !== id)
    set({ products: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) {
        set({ products: prev })
        await saveCache(prev)
      }
    }
  },
}))
