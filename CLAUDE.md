# Bevásárló – CLAUDE.md

## Szerepkör
Te egy tapasztalt Expo és React Native mérnök vagy, aki segít megépíteni a **Bevásárló**
alkalmazást – a FamilyBudget webes app mobilos párját.
Írj tiszta, egyszerű, karbantartható kódot. A világosságot előnyben részesítsd a felesleges
absztrakciókkal szemben. Ha valami nem egyértelmű, javasold a jobb megközelítést és kérdezz rá.

---

## Projekt áttekintés

**Bevásárló** – Háztartási bevásárlólisták kezelése iOS-en, a FamilyBudget Supabase backend felett.

Az app a következő főbb funkciókat tartalmazza:
- **Autentikáció** – Supabase email+jelszó login (ugyanaz mint a webes appnál)
- **Bevásárló lista** – listák létrehozása, tételek hozzáadása/szerkesztése/törlése, kipipálás
- **Bolt mód** – nagy kontrasztú, egy kézzel kezelhető üzleti nézet (fekete háttér, 72pt sorok, 56pt checkbox)
- **Termékek** – termékkönyvtár böngészése, keresés, új termék felvitele
- **Árak dashboard** – árváltozások, személyes infláció, KPI kártyák

Az implementáció legyen egyszerű és olvasható. MVP: 1 felhasználó (saját tesztelés).

---

## Tech stack

| Réteg | Csomag |
|---|---|
| Framework | Expo SDK 52+ + React Native |
| Nyelv | TypeScript (strict mode) |
| Router | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind szintaxis) |
| State | Zustand + AsyncStorage perzisztencia |
| Backend/DB | Supabase (meglévő familybudget projekt) |
| Auth | Supabase Auth (email + jelszó) |
| Icons | Lucide React Native |
| Analitika | – (v1-ben nincs) |

**Új könyvtárat ne adj hozzá engedély nélkül.** Ha indokolt lenne, javasold és kérdezz rá.
Max 10 fő dependency.

---

## Fejlesztési filozófia

Feature-by-feature építés. Minden feature esetén:

1. Olvasd el ezt a fájlt először
2. Tartsd az implementációt egyszerűnek
3. Kerüld a túlbonyolítást
4. Az olvasható kódot előnybe részesítsd az okossal szemben
5. Először a legkisebb működő verziót építsd meg
6. Csak akkor refaktorálj, ha ismétlés jelenik meg

---

## Mappastruktúra

```
app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    index.tsx           ← Lista tab (ListOverview)
    termekek.tsx        ← Termékek tab
    arak.tsx            ← Árak tab
    bolt.tsx            ← Bolt mód tab
    profil.tsx          ← Profil tab
  lista/
    [id].tsx            ← ListDetail
  termekek/
    [id].tsx            ← ProductDetail
    uj.tsx              ← ProductAdd
  _layout.tsx

components/
  lista/
    ListCard.tsx
    ListItem.tsx
    ItemAddSheet.tsx
    ItemEditSheet.tsx
  termekek/
    ProductCard.tsx
    ProductRow.tsx
  arak/
    DonutChart.tsx
    KpiCard.tsx
    ChangeRow.tsx
  bolt/
    BoltRow.tsx
    BoltCheckbox.tsx
  ui/
    Button.tsx
    Input.tsx
    Badge.tsx
    Toast.tsx
    Skeleton.tsx
    EmptyState.tsx
    BottomSheet.tsx

constants/
  colors.ts             ← design system tokenek
  typography.ts
  images.ts

data/
  mockProducts.ts       ← hardcoded kezdő termékek
  mockLists.ts          ← hardcoded kezdő listák

hooks/
  useAuth.ts
  useLists.ts
  useProducts.ts
  usePrices.ts

lib/
  supabase.ts           ← Supabase kliens init

store/
  authStore.ts
  listStore.ts
  productStore.ts
  priceStore.ts

types/
  index.ts              ← List, Item, Product, PriceEntry típusok

assets/
  images/
```

**`app/`** – csak route-ok és képernyők. Komponenseket és üzleti logikát ne tartalmazzon.

**`components/`** – újrafelhasználható UI elemek. Akkor hozz létre komponenst, ha:
- több helyen újra van használva
- átláthatóbbá teszi a képernyőt
- önálló UI koncepciót képvisel

**`data/`** – hardcoded mock tartalom. v1-ben ezekkel dolgozunk, Supabase szinkron later.

**`store/`** – Zustand store-ok, AsyncStorage perzisztenciával ahol szükséges.

**`lib/`** – külső service helperek. Titkos kulcsokat soha ne tároljunk itt.

---

## Styling szabályok

### ✅ ALAPSZABÁLY: NativeWind-first
Minden stílust NativeWind `className` proppal írj. StyleSheet-et CSAK akkor
használj, ha className-mel technikailag nem megoldható.

### ❌ TILOS StyleSheet-et használni ezekre:
- Egyszerű layout (flex, padding, margin, gap, width, height)
- Színek, háttérszínek
- Border, border-radius
- Text stílusok (font-size, font-weight, color)
- Opacity
- Bármilyen stílus, ami Tailwind osztályokkal leírható

### ✅ StyleSheet KIVÉTELEK – csak ezekre:
- `SafeAreaView` (platform-specifikus padding)
- `KeyboardAvoidingView`
- `Modal`
- `Animated.View` (animated.style prop)
- Runtime-ban kiszámolt dinamikus értékek (pl. `{ width: itemWidth }`)
- Platform-specifikus feltételes stílusok (`Platform.OS`)
- `Pressable` / `TouchableOpacity` pressed state callback
- `shadow*` props iOS-on (cross-platform árnyékok)

### Helyes minta:
```tsx
// ✅ HELYES
<View className="flex-1 bg-white px-4 py-6">
  <Text className="text-lg font-semibold text-slate-900">Tej 2,8%</Text>
</View>

// ❌ HELYTELEN
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 }
})
<View style={styles.container}>
```

### Design System tokenek (tailwind.config.ts alapján):
```
Színek:       bg-primary, bg-destructive, bg-success, bg-warning, bg-muted
              bg-cat-produce, bg-cat-dairy, bg-cat-meat, bg-cat-bakery, bg-cat-other
Betűk:        text-heading-xl, text-heading-lg, text-heading-md
              text-body-lg, text-body-md, text-body-sm, text-caption, text-bolt-mod-item
Radius:       rounded-card, rounded-btn, rounded-badge, rounded-fab
Árnyék:       shadow-sm, shadow-md, shadow-xl
```

## Design system – kötelező tokenek

A design system az 1/5 PDF-ből. **Ezeket pontosan kövesd:**

### Színek (`constants/colors.ts`)
```ts
export const colors = {
  primary:     '#2563EB',   // blue-600 – CTA, aktív tab
  destructive: '#EF4444',   // red-500 – törlés
  success:     '#22C55E',   // green-500 – kipipált, OK
  warning:     '#F59E0B',   // amber-500 – árváltozás
  muted:       '#94A3B8',   // slate-400 – placeholder

  // Surfaces light
  background:  '#FFFFFF',
  card:        '#FFFFFF',
  border:      '#E2E8F0',
  foreground:  '#0F172A',

  // Surfaces dark
  darkBackground: '#0F172A',
  darkCard:       '#1E293B',
  darkBorder:     '#334155',
  darkForeground: '#F8FAFC',

  // Bolt mód – mindig fekete, system theme-től független
  boltBg:      '#000000',
  boltBar:     '#111827',

  // Kategória tintok (pastel-300)
  cat: {
    produce: '#86EFAC',   // green-300
    dairy:   '#93C5FD',   // blue-300
    meat:    '#FCA5A5',   // red-300
    bakery:  '#FCD34D',   // amber-300
    other:   '#CBD5E1',   // slate-300
  }
}
```

### Spacing & layout
- Screen padding X: **16pt**
- Card inner padding: **16pt**
- Section spacing: **24pt**
- List row default: **56pt**
- List row bolt mód: **72pt**
- CTA button height: **50pt**
- Min tap area: **44×44pt**
- Bolt checkbox: **56×56pt**

### Border radius
- badge: 6pt | card: 12pt | button: 12pt | sheet: 16pt | FAB: 9999pt

### Tipográfia (SF Pro / system stack)
```
heading-xl:  34/41  Bold   -0.02em  (large title)
heading-lg:  28/34  Bold            (stack header)
heading-md:  22/28  Semibold        (card header)
body-lg:     17/22  Regular         (list item)
body-md:     15/20  Regular         (secondary)
body-sm:     13/18  Regular         (metadata)
caption:     11/14  Regular  +0.04em (badge/label)
bolt-item:   24/30  Semibold        (bolt mód sor)
```

---

## Bolt mód – kritikus szabályok

A Bolt mód a legfontosabb képernyő. Kötelező betartani:

- **Background mindig `#000000`** – soha nem a sötét téma bg-je, hanem true black
- Row height: **72pt**, bolt-item font: **24pt Semibold**
- Checkbox: **56pt filled circle** – üres: `#334155`, kipipált: `#22C55E`
- Kipipált sor: **40% opacity + áthúzott szöveg, helyben marad** (nem kerül alulra)
- Moon icon: `activateKeepAwake()` – aktív = primary blue tint
- Sticky progress bar: bg `#111827`, hairline `#1F2937`
- "Vásárlás kész" gomb: csak ha minden kipipálva, VAGY long-press a barra

---

## Supabase konfiguráció

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
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
```

**`.env` fájl (soha ne commitold!):**
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

A Supabase projekt a meglévő **familybudget** repo backend-je. A táblák és schema
megegyeznek a webes appban használtakkal.

---

## Autentikáció

Supabase Auth – email + jelszó. Ne építs egyedi auth megoldást.

- Auth state: `authStore.ts` (Zustand)
- Session: Supabase AsyncStorage storage kezeli
- Login screen: `app/(auth)/login.tsx`
- Redirect login után: `/(tabs)` (Lista tab)
- Redirect logout után: `/(auth)/login`

---

## UI szabályok

- A megadott design dokumentumot (PDF 1–5) pontosan replikáld
- Layout, spacing, padding, betűméret, hierarchia, színek, border-radius, árnyékok mind egyezzenek
- Ne approximálj, ne egyszerűsíts engedély nélkül
- Light/dark mód: `useColorScheme()` – automatikus
- **Kivétel:** Bolt mód mindig fekete, system theme-től független

---

## Styling szabályok

Használj NativeWind osztályokat. StyleSheet-et csak ha className-mel nem megoldható.

**StyleSheet kivételek (ezekhez ne használj className-t):**
- `SafeAreaView`
- `KeyboardAvoidingView`
- `Modal`
- `Animated.View`
- Runtime dinamikus stílusok (pl. bolt checkbox checked state)
- Platform-specifikus stílusok
- `Pressable` pressed state
- Árnyékok (platform-függők)

---

## Kép szabályok

```ts
// constants/images.ts
export const images = {
  logo: require('@/assets/images/logo.png'),
}
```

Képeket ne importálj közvetlenül képernyőkben vagy komponensekben.

---

## State management

| State | Store | Perzisztencia |
|---|---|---|
| Auth session | authStore | Supabase AsyncStorage |
| Bevásárló listák | listStore | AsyncStorage (offline cache) |
| Termékek | productStore | AsyncStorage (offline cache) |
| Árak | priceStore | AsyncStorage (offline cache) |
| UI state (sheet nyitva stb.) | lokális useState | – |

---

## Supabase adatbázis schema

A meglévő familybudget Supabase projektből az alábbi táblák relevánsak a mobil apphoz.
**Ezeket pontosan kövesd – ne változtasd meg a meglévő schema-t!**

### Releváns táblák

```
profiles              – felhasználói profilok (auth.users-hez kapcsolódik)
shopping_lists        – bevásárlólisták (items JSONB tömbben)
products              – termékkönyvtár (price_history JSONB tömbben)
product_price_history – árváltozás log (Árak tab alapja)
shopping_statistics   – vásárlási statisztikák (Árak tab KPI-ok)
```

### TypeScript típusok (`types/index.ts`)

```ts
// ─── Auth ────────────────────────────────────────────────────────────────────
export interface Profile {
  id: string                    // UUID, = auth.users.id
  email: string | null
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  family_id: string | null      // UUID
  created_at: string
  updated_at: string
}

// ─── Bevásárlólista ───────────────────────────────────────────────────────────
export type ItemCategory = 'Zöldség' | 'Tejtermék' | 'Hús' | 'Pékáru' | 'Egyéb'

export interface ShoppingItem {
  id: string                    // lokális UUID (nem Supabase sor)
  name: string
  quantity: number
  unit: string                  // 'db' | 'kg' | 'g' | 'l' | 'ml' stb.
  category: ItemCategory
  checked: boolean
  price: number | null          // Ft
  product_id: string | null     // opcionális link a products táblához
}

export interface ShoppingList {
  id: string                    // UUID
  user_id: string
  name: string
  date: string                  // ISO date string YYYY-MM-DD
  items: ShoppingItem[]         // JSONB a DB-ben, parsed array itt
  total_amount: number
  completed: boolean
  store_name: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ─── Termékek ─────────────────────────────────────────────────────────────────
export interface PriceHistoryEntry {
  price: number
  store_name: string | null
  date: string                  // ISO date string
  source: 'manual' | 'list' | 'ocr' | 'import'
}

export interface Product {
  id: string                    // UUID
  user_id: string
  name: string
  brand: string | null
  category: string              // ItemCategory értéke
  store_name: string | null
  price: number | null          // legutóbbi ár Ft-ban
  unit: string                  // 'db' | 'kg' | 'l' stb.
  barcode: string | null
  last_price: number | null
  price_history: PriceHistoryEntry[]  // JSONB a DB-ben
  available: boolean
  created_at: string
  updated_at: string
}

// ─── Árváltozások (product_price_history tábla) ───────────────────────────────
export interface ProductPriceHistory {
  id: string
  user_id: string
  product_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  price_date: string            // ISO date string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── Statisztikák (shopping_statistics tábla) ────────────────────────────────
export interface ShoppingStatistic {
  id: string
  user_id: string
  shopping_list_id: string | null
  product_name: string
  product_category: string | null
  store_name: string | null
  unit: string
  unit_price: number
  quantity: number
  total_price: number
  shopping_date: string         // ISO date string
  source: 'manual' | 'list' | 'ocr' | 'import'
  created_at: string
}

// ─── UI helper típusok ────────────────────────────────────────────────────────
export interface PriceChange {
  product_name: string
  store_name: string | null
  old_price: number
  new_price: number
  change_pct: number            // pl. +12.5 vagy -4.2
  change_ft: number             // pl. +40 vagy -20
  date: string
}

export interface InflationByCategory {
  category: ItemCategory
  change_pct: number
  share: number                 // 0–1, a donut szelet aránya
}
```

### Supabase lekérdezési minták

```ts
// Listák lekérése
const { data } = await supabase
  .from('shopping_lists')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

// Lista mentése / frissítése
await supabase
  .from('shopping_lists')
  .upsert({ id, user_id, name, date, items, total_amount, completed })

// Termékek keresése
await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId)
  .ilike('name', `%${query}%`)
  .order('name')

// Árváltozások (utolsó 30 nap)
await supabase
  .from('product_price_history')
  .select('*')
  .eq('user_id', userId)
  .gte('price_date', thirtyDaysAgo)
  .order('price_date', { ascending: false })

// Vásárlási statisztikák (KPI-okhoz)
await supabase
  .from('shopping_statistics')
  .select('*')
  .eq('user_id', userId)
  .gte('shopping_date', periodStart)
```

### Fontos schema megjegyzések

- A `shopping_lists.items` mező **JSONB** a DB-ben → mindig `ShoppingItem[]`-ként parse-old
- A `products.price_history` mező **JSONB** → `PriceHistoryEntry[]`-ként parse-old
- Az `ItemCategory` értékek magyarul vannak a designban: `'Zöldség'`, `'Tejtermék'`, `'Hús'`, `'Pékáru'`, `'Egyéb'`
- A termék duplikáció-védelem miatt a `products` táblán unique index van: `(user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(brand, ''))))` – upsert-nél figyelj erre
- Az `updated_at` mezőket **ne** küld a kliens, azt trigger kezeli

---

## TypeScript szabályok

- Strict mode (`"strict": true` a tsconfig-ban)
- `any` tiltott – használj `unknown` + type guard-ot
- Tartsd a típusokat egyszerűnek és olvashatónak
- Minden Supabase táblának van typed interface a `types/index.ts`-ben (lásd fent)

---

## Feature implementáció

Minden feature esetén:
1. Olvasd el ezt a fájlt
2. Azonosítsd az érintett fájlokat
3. Tartsd a változtatásokat fókuszáltan
4. Ne írj át nem érintett kódot
5. Kövesd a meglévő mintákat
6. Győződj meg róla, hogy a feature end-to-end működik
7. Javítsd a lint és type hibákat befejezés előtt

---

## Titkok és biztonság

- Supabase URL és anon key csak `.env`-ben, `EXPO_PUBLIC_` prefixszel
- Service role key-t soha ne tegyél kliens kódba
- `.env` legyen `.gitignore`-ban

---

## Nem scope (v1)

Ezeket **ne implementáld**, hacsak nem kapsz explicit utasítást:

- OCR blokk-beolvasás
- Family / multi-user meghívó flow
- Push notifications
- CSV import/export
- Barcode scanner
- Receipt photo archive
- Analitika events

---

## Kommunikáció

Légy tömör. Magyarázd el mi változott és hogyan lehet tesztelni.

---

## Emlékeztető

**Minden feature előtt:**
- Mindig olvasd el a @CLAUDE.md fájlt
- Kövesd szigorúan
- Tiszta, egyszerű kódot írj
- UI-t pontosan replikáld a design link ([text](https://api.anthropic.com/v1/design/h/eT7ng9XsMKWkLtki1h5LAQ?open_file=component-library-print.html)) alapján.