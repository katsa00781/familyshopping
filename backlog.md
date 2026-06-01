# Backlog – Bevásárló v0.1

> Sorrend = fejlesztési sorrend. Minden feature előtt: *"Olvasd el a CLAUDE.md-et és kövesd szigorúan."*
>
> **Utolsó frissítés:** 2026-06-01

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
- [x] OCRFlow modál – `src/app/ocr/` (index/preview/processing/review/confirm)
- [ ] Typed ParamList-ek (`navigation/types.ts`) – **HIÁNYZIK**

---

## Feature-ek — állapot

### ✅ KÉSZ

- [x] **01 – Login** – `src/app/(auth)/login.tsx` (email/jelszó, animált shake, Supabase auth)
- [x] **01b – Register** – `src/app/(auth)/register.tsx`
- [x] **02 – ListOverview** – `src/app/(tabs)/index.tsx` (aktív + korábbi listák, FAB, ListCreateSheet, scroll-hide FAB, korábbi lista **újraaktiválás** `...` menüből → átkerül az Aktív listák közé + toast visszajelzés)
- [x] **03 – ListDetail** – `src/app/lista/[id].tsx` (kategória filter chips, ItemAdd + ItemEdit sheet, complete + delete, pulse animáció, összesítő sáv)
- [x] **04 – ItemAddSheet** – `src/components/lista/ItemAddSheet.tsx` (barcode scan scope-on kívül)
- [x] **05 – ShopMode / Bolt mód** – `src/app/(tabs)/bolt.tsx` + `BoltRow` + `BoltCheckbox` ⚠️ (hiányok lejjebb)
- [x] **06 – ProductList** – `src/app/(tabs)/termekek.tsx` (grid/list toggle + AsyncStorage perzisztencia, keresés, kategória filter, skeleton 600 ms minimum)
- [x] **07 – ProductDetail** – `src/app/termekek/[id].tsx` (area chart SVG, árnapló, periódus selector)
- [x] **08 – ProductAdd/Edit** – `src/app/termekek/uj.tsx` (barcode scan scope-on kívül)
- [x] **09 – PriceOverview** – `src/app/(tabs)/arak.tsx` (KPI kártyák, DonutChart, ChangeRow, periódus + irány filter)
- [x] **Vásárlások nézet** (2026-05-31) – `src/app/vasarlasok/index.tsx` + `[id].tsx` + `src/store/purchaseStore.ts`. A `shopping_statistics` sorokat vásárlásokká csoportosítja (befejezett lista = `shopping_list_id` szerint; OCR/kézi = bolt+dátum+forrás szerint), forrás-jelzéssel (Blokk/Lista/Kézi). Az eddig sehol meg nem jelenő **OCR-blokk-vásárlások** végre láthatók. Belépés a főoldalon a „Vásárlások" sorral; részletnézet a tételekkel + összesítővel. Route-ok regisztrálva a `_layout.tsx`-ben. Új `Purchase` típus (`types/index.ts`).

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
- [x] **10 – OCRFlow** (5 lépés: Camera → Preview → Processing → ReviewItems → SaveConfirm) – `src/app/ocr/`
  - ✅ Szerver oldali vision: `ocr-receipt` Edge Function (gpt-4o-mini, `EXPO_PUBLIC_OCR_ENDPOINT`)
  - ✅ **Prompt finomítás** (2026-05-31): ÁFA-kódok (C00/B00…) és cikkszámok kiszűrése a névből, betét-/visszaváltási díj + összesítő sorok kihagyása, `qty × egységár` minták (magyar tizedesvessző, kg/db), sor-összeg vs egységár szétválasztása, RÉSZÖSSZESEN≠ÖSSZESEN, bolt-márka normalizálás, magyar→ISO dátum, `response_format: json_object`
  - ✅ **Per-tétel confidence**: a modell soronként ad 0–1 megbízhatóságot → a borostyán „bizonytalan felismerés” jelzés végre valós (eddig fix 0.9 volt)
  - ✅ **Tanuló réteg**: `ocr_corrections` tábla + `record_ocr_correction` RPC (migráció: `supabase/migrations/20260531120000_ocr_corrections.sql`). A ReviewItems mentésekor a (nyers OCR-név → javított név) párokat rögzítjük; az Edge Function a felhasználó leggyakoribb javításait glosszáriumként visszainjektálja a promptba → idővel pontosabb felismerés.
  - ⚠️ **Deploy szükséges**: `supabase functions deploy ocr-receipt` + a migráció futtatása (`supabase db push`). A repo `supabase/functions/ocr/` mappája elavult/használaton kívüli (régi shape) — a kliens a `ocr-receipt`-et hívja.
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
- [x] OCR mentés utáni élő frissítés (2026-05-31): az árak és termékek eddig csak ki-/bejelentkezésre frissültek. Most a `review.tsx` `doSave()` a mentés után fire-and-forget meghívja `useProductStore.loadProducts()` + `usePriceStore.loadPriceData()` hívásokat, a `termekek.tsx` pedig `useEffect` (mount-only) helyett `useFocusEffect`-et használ (mint az `arak.tsx`) — visszatéréskor mindig frissül — **KÉSZ**
- [x] OCR ellenőrzés (ReviewItems) név-input javítása (2026-05-31): a terméknév mező eddig egy sorban osztozott a mennyiség/egység/ár mezőkkel (`flex:1`, összenyomódott). Most saját teljes szélességű sorba került (height 48, fontSize 16), a mennyiség/egység + ár/műveletek alá `controlsRow`-ba — a hosszú magyar nevek olvashatók — **KÉSZ**
- [x] Személyes infláció kategória-normalizálás (2026-05-31): a valós adatban a `product_category` 10+ szabad szöveges értéket vesz fel (főleg a régi `import` forrásból: Élelmiszer, Édesség, Ital, Snack, Gyógyszer…, plusz lista/kézi variánsok: `Tejtermékek`, `Húsáruk`, `Zöldség-gyümölcs`, `Zöldség és gyümölcs`). A `toCategory` (`priceStore.ts`) eddig **pontos egyezést** várt az 5 kanonikus névre → minden más az „Egyéb"-be esett, ezért a `Zöldség`/`Tejtermék` mindig 0%-ot mutatott és az egész személyes-infláció bontás torz volt. Hozzáadva `CATEGORY_ALIASES` map: a közeli variánsokat (többes számok, kötőjeles/ékezetes formák) az 5 kategóriába normalizálja. A taxonómiailag nem besorolható import-kategóriák (Élelmiszer, Édesség, Ital, Snack, Tojás, Háztartás) szándékosan maradnak „Egyéb". — **KÉSZ**
- [x] Személyes infláció számítás javítása (2026-05-31): a `computeInflation` (`priceStore.ts`) eddig **kevert súlyozást** használt — kategórián belül a termékek %-változásának *súlyozatlan* átlaga, kategóriák között viszont *költés-alapú* `share`. Fő hiba: a `share` MINDEN termék költését tartalmazta (1-bejegyzésűeket is), míg a `change_pct` csak a ≥2 áradatú termékekből számolt → egy ritka, nagyot ugró termék eltorzította a headline inflációt, miközben a tényleg sokat vásárolt alaptermék ára nem változott. Javítva **konzisztens költés-súlyozott árindexre**: termékenként árváltozás × a termékre költött összeg, és ugyanaz a súlybázis (csak ≥2 áradatú termékek) adja a kategória `change_pct`-jét ÉS a donut `share`-ét. Így a középső headline `Σ(change×share)` matematikailag a valódi személyes infláció. A DonutChart/legend UI változatlan. — **KÉSZ**
- [x] OCR Edge Function IDE-típushibák javítása (2026-05-31): a `supabase/functions/ocr-receipt/index.ts` 7 hibát mutatott a szerkesztőben (5× `Cannot find name 'Deno'`, 2× `Cannot find module 'https://esm.sh/@supabase/supabase-js@2'`), mert a megnyitott Deno fájlt a VS Code TS-szervere a fő (Node) konfigurációval ellenőrizte, ami nem ismeri a Deno globálokat / távoli URL-importokat. A fő `tsconfig.json` már kizárja a `supabase/functions`-t (így az app typecheckjébe nem szivárogtak), de a szerkesztő ettől még jelzte őket. Megoldás: új `supabase/functions/ocr-receipt/deno.d.ts` ambient deklarációkkal (`Deno.serve`, `Deno.env`, valamint az esm.sh `createClient` minimális, `any`-mentes típusfelülete) + `/// <reference path="./deno.d.ts" />` az `index.ts` tetején. Mind a 7 hiba eltűnt, az éles Deno futás változatlan. — **KÉSZ**
- [x] `getSessionSafe()` proaktív token-frissítés (2026-06-01): visszatérő tünet — az Árfigyelés (és más adatvezérelt) oldalon **nem töltődött be semmi**, majd reload után magától megjavult. Diagnosztikával (ideiglenes panel az `arak.tsx`-en) kizárva az adat-/RLS-/időablak-/user-okot: a DB-ben 203 sor van a 30 napos ablakban, az RLS a user JWT-jével 205 sort ad, a user be van jelentkezve. A valódi ok **session-timing** volt: a `getSession()` a tárolt sessiont adja vissza, de az `autoRefreshToken` háttér-időzítője app-induláskor/fókuszkor még nem futott le → a kód *lejárt* access tokennel ment tovább, és az első `loadPriceData` üresen tért vissza. Javítás egyetlen ponton, a `getSessionSafe()`-ben (`lib/supabase.ts`): ha a token lejárt vagy 60 mp-en belül lejár, **explicit** `refreshSession()` a query előtt; a refresh dobását elnyeljük és a meglévő sessiont adjuk vissza (nem-destruktív). Mivel minden store ezen a helperen át kér sessiont (price, list×11, product×3, family, ocr, _layout), a fix az egész hibaosztályt megszünteti — nincs többé store-onkénti foltozás. — **KÉSZ**
- [x] `getSessionSafe()` helper + crash javítás (2026-05-31): lejárt access token + érvénytelen/hiányzó refresh token esetén a `supabase.auth.getSession()` **dobhat** (`AuthApiError: Invalid Refresh Token`), amit a store-ok `void`-os hívásai kezeletlen promise-elutasításként piros hibaképpé tettek. Új `getSessionSafe()` (`lib/supabase.ts`) **csak elkapja a dobást** (crash-védelem) és visszaadja a sessiont, ha van. **Nem-destruktív**: nem léptet ki és nem dobja el az érvényes sessiont (az első verzió `if (error) throw` + lokális `signOut` hibás volt — eldobta a még érvényes sessiont is és kiléptetett → eltűnt minden adat az Árak oldalon; javítva `data.session ?? null`-ra). Az összes `auth.getSession()` hívás cseréje: `priceStore`, `productStore` (3), `listStore` (11), `familyStore`, `lib/ocr.ts`, `ocr/review.tsx`, `app/_layout.tsx` — **KÉSZ**

---

## Ship előtt

- [x] **Natív iOS build setup (Xcode, ingyenes / 7 napos aláírás)** — `ios.bundleIdentifier: com.kacsorzsolt.familyshopping` + `buildNumber: "1"` (app.json + `project.pbxproj` Debug/Release; a `com.familyshopping.app` foglalt volt az Apple-nél). `npx expo prebuild -p ios --clean` → `ios/familyshopping.xcworkspace` + CocoaPods. Boltban Mac nélküli, önálló teszteléshez **Release** scheme kell. (Megj.: a prebuild a package.json `ios`/`android` scriptjeit `expo run:*`-ra állította. A gép lemeze szűkös — build előtt cache-takarítás kellhet: DerivedData, ios/build, CocoaPods cache.)
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
