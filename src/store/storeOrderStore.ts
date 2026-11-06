import { create } from 'zustand'

import { resolveDataOwnerId } from '@/lib/dataOwner'
import { getStorageItem, setStorageItem, StorageKeys } from '@/lib/storage'
import { getSessionSafe, supabase } from '@/lib/supabase'

// A bevásárlólista bolt-csoportjainak sorrendje (bolt-nevek, márka szinten
// normalizálva). A szerveren a `shopping_preferences` táblában él, a család
// adatgazdájához kötve → a családtagok közösen látják és állítják. Az
// AsyncStorage csak gyors induló cache / offline tartalék.
// Alapértelmezés a korábbi fix sorrend: Lidl, utána Aldi.
const DEFAULT_ORDER = ['Lidl', 'Aldi']

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

async function pushToServer(order: string[]): Promise<void> {
  const session = await getSessionSafe()
  if (!session?.user) return
  const ownerId = await resolveDataOwnerId(session.user.id)
  await supabase.from('shopping_preferences').upsert({ user_id: ownerId, store_order: order })
}

interface StoreOrderState {
  order: string[]
  loaded: boolean

  /** `force`: családba lépés/kilépés után újra a szervert kérdezi. */
  loadOrder: (force?: boolean) => Promise<void>
  setOrder: (order: string[]) => void
}

export const useStoreOrderStore = create<StoreOrderState>((set, get) => ({
  order: DEFAULT_ORDER,
  loaded: false,

  loadOrder: async (force = false) => {
    if (get().loaded && !force) return

    const cached = await getStorageItem<string[]>(StorageKeys.listStoreOrder)
    const local = isStringArray(cached) ? cached : DEFAULT_ORDER
    set({ order: local, loaded: true })

    const session = await getSessionSafe()
    if (!session?.user) return
    const ownerId = await resolveDataOwnerId(session.user.id)
    const { data, error } = await supabase
      .from('shopping_preferences')
      .select('store_order')
      .eq('user_id', ownerId)
      .maybeSingle()
    if (error) return // offline / hiba: marad a cache

    const remote: unknown = data?.store_order
    if (isStringArray(remote)) {
      set({ order: remote })
      void setStorageItem(StorageKeys.listStoreOrder, remote)
    } else if (!data) {
      // Még nincs szerveres sor: a telefonon beállított sorrendet töltjük fel.
      void pushToServer(local)
    }
  },

  setOrder: (order) => {
    set({ order, loaded: true })
    void setStorageItem(StorageKeys.listStoreOrder, order)
    void pushToServer(order)
  },
}))
