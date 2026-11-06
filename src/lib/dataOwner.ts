import { supabase } from '@/lib/supabase'
import { getStorageItem, setStorageItem, StorageKeys } from '@/lib/storage'

// Családi megosztás: a közös bevásárló-adatok (listák, termékek, árelőzmény,
// vásárlási statisztika, boltsorrend) a család TULAJDONOSÁNAK user_id-ja alatt
// élnek. Család nélkül ez a bejelentkezett felhasználó maga. A tagok az RLS
// családi policy-jain keresztül olvassák/írják ezeket (lásd
// supabase/migrations/20261106120000_family_sharing.sql).

interface CachedOwner {
  userId: string
  ownerId: string
}

let cache: CachedOwner | null = null

/**
 * A közös adatok gazdájának azonosítója a `userId` felhasználóhoz. Szerverről
 * (`family_data_owner` RPC) jön, memóriában + AsyncStorage-ban cache-elve; hiba
 * esetén az utolsó ismert értékre, végül a saját id-re esik vissza.
 */
export async function resolveDataOwnerId(userId: string): Promise<string> {
  if (cache?.userId === userId) return cache.ownerId

  const { data, error } = await supabase.rpc('family_data_owner')
  if (!error && typeof data === 'string') {
    cache = { userId, ownerId: data }
    void setStorageItem(StorageKeys.familyDataOwner, cache)
    return data
  }

  const stored = await getStorageItem<CachedOwner>(StorageKeys.familyDataOwner)
  if (stored?.userId === userId) {
    cache = stored
    return stored.ownerId
  }
  return userId
}

/** Családba lépés / kilépés után hívandó: a következő lekérés újra a szervert kérdezi. */
export function resetDataOwnerCache(): void {
  cache = null
}
