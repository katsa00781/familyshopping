# Backlog – Bevásárló v0.1

> Sorrend = fejlesztési sorrend. Minden feature előtt: *"Olvasd el a CLAUDE.md-et és kövesd szigorúan."*
>
> **Utolsó frissítés:** 2026-06-02

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
- [x] Adat (Vásárlások / Árfigyelés) üres a bejelentkezés utáni első belépéskor (2026-06-02): tünet — login után a Vásárlások és az Árfigyelés képernyő üres, de a tabból ki-belépve (újrafókusz) megjelenik az adat. Kizárva a token-propagáció: a supabase-js (v2.105) `fetchWithAuth`-ja **per-request** `getSession()`-ből veszi a tokent. A valódi ok kettős: **(1) hiányzott az `AppState` ↔ `startAutoRefresh` bekötés** (a Supabase hivatalos RN-setupjának kötelező eleme) → az `autoRefreshToken` időzítője nem ketyegett, a token némán lejárt; **(2) a bejelentkezés / cold start utáni első authentikált lekérés gyakran némán ÜRESEN tér vissza** — a frissen kiállított/épp lejárt JWT-t a szerver pár másodpercig nem fogadja el, így az RLS `auth.uid()` null → 0 sor HIBA NÉLKÜL (ezért a korábbi, csak hibára újrapróbáló fix nem segített). Javítás: (a) `lib/supabase.ts` — `AppState` listener `startAutoRefresh`/`stopAutoRefresh`-sel + `getSession()` újrapróba 250 ms múlva null session esetén; (b) `purchaseStore.loadPurchases` és `priceStore.loadPriceData` — hibára ÉS üres eredményre is **egyszer némán újrapróbál** (~600 ms) a friss DB-lekérésnél, mielőtt cache-re esne. Így az első betöltés determinisztikus. (Megj.: a teszt-telefonon Expo Go **SDK 53** fut az SDK 54-es projekttel — a JS-rétegbeli fix ettől függetlenül hat.) — **KÉSZ**
- [x] „Invalid Refresh Token" halott session takarítása (2026-06-02): visszatérő hiba — `[AuthApiError: Invalid Refresh Token: Refresh Token Not Found]`. Ok: a tárolt session refresh tokenje véglegesen érvénytelen (visszavont/törölt session), de a `getSessionSafe()` eddig ilyenkor is a *lejárt* sessiont adta vissza (sosem `null`-t, ha volt tárolt session). Így a háttérben futó `autoRefreshToken` időzítő újra meg újra megpróbálta frissíteni a halott tokennel → kezeletlen rejectionként felbukkant a hiba. Javítás a `getSessionSafe()`-ben (`lib/supabase.ts`): ha a session lejárt ÉS a refresh **kifejezetten** „Invalid Refresh Token" miatt bukik (új `isInvalidRefreshToken()` üzenet-ellenőrzés, hálózati hibától megkülönböztetve), akkor `signOut({ scope: 'local' })` törli a halott tokent a tárolóból (az időzítő leáll) és `null` tér vissza → login képernyő. Átmeneti (hálózati) refresh-hiba esetén a meglévő session **megmarad** (nem ismételjük meg a korábbi „érvényes session eldobása" bugot). — **KÉSZ**
- [x] OCR termék-egyeztetés finomítása (2026-06-02): a `findMatchingProduct` (`lib/productMatcher.ts`) eddig Jaccard-hasonlóságot számolt `common / max(halmaz)`-ra, ezért a tipikus blokk-név (tiszta katalógusnév + méret-/márkazaj, pl. „Tejföl 20% 330g") sosem érte el a 70%-ot a tiszta katalógusnévhez („Tejföl") képest → a meglévő termékek nagy része kimaradt az auto-egyeztetésből. Átírva **containment-alapú pontozásra**: mennyire fedik a katalógusnév *jelentős* tokenjeit (≥3 betű, így a „330g"/„20"/„1l"/„kg"/„db" zaj kiesik) a blokk-szöveg tokenjei, OCR-toleranciával (pontos egyezés, ≥5 hosszú tokeneknél 1 Levenshtein-eltérés, illetve prefix-egyezés a ragozott/összevont alakokra, pl. „teliszalami"↔„teliszal"). Küszöb 60% lefedettség. Plusz új `searchProducts()` ranglistás, ékezet-érzéketlen kereső a ReviewItems kézi termékválasztójához (substring/prefix + fuzzy pontszám), és a `ProductPickerSheet` mostantól **a tétel nevével előtöltve nyílik** → a blokkból kiolvasott névhez azonnal megjelennek a releváns katalógustermékek (`ocr/review.tsx`). — **KÉSZ**
- [x] OCR ReviewItems nem talált katalógus-terméket (2026-06-03): tünet — sem az auto-egyeztetés („katalógusban van" jelzés), sem a kézi katalógus-kereső nem adott találatot, pedig már feldolgozott blokkon tesztelve. Ok: az auto-egyeztetés (`ocr/processing.tsx` `findMatchingProduct`) és a kézi kereső (`ocr/review.tsx` `searchProducts`) is a `productStore.products` tömbből dolgozik, de a **`loadProducts` az egész appban CSAK a Termékek fülön (fókuszkor) és az OCR-mentés UTÁN futott** — az egyeztetés idejére sosem. Az OCR flow önálló modál-stack, így ha a munkamenetben nem nyitottad meg előtte a Termékek fület, a store üres volt → 0 találat mindenhol. Javítás: (a) `processing.tsx` az egyeztetés előtt betölti a katalógust, ha üres (`if (products.length===0) await loadProducts()`), és friss adatból egyeztet; (b) `review.tsx` mountkor betölti, ha üres (fedi a kézi-bevitel útvonalat is, ami kihagyja a feldolgozót). A matcher-logika maga rendben (valós páron 8/10 talál; a rövidebb-blokknév eseteknél a kézi választó a fallback). — **KÉSZ**
- [x] Meglévő OCR-`Egyéb` termékek visszamenőleges besorolása (2026-06-03): a fenti okos besorolás csak a jövőbeli mentésekre hatott; a DB-ben már ott lévő 30 OCR-`Egyéb` terméket egyszeri migrációval újra-kategorizáltuk az `inferCategory` logikával. 13 termék kapott valódi kategóriát (4 Hús: sertéskara/csirkecombfilé/sült sonka/pulykamell; 3 Pékáru: 2× burg.pogácsa/Pur-Pur vekni; 3 Tejtermék: Görög fetasajt/túró latte/vajkrém; 3 Zöldség: Jégsaláta/Paradicsom/Sárgarépa), a maradék 17 jogosan `Egyéb` (popcorn, rizs, tojás, majonéz, pelenka, ásványvíz, brownie, visszaváltási díj…). A `products` mellett a kapcsolódó OCR `product_price_history` (product_id alapján) és `shopping_statistics` (terméknév alapján) sorok `product_category`-ja is frissült, hogy a személyes infláció konzisztens legyen. — **KÉSZ**
- [x] OCR-termékek okos kategória-besorolása (2026-06-03): a fenti szűrő-javítás után az OCR-mentés még mindig fixen `'Egyéb'`-be sorolt minden új terméket, és az ár-/statisztika-sorok `product_category`-ja is fix `'Egyéb'` volt — így az OCR-húsok/tejtermékek csak az „Összes"/„Egyéb" chip alatt látszottak, és a személyes infláció bontása is torzult. Javítva (`ocr/review.tsx` `doSave`): **katalógus-párnál örökli a meglévő termék kategóriáját**, új terméknél **névből következtet** (`inferCategory`, `lib/categories.ts` — ékezet-érzéketlen kulcsszó-heurisztika az 5 kanonikus kategóriára, konzervatív fallback `'Egyéb'`; a Pékáru-t előre rangsorolja, hogy a „sajtos pogácsa"/„túrós táska" pékáru legyen, és a `maj` szándékosan kimaradt a majonéz-félrebesorolás miatt). A `product_category` mindkét sortípusban (`product_price_history`, `shopping_statistics`) a kiszámolt kategóriát kapja. Valós OCR-neveken ellenőrizve (pulykamell→Hús, trappista sajt→Tejtermék, vekni→Pékáru, paradicsom→Zöldség, víz/tojás/lé→Egyéb). — **KÉSZ**
- [x] Termékek kategória-szűrő nem mutatott minden terméket (2026-06-02): tünet — a Termékek képernyőn nem látszott minden termék, főleg az OCR-rel mentettek nem. Diagnózis: az adat hiánytalanul a DB-ben van (389 termék a `katsa007@gmail.com` userhez, mind az 55 OCR-termékkel együtt) — a hiba a **megjelenítésnél** volt. A kategória-chipek (`Zöldség/Tejtermék/Hús/Pékáru/Egyéb`) **pontos string-egyezést** vártak ([termekek.tsx](src/app/(tabs)/termekek.tsx)), de a DB-ben 51 szabad szöveges kategória van (`Tejtermékek`, `Húsáruk`, `Hús és hal`, `Zöldség és gyümölcs`, `Édesség`, `Élelmiszer`…), ráadásul **minden OCR-termék fixen `'Egyéb'`** kategóriát kap ([review.tsx](src/app/ocr/review.tsx)) → egy valódi kategóriára szűrve a variánsok és az OCR-húsok/tejtermékek rejtve maradtak (csak az „Összes" alatt látszottak). Javítás: a `priceStore`-ban már létező `toCategory` + `CATEGORY_ALIASES` normalizálás kiemelve közös `lib/categories.ts`-be (`ALL_CATEGORIES`, `toCategory`); a `priceStore` innen importál (duplikátum törölve), a Termékek chip-szűrő pedig `toCategory(p.category) === activeCategory`-ra vált. Így a változatok és az OCR-termékek a megfelelő chip alatt jelennek meg; az „Összes" változatlan. (Megj.: az OCR-mentés továbbra is fixen `'Egyéb'`-be sorol új terméket — okosabb besorolás külön feladat.) — **KÉSZ**
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
