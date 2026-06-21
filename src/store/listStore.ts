import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getSessionSafe } from '@/lib/supabase'
import { mockLists } from '@/data/mockLists'
import type { ShoppingList, ShoppingItem } from '@/types'

const CACHE_KEY = 'bevasarlo_lists'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function calcTotal(items: ShoppingItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0))
}

type SupabasePayload = Omit<ShoppingList, 'updated_at' | 'completed_at'>

function toPayload(list: ShoppingList): SupabasePayload {
  const { updated_at: _u, completed_at: _c, ...payload } = list
  return payload
}

async function saveCache(lists: ShoppingList[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(lists))
}

async function loadCache(): Promise<ShoppingList[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw) as ShoppingList[]
  return parsed.map((l) => ({ ...l, items: Array.isArray(l.items) ? l.items : [] }))
}

interface ListState {
  lists: ShoppingList[]
  activeListId: string | null
  isLoading: boolean
  error: string | null

  setActiveListId: (id: string | null) => void
  loadLists: () => Promise<void>
  createList: (name: string, date: string) => Promise<void>
  createListWithItems: (name: string, date: string, items: ShoppingItem[]) => Promise<string>
  updateList: (id: string, patch: Partial<Pick<ShoppingList, 'name' | 'date' | 'store_name'>>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  completeList: (id: string) => Promise<void>
  restoreList: (id: string) => Promise<void>
  addItem: (listId: string, item: ShoppingItem) => Promise<void>
  updateItem: (listId: string, itemId: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => Promise<void>
  deleteItem: (listId: string, itemId: string) => Promise<void>
  toggleItem: (listId: string, itemId: string) => Promise<void>
}

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  activeListId: null,
  isLoading: false,
  error: null,

  setActiveListId: (id) => set({ activeListId: id }),

  loadLists: async () => {
    set({ isLoading: true, error: null })

    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      const lists = cached ?? mockLists
      await saveCache(lists)
      set({ lists, isLoading: false })
      return
    }

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const lists = (data ?? []).map((l) => ({
        ...l,
        items: Array.isArray(l.items) ? l.items : [],
        completed_at: l.completed_at ?? null,
      })) as ShoppingList[]
      await saveCache(lists)
      set({ lists, isLoading: false })
    } catch {
      try {
        const cached = await loadCache()
        set({ lists: cached ?? mockLists, isLoading: false, error: 'Offline – tárolt adatok' })
      } catch {
        set({ lists: mockLists, isLoading: false, error: 'Listák betöltése sikertelen' })
      }
    }
  },

  createList: async (name, date) => {
    const session = await getSessionSafe()
    const user = session?.user
    const userId = user?.id ?? 'mock-user'
    const now = new Date().toISOString()

    const newList: ShoppingList = {
      id: generateId(),
      user_id: userId,
      name,
      date,
      items: [],
      total_amount: 0,
      completed: false,
      store_name: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    }

    const prev = get().lists
    const next = [newList, ...prev]
    set({ lists: next })
    await saveCache(next)

    if (user) {
      const { error } = await supabase.from('shopping_lists').insert(toPayload(newList))
      if (error) {
        set({ lists: prev, error: 'Lista létrehozása sikertelen' })
        await saveCache(prev)
      }
    }
  },

  createListWithItems: async (name, date, items) => {
    const session = await getSessionSafe()
    const user = session?.user
    const userId = user?.id ?? 'mock-user'
    const now = new Date().toISOString()

    const newList: ShoppingList = {
      id: generateId(),
      user_id: userId,
      name,
      date,
      items,
      total_amount: calcTotal(items),
      completed: false,
      store_name: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    }

    const prev = get().lists
    const next = [newList, ...prev]
    set({ lists: next })
    await saveCache(next)

    if (user) {
      const { error } = await supabase.from('shopping_lists').insert(toPayload(newList))
      if (error) {
        set({ lists: prev, error: 'Lista létrehozása sikertelen' })
        await saveCache(prev)
      }
    }

    return newList.id
  },

  updateList: async (id, patch) => {
    const prev = get().lists
    const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === id)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Lista frissítése sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  deleteList: async (id) => {
    const prev = get().lists
    const next = prev.filter((l) => l.id !== id)
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const { error } = await supabase.from('shopping_lists').delete().eq('id', id)
      if (error) {
        set({ lists: prev, error: 'Lista törlése sikertelen' })
        await saveCache(prev)
      }
    }
  },

  completeList: async (id) => {
    const prev = get().lists
    const completedAt = new Date().toISOString()
    const next = prev.map((l) =>
      l.id === id ? { ...l, completed: true, completed_at: completedAt } : l
    )
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === id)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Lista befejezése sikertelen' })
          await saveCache(prev)
          return
        }

        // Áras tételeket rögzítjük a statisztika és árhistória táblákban
        const pricedItems = list.items.filter((item) => item.price !== null && item.price > 0)
        if (pricedItems.length > 0) {
          const shoppingDate = list.date || completedAt.split('T')[0]!

          const statsRows = pricedItems.map((item) => ({
            user_id: user.id,
            shopping_list_id: list.id,
            product_name: item.name,
            product_category: item.category as string,
            store_name: list.store_name,
            unit: item.unit,
            unit_price: item.price!,
            quantity: item.quantity,
            total_price: item.price! * item.quantity,
            shopping_date: shoppingDate,
            source: 'list' as const,
          }))

          const priceRows = pricedItems.map((item) => ({
            user_id: user.id,
            product_id: item.product_id,
            product_name: item.name,
            product_category: item.category as string,
            store_name: list.store_name,
            unit: item.unit,
            unit_price: item.price!,
            quantity: item.quantity,
            total_price: item.price! * item.quantity,
            price_date: shoppingDate,
            source: 'list' as const,
          }))

          void supabase.from('shopping_statistics').insert(statsRows)
          void supabase.from('product_price_history').insert(priceRows)
        }
      }
    }
  },

  restoreList: async (id) => {
    const prev = get().lists
    const next = prev.map((l) =>
      l.id === id ? { ...l, completed: false, completed_at: null } : l
    )
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === id)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Lista visszaállítása sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  addItem: async (listId, item) => {
    const prev = get().lists
    const next = prev.map((l) => {
      if (l.id !== listId) return l
      const items = [...l.items, item]
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Tétel hozzáadása sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  updateItem: async (listId, itemId, patch) => {
    const prev = get().lists
    const next = prev.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i))
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Tétel frissítése sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  deleteItem: async (listId, itemId) => {
    const prev = get().lists
    const next = prev.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.filter((i) => i.id !== itemId)
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Tétel törlése sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  toggleItem: async (listId, itemId) => {
    const prev = get().lists
    const next = prev.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked } : i
      )
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { error } = await supabase.from('shopping_lists').upsert(toPayload(list))
        if (error) {
          set({ lists: prev, error: 'Kipipálás sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },
}))
