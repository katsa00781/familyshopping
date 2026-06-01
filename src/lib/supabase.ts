import { createClient, type Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

/**
 * Biztonságos session-lekérés. A `supabase.auth.getSession()` lejárt access token
 * mellett megpróbálja frissíteni a sessiont a refresh tokennel, és ha az érvénytelen
 * vagy hiányzik (visszavont/törölt session), **dobhat** egy `AuthApiError`-t
 * ("Invalid Refresh Token: Refresh Token Not Found"). Mivel a store-ok ezt sokszor
 * `void`-dal hívják, a dobás kezeletlen promise-elutasítás → piros hibakép.
 *
 * Itt csak a dobást kapjuk el (crash-védelem). **Nem** léptetjük ki a usert és
 * **nem** dobjuk el az érvényes sessiont: ha a `getSession` ad sessiont, azt
 * mindig visszaadjuk (az `error` mező lehet figyelmeztetés érvényes session
 * mellett is). Csak akkor `null`, ha nincs használható session.
 *
 * **Proaktív token-frissítés.** A `getSession()` a tárolt sessiont adja vissza, de
 * az `autoRefreshToken` háttér-időzítője nem feltétlenül futott le még app-induláskor
 * vagy képernyő-fókuszkor — így egy *lejárt* access tokennel mehet tovább a kód, és az
 * első adatlekérés üresen tér vissza (a tünet: "Árfigyelés oldalon nem töltődik be
 * semmi", ami reload után magától megjavul). Ezért ha a token lejárt vagy 60 mp-en
 * belül lejár, itt **explicit** frissítünk a query előtt → determinisztikus betöltés
 * reload nélkül. A refresh dobását is elnyeljük, és visszaadjuk a meglévő sessiont.
 */
export async function getSessionSafe(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession()
    const session = data.session ?? null
    if (!session) return null

    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at ?? 0
    if (expiresAt - nowSec < 60) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession()
        return refreshed.session ?? session
      } catch {
        return session
      }
    }
    return session
  } catch {
    return null
  }
}
