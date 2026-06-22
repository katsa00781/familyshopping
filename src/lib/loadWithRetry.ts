import { getSessionSafe } from '@/lib/supabase'

const MAX_ATTEMPTS = 3

export type LoadResult<T> =
  | { status: 'data'; data: T }
  | { status: 'empty' }
  | { status: 'failed' }

/**
 * Egységes, cold-start-biztos store-betöltés.
 *
 * Cold start / friss bejelentkezés után KÉT külön, MÚLÓ időzítési rés okoz HIBA NÉLKÜLI
 * üres eredményt:
 *   (1) a GoTrue session-hidratálás (AsyncStorage) még fut → `getSessionSafe()` null;
 *   (2) a session megvan, de a frissen kiállított JWT-t a szerver pár másodpercig nem
 *       fogadja el → RLS `auth.uid()` null → 0 sor.
 * Mindkettő múló. A korábbi store-ok a sessiont a retry-cikluson KÍVÜL, egyszer kérték le,
 * és `!user` esetén azonnal cache-re estek vissza, a cikluson belüli újrapróba nélkül —
 * innen a „reload után magától megjavul" tünet. Itt a session-lekérést ÉS a query-t is a
 * cikluson BELÜL, újra-lekért sessionnel, backoff-fal ismételjük.
 *
 * Visszatérés:
 *  - `data`:   sikeres, nem-üres eredmény.
 *  - `empty`:  a szerver MEGERŐSÍTETTE az üres eredményt (legalább egy hibamentes, 0
 *              elemű olvasás) — valódi üres állapot vagy törlés. A hívó nyugodtan
 *              felülírhatja vele a cache-t.
 *  - `failed`: egyetlen hibamentes olvasás sem jött össze (nincs session / hálózati
 *              hiba). A hívó essen vissza a meglévő cache-re — üres eredmény NE rontsa
 *              el a tárolt adatokat.
 */
export async function loadWithSessionRetry<T>(
  fetcher: (userId: string) => Promise<T>,
  isEmpty: (data: T) => boolean,
): Promise<LoadResult<T>> {
  let sawCleanEmpty = false

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt))

    const session = await getSessionSafe()
    const user = session?.user
    if (!user) continue // session még nem hidratált → újra

    try {
      const data = await fetcher(user.id)
      if (!isEmpty(data)) return { status: 'data', data }
      // Hibamentes, de üres olvasás. Lehet JWT-időzítés → még próbálkozunk; ha minden
      // próba üres marad, megerősített üresnek tekintjük (lásd lentebb).
      sawCleanEmpty = true
    } catch {
      // tranziens (hálózat / JWT) — újra
    }
  }

  return sawCleanEmpty ? { status: 'empty' } : { status: 'failed' }
}
