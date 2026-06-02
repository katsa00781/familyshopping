import { createClient, type Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// React Native-ben az `autoRefreshToken` időzítője CSAK akkor ketyeg megbízhatóan,
// ha az app-állapothoz kötjük — ez a Supabase hivatalos RN-setupjának kötelező eleme,
// és eddig HIÁNYZOTT. Enélkül a háttér-időzítő nem fut, az access token némán lejár,
// és a lekérdezések üresen térnek vissza (a lejárt JWT mellett az RLS 0 sort ad).
// Aktív appnál indítjuk, háttérbe lépéskor leállítjuk.
if (AppState.currentState === 'active') {
  supabase.auth.startAutoRefresh()
}
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

/**
 * Egy hiba arról szól-e, hogy a refresh token érvénytelen/hiányzik (visszavont vagy
 * törölt session). Ilyenkor a session **véglegesen halott** — szemben az átmeneti
 * (hálózati) hibákkal, amik mellett a meglévő sessiont meg kell tartani.
 */
function isInvalidRefreshToken(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /refresh token/i.test(msg)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Biztonságos session-lekérés. A `supabase.auth.getSession()` lejárt access token
 * mellett megpróbálja frissíteni a sessiont a refresh tokennel, és ha az érvénytelen
 * vagy hiányzik (visszavont/törölt session), **dobhat** egy `AuthApiError`-t
 * ("Invalid Refresh Token: Refresh Token Not Found"). Mivel a store-ok ezt sokszor
 * `void`-dal hívják, a dobás kezeletlen promise-elutasítás → piros hibakép.
 *
 * Itt elkapjuk a dobást (crash-védelem). Érvényes vagy átmenetileg nem frissíthető
 * (hálózati hiba) session esetén **nem** léptetjük ki a usert: ha a `getSession` ad
 * sessiont, azt visszaadjuk (az `error` mező lehet figyelmeztetés érvényes session
 * mellett is).
 *
 * **Halott session takarítása.** Ha viszont a tárolt session lejárt ÉS a refresh
 * kifejezetten "Invalid Refresh Token" miatt bukik, akkor a session véglegesen
 * használhatatlan. Ilyenkor **lokálisan** kiléptetünk (`signOut({ scope: 'local' })`),
 * hogy a tárolóból eltűnjön a halott token — különben a háttérben futó `autoRefreshToken`
 * időzítő újra meg újra megpróbálja frissíteni, és kezeletlen rejectionként felbukkan a
 * "Refresh Token Not Found" hiba. A `null` visszatérés a login képernyőre irányít.
 *
 * **Proaktív token-frissítés.** A `getSession()` a tárolt sessiont adja vissza, de
 * az `autoRefreshToken` háttér-időzítője nem feltétlenül futott le még app-induláskor
 * vagy képernyő-fókuszkor — így egy *lejárt* access tokennel mehet tovább a kód, és az
 * első adatlekérés üresen tér vissza (a tünet: "Árfigyelés oldalon nem töltődik be
 * semmi", ami reload után magától megjavul). Ezért ha a token lejárt vagy 60 mp-en
 * belül lejár, itt **explicit** frissítünk a query előtt → determinisztikus betöltés.
 */
export async function getSessionSafe(): Promise<Session | null> {
  try {
    let { data } = await supabase.auth.getSession()
    // Közvetlenül bejelentkezés vagy cold start után a GoTrue session-olvasása
    // (initialize / storage) még futhat, és az első `getSession()` átmenetileg
    // session nélkül térhet vissza. Ilyenkor egy rövid újrapróba determinisztikussá
    // teszi a betöltést — különben az első fókuszált képernyő üres adattal indul,
    // és csak kézi újrafókuszálásra javul meg.
    if (!data.session) {
      await delay(250)
      ;({ data } = await supabase.auth.getSession())
    }
    const session = data.session ?? null
    if (!session) return null

    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at ?? 0
    if (expiresAt - nowSec < 60) {
      try {
        const { data: refreshed, error } = await supabase.auth.refreshSession()
        if (error) {
          if (isInvalidRefreshToken(error)) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
            return null
          }
          return session // átmeneti (pl. hálózati) hiba — marad a meglévő session
        }
        return refreshed.session ?? session
      } catch (e) {
        if (isInvalidRefreshToken(e)) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          return null
        }
        return session
      }
    }
    return session
  } catch {
    return null
  }
}
