import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
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

type SupabasePayload = Omit<ShoppingList, 'updated_at'>

function toPayload(list: ShoppingList): SupabasePayload {
  // updated_at-t a trigger kezeli, kliens nem küldi
  const { updated_at: _u, ...payload } = list
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
  updateList: (id: string, patch: Partial<Pick<ShoppingList, 'name' | 'date' | 'store_name'>>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  completeList: (id: string) => Promise<void>
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

    const { data: { user } } = await supabase.auth.getUser()

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
    const { data: { user } } = await supabase.auth.getUser()
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

    const next = [newList, ...get().lists]
    set({ lists: next })
    await saveCache(next)

    if (user) {
      await supabase.from('shopping_lists').insert(toPayload(newList))
    }
  },

  updateList: async (id, patch) => {
    const next = get().lists.map((l) => (l.id === id ? { ...l, ...patch } : l))
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === id)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },

  deleteList: async (id) => {
    const next = get().lists.filter((l) => l.id !== id)
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('shopping_lists').delete().eq('id', id)
    }
  },

  completeList: async (id) => {
    const completedAt = new Date().toISOString()
    const next = get().lists.map((l) =>
      l.id === id ? { ...l, completed: true, completed_at: completedAt } : l
    )
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === id)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },

  addItem: async (listId, item) => {
    const next = get().lists.map((l) => {
      if (l.id !== listId) return l
      const items = [...l.items, item]
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },

  updateItem: async (listId, itemId, patch) => {
    const next = get().lists.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i))
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },

  deleteItem: async (listId, itemId) => {
    const next = get().lists.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.filter((i) => i.id !== itemId)
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },

  toggleItem: async (listId, itemId) => {
    const next = get().lists.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked } : i
      )
      return { ...l, items, total_amount: calcTotal(items) }
    })
    set({ lists: next })
    await saveCache(next)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) await supabase.from('shopping_lists').upsert(toPayload(list))
    }
  },
}))
