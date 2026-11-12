import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getSessionSafe } from '@/lib/supabase'
import { mockLists } from '@/data/mockLists'
import { resolveDataOwnerId } from '@/lib/dataOwner'
import { normalizeStoreName } from '@/lib/format'
import { useProductStore } from '@/store/productStore'
import type { Product, ShoppingList, ShoppingItem } from '@/types'

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

function findStoreProduct(
  products: Product[],
  name: string,
  unit: string,
  store: string,
): Product | undefined {
  const lower = name.trim().toLowerCase()
  return products.find(
    (p) =>
      p.name.trim().toLowerCase() === lower &&
      p.unit === unit &&
      normalizeStoreName(p.store_name) === store,
  )
}

type SupabasePayload = Omit<ShoppingList, 'updated_at' | 'completed_at'>

function toPayload(list: ShoppingList): SupabasePayload {
  const { updated_at: _u, completed_at: _c, ...payload } = list
  return payload
}

// ─── product_id egyeztetés a szerverrel ───────────────────────────────────────
// A familybudget weben a termékek összevonhatók (`termekek_osszevonasa` RPC): a forrás
// termék sora törlődik, és a szerveren a `shopping_lists.items[].product_id` hivatkozások
// a megmaradó termékre íródnak át. A mobil a teljes listát a helyi példányból upsert-eli,
// így egy régebbi helyi példány visszaírná a már törölt id-kat. Meglévő tétel `product_id`-ját
// a mobil sosem módosítja, ezért mentés előtt a szerveren lévő tételek `product_id`-ja nyer.

type ServerProductIds = Map<string, string | null>

/** A lista szerveren tárolt tételeinek product_id-ja (tétel id → product_id). Hiba/offline → null. */
async function fetchServerProductIds(listId: string): Promise<ServerProductIds | null> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('items')
    .eq('id', listId)
    .maybeSingle()
  if (error || !data || !Array.isArray(data.items)) return null
  const map: ServerProductIds = new Map()
  for (const item of data.items as Partial<ShoppingItem>[]) {
    if (typeof item.id === 'string') map.set(item.id, item.product_id ?? null)
  }
  return map
}

/** A szerveren is meglévő tételek product_id-ját a szerver értékére cseréli. */
function withServerProductIds(items: ShoppingItem[], serverIds: ServerProductIds | null): ShoppingItem[] {
  if (!serverIds) return items
  let changed = false
  const next = items.map((item) => {
    if (!serverIds.has(item.id)) return item
    const productId = serverIds.get(item.id) ?? null
    if (productId === item.product_id) return item
    changed = true
    return { ...item, product_id: productId }
  })
  return changed ? next : items
}

type ListStoreSet = (partial: Partial<ListState>) => void
type ListStoreGet = () => ListState

/**
 * Lista mentése a szerverre a product_id egyeztetés után. Ha a szerver átírt
 * product_id-kat, azokat a helyi állapotba és a cache-be is átvezeti (tétel id szerint,
 * hogy a közben történt helyi változtatások megmaradjanak).
 */
async function persistList(
  list: ShoppingList,
  set: ListStoreSet,
  get: ListStoreGet,
): Promise<{ ok: boolean; list: ShoppingList; serverIds: ServerProductIds | null }> {
  const serverIds = await fetchServerProductIds(list.id)
  const items = withServerProductIds(list.items, serverIds)
  const reconciled = items === list.items ? list : { ...list, items }

  const { error } = await supabase.from('shopping_lists').upsert(toPayload(reconciled))
  if (error) return { ok: false, list, serverIds }

  if (reconciled !== list) {
    const next = get().lists.map((l) =>
      l.id === list.id ? { ...l, items: withServerProductIds(l.items, serverIds) } : l,
    )
    set({ lists: next })
    await saveCache(next)
  }
  return { ok: true, list: reconciled, serverIds }
}

// Egy vásárlás áras tételeit írja a statisztika + árhistória táblákba. Korábban
// ez `void`-dal, hibakezelés nélkül futott – egy sikertelen insert (pl. átmeneti
// hálózati hiba) így néma adatvesztést okozott. Most megvárjuk és naplózzuk a hibát.
async function insertPriceRecords(
  userId: string,
  list: ShoppingList,
  pricedItems: ShoppingItem[],
  shoppingDate: string,
): Promise<void> {
  const statsRows = pricedItems.map((item) => ({
    user_id: userId,
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
    user_id: userId,
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

  const [statsRes, priceRes] = await Promise.all([
    supabase.from('shopping_statistics').insert(statsRows),
    supabase.from('product_price_history').insert(priceRows),
  ])

  if (statsRes.error) console.warn('shopping_statistics insert sikertelen:', statsRes.error.message)

  // 23503 = foreign key violation: egy tétel már törölt termékre mutat (webes termék-
  // összevonás vagy -törlés után). Ilyenkor a teljes köteg elbukna, ezért a nem létező
  // product_id-kat NULL-ra állítva egyszer újrapróbáljuk (a product_name megmarad).
  let priceError = priceRes.error
  if (priceError?.code === '23503') {
    const ids = [...new Set(priceRows.map((r) => r.product_id).filter((id): id is string => !!id))]
    const { data: existing } = await supabase.from('products').select('id').in('id', ids)
    const existingIds = new Set((existing ?? []).map((p: { id: string }) => p.id))
    const retryRows = priceRows.map((r) =>
      r.product_id && !existingIds.has(r.product_id) ? { ...r, product_id: null } : r,
    )
    const retry = await supabase.from('product_price_history').insert(retryRows)
    priceError = retry.error
  }
  if (priceError) console.warn('product_price_history insert sikertelen:', priceError.message)
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
  deleteLists: (ids: string[]) => Promise<void>
  completeList: (id: string) => Promise<void>
  restoreList: (id: string) => Promise<void>
  finishShopping: (id: string) => Promise<void>
  addItem: (listId: string, item: ShoppingItem) => Promise<void>
  updateItem: (listId: string, itemId: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => Promise<void>
  deleteItem: (listId: string, itemId: string) => Promise<void>
  toggleItem: (listId: string, itemId: string) => Promise<void>
  setAllChecked: (listId: string, checked: boolean) => Promise<void>
  clearItems: (listId: string) => Promise<void>
  assignItemStore: (listId: string, itemId: string, storeName: string) => Promise<boolean>
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
        .eq('user_id', await resolveDataOwnerId(user.id))
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
    // Családban a lista a család adatgazdájához (tulajdonos) kerül → közös.
    const userId = user ? await resolveDataOwnerId(user.id) : 'mock-user'
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
    // Családban a lista a család adatgazdájához (tulajdonos) kerül → közös.
    const userId = user ? await resolveDataOwnerId(user.id) : 'mock-user'
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
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

  // Több lista törlése egy kéréssel (Korábbi listák kijelöléses törlése).
  deleteLists: async (ids) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const prev = get().lists
    const next = prev.filter((l) => !idSet.has(l.id))
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const { error } = await supabase.from('shopping_lists').delete().in('id', ids)
      if (error) {
        set({ lists: prev, error: 'Listák törlése sikertelen' })
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
      const local = next.find((l) => l.id === id)
      if (local) {
        // A mentett (product_id-egyeztetett) példányból rögzítjük az árakat, hogy az
        // árhistória ne törölt termékre hivatkozzon.
        const { ok, list } = await persistList(local, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Lista befejezése sikertelen' })
          await saveCache(prev)
          return
        }

        // Áras tételeket rögzítjük a statisztika és árhistória táblákban.
        // A tényleges vásárlás dátuma a befejezés pillanata, NEM a lista
        // (esetleg régen rögzített) `date` mezője – a lista újra megnyitható és
        // többször is befejezhető, a `date` a listát nem frissíti minden vásárláskor.
        const pricedItems = list.items.filter((item) => item.price !== null && item.price > 0)
        if (pricedItems.length > 0) {
          const shoppingDate = completedAt.split('T')[0]!
          await insertPriceRecords(await resolveDataOwnerId(user.id), list, pricedItems, shoppingDate)
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Lista visszaállítása sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  // Bolt módban "Vásárlás kész": a lista NEM zárul le (marad megosztható,
  // "mozgó" lista) – csak a kipipált (megvett) tételek tűnnek el belőle, a
  // meg nem vettek maradnak, hogy bármikor bővíthető legyen a család által.
  finishShopping: async (id) => {
    const prev = get().lists
    const list = prev.find((l) => l.id === id)
    if (!list) return

    const purchasedItems = list.items.filter((item) => item.checked)
    const remainingItems = list.items.filter((item) => !item.checked)

    const next = prev.map((l) =>
      l.id === id ? { ...l, items: remainingItems, total_amount: calcTotal(remainingItems) } : l
    )
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (!user) return

    const updated = next.find((l) => l.id === id)
    let serverIds: ServerProductIds | null = null
    if (updated) {
      const result = await persistList(updated, set, get)
      if (!result.ok) {
        set({ lists: prev, error: 'Vásárlás lezárása sikertelen' })
        await saveCache(prev)
        return
      }
      serverIds = result.serverIds
    }

    // Áras tételeket rögzítjük a statisztika és árhistória táblákban – a tényleges
    // vásárlás dátuma a "Vásárlás kész" pillanata, NEM a lista `date` mezője (lásd
    // fenti megjegyzés a `completeList`-nél: ugyanaz a lista többször is befejezhető).
    // A megvett tételek már nincsenek a mentett listában, ezért a szerver product_id-it
    // külön vezetjük át rajtuk.
    const pricedItems = withServerProductIds(purchasedItems, serverIds).filter(
      (item) => item.price !== null && item.price > 0,
    )
    if (pricedItems.length > 0) {
      const shoppingDate = new Date().toISOString().split('T')[0]!
      await insertPriceRecords(await resolveDataOwnerId(user.id), list, pricedItems, shoppingDate)
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
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
        const { ok } = await persistList(list, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Kipipálás sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  // Az összes tétel kipipálása / a pipák levétele egy lépésben.
  setAllChecked: async (listId, checked) => {
    const prev = get().lists
    const next = prev.map((l) => {
      if (l.id !== listId) return l
      const items = l.items.map((i) => (i.checked === checked ? i : { ...i, checked }))
      return { ...l, items }
    })
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { ok } = await persistList(list, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Kijelölés sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  // Lista ürítése: minden tétel törlése, maga a lista megmarad.
  clearItems: async (listId) => {
    const prev = get().lists
    const next = prev.map((l) => (l.id === listId ? { ...l, items: [], total_amount: 0 } : l))
    set({ lists: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      const list = next.find((l) => l.id === listId)
      if (list) {
        const { ok } = await persistList(list, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Lista ürítése sikertelen' })
          await saveCache(prev)
        }
      }
    }
  },

  // Bolt hozzárendelése egy bolt nélküli tételhez. A tétel termékét kapja meg a bolt;
  // ha ebben a boltban már van ilyen termék (DUPLICATE), vagy a tételnek nincs terméke,
  // akkor a tétel ÚJ id-vel, a bolti termékhez kötve cserélődik ki – a meglévő tétel
  // product_id-ját a mobil nem írhatja át (lásd `withServerProductIds`).
  assignItemStore: async (listId, itemId, storeName) => {
    const store = normalizeStoreName(storeName)
    const item = get()
      .lists.find((l) => l.id === listId)
      ?.items.find((i) => i.id === itemId)
    if (!store || !item) return false

    const productStore = useProductStore.getState()
    const product = item.product_id
      ? productStore.products.find((p) => p.id === item.product_id)
      : undefined
    if (product?.store_name) return true

    try {
      if (product) {
        try {
          await productStore.upsertProduct({ ...product, store_name: store })
          return true
        } catch (e) {
          if (!(e instanceof Error && e.message === 'DUPLICATE')) throw e
        }
      }

      const name = product?.name ?? item.name
      const unit = product?.unit ?? item.unit
      let target = findStoreProduct(useProductStore.getState().products, name, unit, store)
      if (!target) {
        try {
          target = await productStore.upsertProduct({
            name,
            brand: product?.brand ?? null,
            category: product?.category ?? item.category,
            store_name: store,
            price: null,
            unit,
            barcode: null,
          })
        } catch (e) {
          if (!(e instanceof Error && e.message === 'DUPLICATE')) throw e
          // A helyi katalógus elavult: frissítés után újra keressük.
          await useProductStore.getState().loadProducts()
          target = findStoreProduct(useProductStore.getState().products, name, unit, store)
        }
      }
      if (!target) return false

      const linked = target
      const prev = get().lists
      const next = prev.map((l) => {
        if (l.id !== listId) return l
        const items = l.items.map((i) =>
          i.id === itemId
            ? {
                ...i,
                id: generateId(),
                product_id: linked.id,
                price: i.price ?? linked.last_price ?? linked.price ?? null,
              }
            : i,
        )
        return { ...l, items, total_amount: calcTotal(items) }
      })
      set({ lists: next })
      await saveCache(next)

      const session = await getSessionSafe()
      const list = next.find((l) => l.id === listId)
      if (session?.user && list) {
        const { ok } = await persistList(list, set, get)
        if (!ok) {
          set({ lists: prev, error: 'Bolt hozzárendelése sikertelen' })
          await saveCache(prev)
          return false
        }
      }
      return true
    } catch {
      return false
    }
  },
}))
