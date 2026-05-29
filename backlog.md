# Backlog – Bevásárló v0.1

> Sorrend = fejlesztési sorrend. Minden feature előtt: *"Olvasd el a CLAUDE.md-et és kövesd szigorúan."*
>
> **Utolsó frissítés:** 2026-05-28

---

## Setup (egyszeri) — ✅ KÉSZ

- [x] Expo TS projekt (expo-router alapú, SDK ~54)
- [x] Git init, első commit
- [x] `.env` + `.gitignore`
- [x] NativeWind v4 + reanimated v4 + safe-area
- [x] Navigáció (expo-router Tabs + Stack)
- [x] Ikonok (lucide-react-native) / keep-awake (expo-keep-awake telepítve)
- [x] AsyncStorage
- [x] `tailwind.config.js` + tokens, path alias `@/*` → `src/*`
- [x] `tsconfig.json` strict
- [x] Mappastruktúra (részleges – hiányzik `screens/`, `navigation/`)
- [x] CLAUDE.md a projekt gyökerébe
- [x] `typecheck` script (`tsc --noEmit`) – package.json-ba bekötve
- [x] `format` script (prettier) – package.json-ba bekötve

---

## Alaprétegek (foundation) — ⚠️ RÉSZLEGES

- [x] **Theme layer** – `AppThemeProvider`, `useAppearance`, AsyncStorage `appearance`, NativeWind `dark:` flip
  - Van: `src/hooks/use-theme.ts`, `src/hooks/use-color-scheme.ts`, `src/constants/theme.ts`
  - Kész: `src/lib/theme.tsx` (`AppThemeProvider`, `useAppearance`), `tailwind.config.js` `darkMode: 'class'`
- [x] **Format helperek** – `formatHuf`, `formatHuDate` (`lib/format.ts`) — **KÉSZ**
- [x] **Storage helperek** – typed `StorageKeys` (`lib/storage.ts`) — **KÉSZ**
- [x] **Haptics wrapper** – `lib/haptics.ts` — **KÉSZ**, `expo-haptics` telepítve
- [x] **Megosztott típusok** – `src/types/index.ts` (Profile, ShoppingList, ShoppingItem, Product, PriceHistoryEntry, PriceChange, InflationByCategory, ShoppingStatistic, ProductPriceHistory)
- [x] **Provider stack** – GestureHandlerRootView → ThemeProvider (react-navigation) → Stack → ToastContainer
- [x] **Supabase kliens** – `src/lib/supabase.ts`

---

## Komponens primitívek (UI library) — ⚠️ RÉSZLEGES

- [x] Button (`primary | secondary | ghost | destructive` × `sm | md | lg`) – `src/components/ui/Button.tsx`
- [x] Input (label fölötte, search variant) – `src/components/ui/Input.tsx`
- [x] Card (`Card`, `CardHeader`, `CardContent`, `CardFooter`, `SwipeableCard`) – `src/components/ui/Card.tsx`
- [x] Badge (`CategoryBadge`, `PriceBadge`) – `src/components/ui/Badge.tsx`
- [x] Checkbox (`list` + `bolt` variant, animált, haptika) – `src/components/ui/Checkbox.tsx`
- [x] BottomSheet (half / full, drag-to-dismiss) – `src/components/ui/BottomSheet.tsx`
- [x] EmptyState (preset: emptyList, noResults, offline) – `src/components/ui/EmptyState.tsx`
- [x] Skeleton (card + listRow variant, 600 ms minimum) – `src/components/ui/Skeleton.tsx`
- [x] Toast + ToastContainer (store: `src/store/toastStore.ts`) – `src/components/ui/Toast.tsx`

---

## Navigáció — ✅ KÉSZ (expo-router alapú)

> **Megjegyzés:** A projekt expo-router-t használ, nem @react-navigation direktben. Ez eltérés a CLAUDE.md-től, de konzisztensen van végigvezetve.

- [x] Auth ↔ App switch – `src/app/_layout.tsx` (session check → redirect)
- [x] AppTabs (5 tab: Lista, Termékek, Árak, Bolt, Profil) – `src/app/(tabs)/_layout.tsx`
- [x] Auth stack – `src/app/(auth)/` (login, register)
- [x] Lista stack – `src/app/lista/[id].tsx`
- [x] Termék stack – `src/app/termekek/[id].tsx`, `src/app/termekek/uj.tsx`
- [ ] OCRFlow modál – **HIÁNYZIK**
- [ ] Typed ParamList-ek (`navigation/types.ts`) – **HIÁNYZIK**

---

## Feature-ek — állapot

### ✅ KÉSZ

- [x] **01 – Login** – `src/app/(auth)/login.tsx` (email/jelszó, animált shake, Supabase auth)
- [x] **01b – Register** – `src/app/(auth)/register.tsx`
- [x] **02 – ListOverview** – `src/app/(tabs)/index.tsx` (aktív + korábbi listák, FAB, ListCreateSheet, scroll-hide FAB)
- [x] **03 – ListDetail** – `src/app/lista/[id].tsx` (kategória filter chips, ItemAdd + ItemEdit sheet, complete + delete, pulse animáció, összesítő sáv)
- [x] **04 – ItemAddSheet** – `src/components/lista/ItemAddSheet.tsx` (barcode scan scope-on kívül)
- [x] **05 – ShopMode / Bolt mód** – `src/app/(tabs)/bolt.tsx` + `BoltRow` + `BoltCheckbox` ⚠️ (hiányok lejjebb)
- [x] **06 – ProductList** – `src/app/(tabs)/termekek.tsx` (grid/list toggle + AsyncStorage perzisztencia, keresés, kategória filter, skeleton 600 ms minimum)
- [x] **07 – ProductDetail** – `src/app/termekek/[id].tsx` (area chart SVG, árnapló, periódus selector)
- [x] **08 – ProductAdd/Edit** – `src/app/termekek/uj.tsx` (barcode scan scope-on kívül)
- [x] **09 – PriceOverview** – `src/app/(tabs)/arak.tsx` (KPI kártyák, DonutChart, ChangeRow, periódus + irány filter)

### 🔧 RÉSZLEGES

- [x] **05 – Bolt mód hiányok:**
  - ~~`useKeepAwake()` bekapcsolása~~ ✅ (aktív a képernyőn)
  - ~~`expo-haptics` telepítése~~ ✅ + ~~Medium haptika bekapcsolása pipálásnál~~ ✅ (`haptics.medium()` minden toggle-nél)
- [x] **11 – Profile** – `src/app/(tabs)/profil.tsx` – teljes iOS grouped list UI
  - ✅ Avatar blokk (inicálék, uid-seeded szín, szerepkör chip)
  - ✅ Családi beállítások szekció (Csatlakozási link + Tagok kezelése)
  - ✅ App beállítások szekció (Megjelenés segmented ☀◐☾, Valuta, Bolt, Értesítések)
  - ✅ Fiók szekció (Profil szerkesztése, Jelszó módosítása, Kijelentkezés confirm)
  - ✅ Rólunk szekció (App verzió, Adatvédelem, Felhasználási feltételek)
  - ⚠️ Push célok (EditProfile, ChangePassword, NotificationSettings, Privacy, Terms) – placeholder Alert, sub-screens HIÁNYZIK

### ❌ HIÁNYZIK

- [ ] **01c – ForgotPassword** képernyő
- [ ] **10 – OCRFlow** (5 lépés: Camera → Preview → Processing → ReviewItems → SaveConfirm)
- [ ] **12 – FamilySettings** (családtagok, megosztás)
- [ ] **PickerScreen** (generikus: bolt / kategória / egység)

---

## Adatbázis (Supabase) — ✅ BEKÖTVE

- [x] `shopping_lists` tábla (JSONB items mező)
- [x] `products` tábla (JSONB price_history mező)
- [x] `product_price_history` tábla
- [x] `shopping_statistics` tábla
- [x] Auth (Supabase Auth, session kezelés)
- [x] Offline fallback: AsyncStorage cache minden store-ban
- [x] Mock adatok fejlesztéshez: `src/data/mockLists.ts`, `src/data/mockProducts.ts`

---

## Technikai adósság

- [x] `lib/format.ts` létrehozása (`formatHuf`, `formatHuDate`) és direkten írt `.toLocaleString()` hívások cseréje — **KÉSZ**
- [x] `lib/storage.ts` létrehozása (typed StorageKeys: `appearance`, `product.viewMode`, `price.period`, `list.lastActive`, `auth.token`) — **KÉSZ**
- [x] `lib/haptics.ts` létrehozása + `expo-haptics` telepítése — **KÉSZ**
- [ ] `screens/` mappa szerkezet bevezetése (jelenleg az üzleti logika az `app/` mappában van)
- [x] Hardcoded hex színek cseréje token-alapú osztályokra (`colors.*` konstansok, `catBg`/`catAbbr` exportok) — **KÉSZ**
- [x] `package.json` `typecheck` és `format` script hozzáadása — **KÉSZ**
- [x] `priceStore` auth bug javítva: `useAuthStore.getState().user` → `await supabase.auth.getUser()` + cache v3 (időzítési hiba: store néha null-t adott vissza, régi cache v2 data jelent meg) — **KÉSZ**
- [x] `priceStore` árak nem töltődtek: `getUser()` lejárt access token mellett null usert adott → cache fallback ("Még nincs adat"). Javítva `getSession()`-re (tárolt session + auto token refresh). DB-ben az adat megvolt (732 ár / 1135 stat sor a userhez, RLS rendben) — **KÉSZ**
- [x] Ugyanez a `getUser()` → `getSession()` csere a `listStore` (11 hely), `productStore` (3 hely) és `familyStore` (1 hely) store-okban is megtörtént (azonos látens token-lejárati hiba megelőzése) — **KÉSZ**

---

## Ship előtt

- [ ] Teljes primary flow tesztelése éles eszközön (lista → bolt mód → pipálás)
- [ ] Bolt mód boltban, valós körülmények közt tesztelve
- [ ] Edge case-ek: üres lista, hosszú magyar terméknév, nincs net, lassú OCR
- [ ] iOS és Android tesztelés
- [ ] Lint + typecheck hibák nélkül
- [ ] Dev utilities eltávolítása (mock adatok, console.log-ok)
- [ ] Secrets ellenőrzése (kliens bundle + git history) — OCR endpoint kulcs szerver oldalon
- [ ] EAS Build production binary + éles eszközön tesztelés
- [ ] TestFlight (iOS) és Google Play internal testing (Android)

---

## Out of scope (v0.1)

- Tab badge számok
- Deep linkek (`bevasarlo://...` — schema rezerválva)
- i18n setup (hu-HU stringek inline, később `i18n-js`)
- Teljes backend API spec (csak az OCR kontraktus van leírva)
- Automatizált tesztek
- Barcode scanner (ItemAdd, ProductAdd)
