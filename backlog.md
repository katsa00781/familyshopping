# Backlog – FamilyHub

> Sorrend = fejlesztési sorrend. Minden feature előtt: *"Olvasd el a CLAUDE.md-et és kövesd szigorúan."*
>
> Ez a **FamilyHub** (családi szervező) egyesített backlogja: a `familyshopping` → FamilyHub v2 továbbfejlesztés aktív feladatai + a v0.1 (Bevásárló) **visszamaradt, még nyitott** feladatai. A kész v0.1 munkák összevontan lentebb (`✅ ALAP KÉSZ`).
>
> **Döntések (rögzített):**
> - Platform: mobil (Expo + RN), a meglévő appra építünk
> - **Bevásárlólista igazság forrása: a familyshopping `shopping_lists` táblája.** A familybudget shopping/products tábláit NEM használjuk.
> - **familybudget = ugyanaz a Supabase projekt, CSAK olvasás** → Kassza (`budget_plans`, `annual_budget_plans`, `savings_goals`) + receptek (`recipes`, `recipe_ingredients`).
> - Dizájn: teljes redesign FamilyWall-stílusban (teal/korall/meleg törtfehér), Bolt mód marad (lágyított háttér).
> - v1 funkciók: Kezdőlap dashboard, Naptár, Kassza, Étkezéstervező.
> - **v1 adatmodell:** `user_id`-scoped (NEM family_id, profiles üres). Naptár = saját hónap-grid (nincs react-native-calendars).
>
> **Utolsó frissítés:** 2026-06-28

---

## ✅ ALAP KÉSZ (familyshopping v0.1 – öröklött)

- [x] Expo + RN (SDK ~54) + TS strict + expo-router + NativeWind v4 + reanimated v4
- [x] Supabase Auth + kliens (`src/lib/supabase.ts`), session-timing javítások (`getSessionSafe`, AppState/autoRefresh, halott-session takarítás)
- [x] UI primitívek: Button, Input, Card, Badge, Checkbox, BottomSheet, EmptyState, Skeleton, Toast
- [x] Bevásárlólisták (`shopping_lists`), ListOverview, ListDetail, ItemAdd/Edit, **Bolt mód** (keep-awake, medium haptika)
- [x] Termékkatalógus + árelőzmény (`products`, `product_price_history`), Árfigyelés, Vásárlások (`shopping_statistics`)
- [x] Személyes infláció: kategória-normalizálás (`lib/categories.ts`), költés-súlyozott árindex
- [x] OCR blokk-szkennelés (kamera + `ocr-receipt` Edge Function), per-tétel confidence, tanuló réteg (`ocr_corrections`), okos kategória-besorolás + termék-egyeztetés
- [x] Profil (iOS grouped list), format/storage/haptics helperek, token-alapú színek
- [x] Natív iOS build setup (bundle id `com.kacsorzsolt.familyshopping`, prebuild)

> Részletek: a korábbi v0.1 backlog-bejegyzések (git history). Ezek **nem** változnak, csak a redesign érinti a megjelenésüket.

---

## 0. Előkészítés — ✅ KÉSZ

- [x] **Verifikáció (2026-06-21):** közös projekt megerősítve (`familyBudget`, ref `eguhipjgnhbajbmnrskm`). **Egyetlen** `shopping_lists` (21 sor) és `products` (423 sor) tábla — nincs duplikáció/ütközés.
  - **Finding:** a `profiles` tábla üres (0 sor), minden adattábla `user_id`-scoped → a `family_id` modell jelenleg NEM él. **Döntés: v1 = user_id-scoped**, az új táblák is.
  - **Finding:** `recipes`/`recipe_ingredients` üres (0 sor) → Étkezéstervezőnél üres állapot kell (7. pont).
- [x] Új `CLAUDE.md` a gyökérbe (a v0.1-es `CLAUDE.v0.1.md`-be mentve, gyökér felülírva FamilyHub v2-vel, v1 döntésekkel)
- [x] `react-native-calendars` → **NEM** telepítjük; saját hónap-grid (reanimated) lesz
- [x] Branch: `feature/familyhub-v2` létrehozva

---

## 1. Dizájn-tokenek (alap minden máshoz) — ✅ KÉSZ (2026-06-21)

- [x] `handoff/tokens/tokens.json` + `src/constants/colors.ts` átírva az új palettára:
  - primary `#14B8A6`, accent `#FB7185` (új), success `#22C55E`, warning `#F59E0B`, destructive `#EF4444`
  - light: background `#F8F7F4`, card `#FFFFFF`, foreground `#1C2B2A`, muted `#8A8F8E`, border `#E9E7E1`
  - dark: háttér `#13201F`, card `#1B2B29`, border `#2A3B39`
- [x] `tailwind.config.js` szinkron a tokenekkel (+ `accent`, `primary-foreground`, `member-*` osztályok)
- [x] Tagszín-készlet: `memberColors` + `memberColorAt(index)` (teal/korall/lila/sárga/kék/zöld) → `constants/colors.ts`; `member.*` a tokens.json-ban
- [x] Füstteszt: typecheck nem hozott új hibát (a meglévők előző template-hibák); `colors.primaryLight` kulcs megtartva (új teal-300 érték) a tab tint miatt

---

## 2. Bolt mód finomítás — ✅ KÉSZ (2026-06-21)

- [x] Bolt háttér `#000000` → `#13201F`, sticky bar `#0E1817`, hairline `#2A3B39` (token-értékek frissítve: `colors.boltBg/boltBar/boltBorder` + tokens.json + tailwind `bolt-*`)
- [x] Accent (korall `#FB7185`) a sticky bar CTA-ján (`styles.cta` → `colors.accent`)
- [x] Minden más változatlan (72/56 pt méretek, medium haptika, keep-awake, nem-átrendeződés)

---

## 3. Navigáció átállítása (5 tab) — ✅ KÉSZ (2026-06-21)

- [x] `src/app/(tabs)/_layout.tsx`: új tabok → `Kezdőlap` (index) · `Naptár` · `Bevásárlás` · `Étrend` · `Kassza`; lucide ikonok (Home/Calendar/ShoppingCart/UtensilsCrossed/Wallet), aktív = primary
- [x] Termékek + Árak a Bevásárlás alá: `bevasarlas.tsx` QuickLinks-szel (Termékek/Árak/Vásárlások), `termekek`/`arak` route-ok `href:null` + vissza-gomb a fejlécükben
- [x] A régi ListOverview (`index.tsx`) → `bevasarlas.tsx`-be áthelyezve (Bolt FAB token színre: `colors.primary`)
- [x] Kezdőlap (`index.tsx`): köszöntés + avatar → Profil push (Profil `href:null` + vissza-gomb)
- [x] Naptár/Étrend/Kassza placeholder screenek (tartalom: 5–7. feladat)
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 error az érintett fájlokon
- [x] **Bevásárlás UI redesign a kanonikus `desing/familyhub-listak.html` szerint (2026-06-21):**
  - Fejléc: keret nélkül, „Bevásárlás" (30/900, ls -0.6) + kör alakú gomb (42 pt, card bg, 2 pt keret, lágy árnyék). **Eltérés a mockuptól:** a kör a design „keresés" ikonja helyett az **OCR-szkennert** hordozza (felhasználói döntés) — a lista-keresés nem v1 funkció, az OCR megtartja a belépőjét
  - Szegmens-vezérlő (`ListSegment`): Listák (aktív) / Termékek / Árak; bg `surface-sunken`, aktív szegmens card bg + árnyék. Termékek/Árak koppintásra a `termekek`/`arak` route-ra navigál (a régi QuickLinks-et leváltja)
  - `ListCardActive` (lcard): színes ikon-chip (teal/korall/lila index szerint), név + meta (dátum · bolt), menü, haladássáv, lábrész (tételszám + „Becsült ~Ft") + kártyánkénti **Bolt mód** gomb (`setActiveListId` → bolt tab). **Eltérés:** a mockup „dátum · Anna" sorából a tag-név elmarad (v1 single-user, nincs per-lista tulajdonos)
  - `ListCardPast` (pcard): pipa-chip (`surface-muted`), név + „Befejezve · dátum · N tétel", összeg + menü (újraaktiválás/törlés). A „Korábbi listák" szekció kiváltja a régi Vásárlások-belépőt
  - FAB → korall „+" új lista (a globális Bolt FAB-ot a kártyánkénti Bolt mód gomb váltja le)
  - Új tokenek: `surface-sunken` (#EFEDE7) + `surface-muted` (#F2F0EA) → tokens.json + tailwind + colors.ts
  - Stílus-érvényesülés: a kártya statikus stílusai belső View-n (objektum-style + className), a Pressable függvény-style csak `opacity` — a NativeWind v4 gotcha elkerülve (lásd dashboard/Naptár fix)
  - Füstteszt: tsc nem hozott új hibát, lint 0 az érintett fájlokon
- [x] **Sötét mód – láthatatlan fejléc-ikonok javítva (2026-06-27):** sötét háttéren nem látszott az OCR (`ScanLine`, Bevásárlás fejléc), a Naptár (`CalendarClock` + hónap-navigáció `ChevronLeft/Right`) és a Kezdőlap fogaskerék (`Settings`) ikonja. Gyökérok: az ikon `color` propja fixen `colors.foreground` (light-mód sötét `#1C2B2A`) volt, ami a sötét háttéren (`#13201F`) eltűnt — a kör-chip `bg-card` className viszont helyesen sötétedett. Javítás a meglévő mintát követve (`useColorScheme` a `nativewind`-ből → `dark ? colors.darkForeground : colors.foreground`) az `index.tsx`, `naptar.tsx`, `bevasarlas.tsx` fejléceiben. tsc/lint tiszta az érintett fájlokon
- [x] **Árfigyelés cold-start betöltési hiba javítva (2026-06-21):** a személyes infláció és árváltozások időnként üresen maradtak („reload után magától megjavul"). Adat- és számítás-ellenőrzés (Supabase): 894 áradat-sor, 30 napos ablakban 40 termék ≥2 adattal, 12 valódi árváltozás — tehát a hiba a **betöltési úton** volt, nem adathiány/számítás. Gyökérok: a `priceStore.loadPriceData` a sessiont a retry-cikluson KÍVÜL, egyszer kérte le → cold start után, ha a GoTrue session-hidratálás még futott, `getSessionSafe()` null → azonnali cache-fallback, cikluson belüli újrapróba nélkül. Másodlagos hiba: üres élő eredmény FELÜLÍRTA a jó cache-t üressel (tartóssá tette a hibát). Javítás: session-lekérés + query a retry-cikluson BELÜL (4 próba, backoff, újra-hidratálásra várva); üres élő eredmény SOSE írja felül a nem-üres cache-t; tiszta üres (új user) megkülönböztetve a tranziens hibától. Önjavító: az első sikeres élő betöltés felülírja a korábban beragadt üres cache-t. tsc/lint tiszta.
  - **Központosítva + kiterjesztve mind a 4 store-ra (2026-06-21):** a hibára hajlamos retry-logika kiemelve közös `src/lib/loadWithRetry.ts`-be (`loadWithSessionRetry(fetcher, isEmpty)` → `data` | `empty` | `failed`). A `priceStore`, `budgetStore`, `calendarStore`, `mealPlanStore` betöltése mind ezt használja. Kulcs: a `failed` (egyetlen hibamentes olvasás sem) megtartja a nem-üres cache-t (múló hiba ≠ adatvesztés), míg az `empty` (a szerver megerősítette a 0 sort) tisztán felülírja (törlés/valódi üres helyesen kezelve). A naptár/étrend mutációi (`createEvent`/`assignRecipe`…) változatlanok.
- [x] **Szegmens-vezérlő perzisztálása mindhárom alnézeten (2026-06-21):** a felső tabok (Listák / Termékek / Árak) korábban csak a Bevásárlás (Listák) képernyőn voltak; Termékekre/Árakra lépve eltűntek, csak „Vissza" gomb maradt. Most a `ListSegment` mindhárom nézet fejlécében ott van, közvetlen váltással. A `termekek`/`arak` „Vissza → Bevásárlás" gomb helyét a szegmens vette át (cím egységesen „Bevásárlás"). Közös `useSegmentNav(current)` hook a `ListSegment`-ben: `router.navigate` (nem `push`), hogy ne épüljön duplikált back-stack. tsc/lint tiszta az érintett fájlokon

---

## 4. Kezdőlap / dashboard — ✅ KÉSZ (2026-06-21)

- [x] Új `src/app/(tabs)/index.tsx` (a régi ListOverview a Bevásárlás alatt; a Kezdőlap most a dashboard)
- [x] Köszöntés + családtag-avatarok (tagszínes gyűrű): `MemberAvatar` (2 pt gyűrű, `memberColorAt`); v1 single-user → a bejelentkezett felhasználó az egyetlen tag, `familyStore.loadFamily()` betöltve (family bővülésre kész)
- [x] Aktív bevásárlólista kártya + gyors „Bolt mód" gomb (`ActiveListCard`, `listStore`: `activeListId` vagy a legutóbbi befejezetlen lista; progress sáv, `formatHuf`)
- [x] „Ma" kártya (`TodayCard`) — váz + korall dátum + üres állapot; **az események a 6. (Naptár) feladat után élesednek**
- [x] Kassza kártya (`BudgetCard`) — váz + üres állapot; **az összegek az 5. (Kassza) feladat után élesednek**
- [x] Üres állapotok minden kártyához (aktív lista hiányában CTA új listához; „Ma"/Kassza üres szöveg)
- [x] Komponensek: `src/components/dashboard/` (`MemberAvatar`, `DashboardCard`, `TodayCard`, `ActiveListCard`, `BudgetCard`)
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [x] **Pontosítás a kanonikus HTML mockuphoz** (`desing/familyhub-kezdolap.html`, 2026-06-21):
  - Fejléc: scrollon belül, keret nélkül — „Szia, {keresztnév}!" (27/800) + dátum (`2026. június 19., péntek`); jobbra **átfedő** tag-avatarok (40 pt, fehér 2.5 pt keret) + beállítás-fogaskerék → Profil (a régi külön avatar-sor megszűnt)
  - Kártya-alap (`DashboardCard`): keret helyett lágy árnyék, radius 24, 18 pt padding, 44 pt ikon-chip (radius 15, teal/korall tint), cím (18/800) + alcím; chevron eltávolítva. A „Ma" kártya korall glow árnyékot kap (`accentShadow`)
  - `TodayCard`: végleges eseménysor-layout (tagszínes pötty · idő · cím · név, elválasztó vonallal), `TodayEvent[]` prop a 6. feladathoz; v1 üres állapot
  - `ActiveListCard`: cím = lista neve, alcím „Aktív lista"; haladássáv + lábrész (`{kész} / {össz} tétel kész` + inline „Bolt mód" gomb Play-ikonnal, teal árnyék)
  - `BudgetCard`: nagy szám = szabad keret (38/900) + „Ft" + „szabad keret"; sáv + lábrész. **Eltérés a mockuptól:** a HTML „Elköltve" felirata → **„Betervezve"**, mert v1-ben nincs valós elköltött adat (Wallet külön rendszer, 5. feladat döntése). Túltervezés → `warning`
  - Füstteszt: tsc/lint tiszta az érintett fájlokon
- [x] **Dashboard padding/radius fix** (`desing/FamilyHub – Kezdőlap.pdf` alapján, 2026-06-21): a kártyák és a „Bolt mód" gomb stílusa nem érvényesült. Gyökérok: NativeWind v4-ben a `Pressable` **függvény-formájú `style`-jából a statikus property-k** (`padding`, `borderRadius`, `marginLeft`) **eldobódnak**, ha `className` is van rajta (a `bg-*`/`rounded-*` className-ek viszont megmaradnak). Javítás (a működő `ListCard` mintát követve): a statikus stílusok belső `View`-ra kerültek (objektum-style + className), a `Pressable` függvény-style-ja csak `opacity`-t kezel — `DashboardCard`, `ActiveListCard` (Bolt gomb), `index.tsx` (beállítás-gomb átfedés)

---

## 5. Kassza – familybudget olvasás — ✅ KÉSZ (2026-06-21)

> **Döntés (felhasználói):** a familybudget Supabase táblákban **nincs valós „elköltött"** adat — a tényleges tranzakciók a külön **Wallet** rendszerben élnek (`walletCategories` UUID-k), amit a mobilapp nem ér el. v1 = **tervezési nézet**: keret + kategória-allokáció, valós költés nélkül. (Wallet-integráció elhalasztva.)
>
> **FRISSÍTÉS (2026-06-22): Wallet-integráció KÉSZ — valós havi költés.** Lásd 5b.
>
> **Adat-finding:** nincs `is_active = true` terv → az aktív tervet a `user_preferences.active_budget_plan_id` adja (fallback: `is_active`, majd legutóbbi). A `budget_data` élesben mind `{version:"v2", categories:[{name, items:[{amount,…}]}]}` formátumú; `total_amount` == Σ allokáció (zero-based), `actual_income` jelenleg NULL.

- [x] `src/lib/budget.ts`:
  - `getCurrentBudgetPlan()` → pref `active_budget_plan_id` → `is_active=true` → legutóbbi
  - `normalizeBudgetData()` → mind a 3 `budget_data` formátum (`BudgetItem[]` | `BudgetCategory[]` | `{categories}`) egységesítése `BudgetCategorySummary[]`-vé (any-mentes, biztonságos parserek)
  - `getSavingsGoals()` → `savings_goals` (numeric → number)
  - `summarizeBudget()` → keret = `actual_income ?? total_amount`, allocated = Σ kategória, remaining, hasIncome
- [x] Típusok: `BudgetPlan`, `BudgetCategory`, `BudgetItem`, `BudgetStorageV2`, `BudgetCategorySummary`, `BudgetSummary`, `SavingsGoal` → `src/types/index.ts`
- [x] `src/store/budgetStore.ts` (zustand): cache + `getSessionSafe` + üres/hiba retry (priceStore-minta), `loadBudget()`, `getSummary()`
- [x] Kezdőlap Kassza-kártya bekötve (`BudgetCard` summary prop): havi keret + kategóriaszám; rögzített bevétel esetén szabad keret (negatív → `warning`)
- [x] Kassza tab (`src/app/(tabs)/kassza.tsx`): összegző kártya + kategória-bontás (`BudgetCategoryRow`, arány-sáv) + megtakarítási célok progress (`SavingsGoalRow`, cél saját színe); pull-to-refresh, loading/üres állapot
- [x] Túlköltés/túltervezés → `warning` szín; `formatHuf` mindenhol
- [x] Csak olvasás — a Kassza nem ír a budget táblákba
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon

---

## 5b. Wallet-integráció – valós havi költés a Kasszában — ✅ KÉSZ (2026-06-22)

> **Felhasználói döntések:** (1) adatfolyam = **Edge Function élő proxy** a BudgetBakers Wallet REST API-hoz; (2) nézet = **tervezett vs. valós, kategóriánként**; (3) a Kezdőlap Kassza-kártyája is valós elköltöttre vált; (4) a per-kategória bekötés **név-alapú koncepció-mappinggel** (jóváhagyott térkép).

**Kritikus finding-ok (ellenőrzött, élő Wallet — BudgetBakers, base HUF):**
- A BudgetBakers Walletnek **van REST API-ja** (`https://rest.budgetbakers.com/wallet/v1/api`, `Authorization: Bearer <token>`, Premium funkció, 300 kérés/óra). **Nincs** aggregáló végpont → a függvény a `GET /records`-ot lapozva (200/lap) maga összegzi.
- A `budget_data.walletCategories` UUID-jei **ELAVULTAK** — nem egyeznek az élő Wallet kategória-ID-kkel (a Wallet ma ~89 base kategória + 1 custom „Mamci"). Ezért az ID-join nem működik → **stabil, globális base-kategória ID-kre** képezünk (`CATEGORY_MAP`).
- A nyers havi expense-összeg tartalmazza a **belső átvezetéseket** (Transfer ~2,3M Ft júniusban) → ezeket (Transfer/Debt/Shopping list) **kihagyjuk**; a térképen kívüli tételek az „Egyéb" alá esnek. Júniusi valós költés ≈ 1,37M Ft (3,67M összes − 2,31M átvezetés), reális a ~1,1M tervhez.

**Implementáció:**
- Edge Function `supabase/functions/wallet-spending/` (deploy-olva, `verify_jwt`): Supabase JWT-hitelesítés → `GET /records` (expense, hónap-ablak, `convertTo=base`, lapozott) → Wallet→terv `CATEGORY_MAP` szerint **terv-kategória NÉV** szerint összegez (átvezetések kihagyva) → `{ month, currency, byCategory, totalSpent, syncedAt }`. A `BUDGETBAKERS_API_TOKEN` Supabase secret (kliensre soha).
- Típusok (`src/types`): `WalletSpending`; `BudgetCategorySummary.spent`; `BudgetSummary` bővítés (`totalSpent`, `remainingAfterSpent`, `hasSpending`).
- `src/lib/budget.ts`: `getWalletSpending(month)` (`functions.invoke`), `currentMonthStart()`, `summarizeBudget(plan, spending?)` — egyszerű név-join + valós szabad keret.
- `src/store/budgetStore.ts`: a spending **best-effort** (sosem blokkolja a tervezési nézetet; token/hiba esetén a tervezési nézet marad), havonkénti cache.
- UI: `BudgetCategoryRow` (terv vs. valós + felhasználás-sáv, túllépés → `warning`), Kassza fejléc (Elköltve / Szabad keret), `BudgetCard` (valós elköltött), `index.tsx` spending átadás.
- Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon.

**⚠️ Élesítéshez MANUÁLIS lépés (kívülről kell):** a felhasználó (1) generál egy **személyes Wallet API tokent** a Wallet web Settings → API alatt (Premium), majd (2) beállítja Supabase secretként: `BUDGETBAKERS_API_TOKEN`. Amíg nincs beállítva, a függvény `CONFIGURATION_ERROR`-t ad, és az app **automatikusan a tervezési nézetre esik vissza** (nincs regresszió).

**Kategória-részletező (drill-down, 2026-06-22):** a Kassza kategória-sorára koppintva a tételes költés nyílik. A `wallet-spending` Edge Function `detail` módja (`body: { month, detail: <kategórianév> }`) a hónap tételeit ahhoz a kategóriához szűrve, **Wallet-alkategória szerint csoportosítva** adja vissza (magyar címkék a `SUBCATEGORY_HU` mapből), azon belül a tételek (jegyzet/partner · dátum · összeg, csökkenő sorrend).
  - Típusok: `WalletCategoryDetail`/`WalletSpendingGroup`/`WalletSpendingRecord`. `getWalletSpendingDetail(month, category)` (`src/lib/budget.ts`).
  - UI: `CategorySpendingSheet` (BottomSheet full, loading/üres/hiba állapot); `BudgetCategoryRow` koppintható + chevron, ha van valós adat; `kassza.tsx` állapot + sheet bekötés.
  - Deploy: `supabase functions deploy wallet-spending --use-api` (Docker nélkül, szerveroldali bundling) — a deploy-olt verzió a repo-fájl pontos mása.

**Megjegyzések / korlátok:**
- A `CATEGORY_MAP` (és a `SUBCATEGORY_HU`) ehhez a konkrét tervhez (és kategória-nevekhez) van hangolva — v1 single-user. Ha a terv kategórianevei változnak, a térképet frissíteni kell.
- A deploy-olt függvény azonos a repo-fájllal (CLI `--use-api` deploy a forrásból); a repo a kanonikus forrás.

**Tényleges bevétel megjelenítése a Kasszában (2026-06-28):** a Kassza tab és a Kezdőlap Kassza-kártyája mostantól a Wallet tényleges havi bevételét mutatja (nem a tervezett keretet), és abból számolja a szabad keretet. A `wallet-spending` Edge Function (version 7) income rekordokat is lekér (`recordType=income`, transfer kihagyva) → `totalIncome` a válaszban. `WalletSpending.totalIncome` + `BudgetSummary.totalIncome`/`hasActualIncome` típusok. `summarizeBudget`: keret = `totalIncome` ha > 0, különben fallback a tervezett keretre. UI: `hasActualIncome` esetén „Havi bevétel + Kiadás + Szabad keret"; `BudgetCard` felirata „Kiadás" (volt: „Elköltve"). tsc/lint tiszta.

---

## 6. Naptár — ✅ KÉSZ (2026-06-21)

- [x] Migráció: `calendar_events` (`user_id`, `created_by`, `title`, `description`, `location`, `starts_at`, `ends_at`, `all_day`, `member_id`, `color`, `rrule`) + RLS `user_id = auth.uid()` (select/insert/update/delete own) + `updated_at` trigger → `supabase/migrations/20260621120000_calendar_events.sql` (alkalmazva a közös projektre)
- [x] Típus `CalendarEvent` + `CalendarEventInput` → `src/types/index.ts`
- [x] `src/lib/calendar.ts`: dátum-helperek (helyi idő, `buildMonthMatrix`, `dayKey`/`eventDayKey`, `monthTitle`, `agendaDayLabel`, `eventTimeLabel`, `shortDateLabel`, `combineDateTime`) + CRUD (`fetchEvents`/`insertEvent`/`patchEvent`/`removeEvent`)
- [x] `src/store/calendarStore.ts` (zustand): cache + `getSessionSafe` + üres/hiba retry (budgetStore-minta), optimista create/update/delete
- [x] `src/app/(tabs)/naptar.tsx`: saját hónap nézet (`MonthGrid`, reanimated fade hónapváltáskor, tagszínes pöttyök max 3) + hónap-navigáció + „Ma" gomb + napi agenda (`AgendaEvent`, üres állapot) + FAB
- [x] Esemény létrehozó/szerkesztő sheet (`EventSheet`): cím, egész napos toggle, kezdet/vég dátum+idő (saját `DateTimePickerModal` — nincs új dependency), színválasztó, hely, jegyzet; szerkesztésnél törlés (Alert megerősítéssel)
- [x] Kezdőlap „Ma" kártya bekötve (mai események a `calendarStore`-ból)
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [x] **Esemény-kártya stílus fix** (`AgendaEvent`, 2026-06-21): a kártya stílusai nem érvényesültek. Gyökérok ugyanaz a NativeWind v4 gotcha, mint a dashboardnál — a `Pressable` **függvény-formájú `style`-jának statikus property-jei** (`borderRadius`, `paddingVertical`, `marginBottom`, shadow) **eldobódnak** `className` mellett. Javítás: a kártya-stílusok belső `View`-ra kerültek (objektum-style + `bg-card` className), a `Pressable` függvény-style-ja csak `opacity`-t kezel
- [x] **Családtag-hozzárendelés eseményhez (2026-06-22, korábban v2.x-re halasztva):** az `EventSheet` „KINEK" tag-választó chipsort kapott (Közös + a lokális `memberStore` tagjai + „Tagok" kezelő gomb → `MemberEditorSheet`), az étrend tag-mintáját követve. A kiválasztott tag színe lesz az esemény alapszíne (a meglévő színválasztó megmarad felülírásként, a CLAUDE.md `color` „felülírja a tag színt" döntése szerint). A `member_id` mostantól mentődik (lokális tag-id; az `uuid` oszlopba illik). Megjelenítés: az agenda-kártya jobb oldalán tagszínes pötty + tagnév (`AgendaEvent.memberName`), a Kezdőlap „Ma" kártyáján a `who` mező a tagnévre tölt. **Eltérés/finding:** v1 single-user → a tagok a lokális `memberStore`-ból jönnek (nincs DB-családtábla, `profiles` üres); a `member_id` a lokális tag-id, a család-megosztással szinkronizálható (v2.x).
- [x] **Ismétlődő esemény (`rrule`) (2026-06-22, korábban v2.1-re halasztva):** az `EventSheet`-be preset-választó (Nincs / Naponta / Hetente / Havonta / Évente) + **Egyéni intervallum** + opcionális „Ismétlődés vége" dátum (Soha / dátum). A `rrule` (RFC 5545 részhalmaz: `FREQ`+opcionális `INTERVAL`+`UNTIL`) felkerült a `CalendarEventInput`-ra és mentődik; a store optimista create-je az inputból veszi (a korábbi hardcode `rrule:null` megszűnt). `src/lib/calendar.ts`: `buildRRule(freq, interval, until)`/`freqFromRRule`/`intervalFromRRule`/`untilFromRRule`/`recurrenceLabel` + `expandEvents(events, rangeStart, rangeEnd)` — a tárolt EGY sort a látható ablakra bontja konkrét előfordulásokká (a mester `id`-jét őrzi → a szerkesztés a mestert nyitja eredeti kezdettel; a parser `INTERVAL`/`COUNT`-ot is olvas, az induló indexet az ablak elejére ugratja a hosszú ciklusok ellen). A `naptar.tsx` (hónap-grid pöttyök + napi agenda) és a Kezdőlap „Ma" kártyája kibontott eseményeken dolgozik; az agenda-kártya ismétlődő esemény mellett `Repeat` ikont mutat; a törlés Alertje jelzi, ha ismétlődő (minden előfordulás törlődik). **v1 korlát:** „csak ez az előfordulás" / „ezután mind" szerkesztés nincs — az ismétlődő esemény mindig egészként szerkesztődik/törlődik. Migráció NEM kellett (`rrule`/`member_id` oszlop már létezett). tsc nem hozott új hibát, lint 0 az érintett fájlokon.
  - **Egyéni intervallum (műszakbeosztás, 2026-06-22):** az „Egyéni" chip megnyit egy „minden N nap/hét/hónap/év" szerkesztőt (szám-input + egység-chipek), élő előnézettel (pl. „6 hetente"). **Műszakciklus-workflow:** egy 6 hetes beosztáshoz minden műszaknapot a saját dátumára viszel fel és **minden 6 hét** ismétlődőre állítasz (`FREQ=WEEKLY;INTERVAL=6` ugyanazt a hétköznapot adja vissza 6 hetente) — így a teljes rotáció leképezhető. Az `expandEvents` az `INTERVAL`-t már kezeli.
- [x] **Edzések megjelenítése a családi naptárban (2026-06-26):** a kettlebell (Underground KB) app a telefon naptárába írja a tervezett edzéseket; ezeket a familyshopping **csak olvasásra** megjeleníti, hogy a család lássa a tervezett edzés-programokat. `src/lib/deviceCalendarSync.ts` – `getWorkoutEventsInRange(startISO,endISO)` (a „Underground KB edzések" device-naptár eseményei, engedély nélkül üres tömb). `src/store/deviceWorkoutStore.ts` (új, zustand) – széles ablakra (−2 … +13 hó) tölt, `dev:` id-előtaggal `CalendarEvent`-té képezve (`isDeviceWorkout` jelölő). `src/app/(tabs)/naptar.tsx` – a `workouts` a kibontott eseményekhez fűzve (pötty + agenda), a szerkesztő kihagyja a `dev:` eseményeket (read-only), az agenda-kártyán „Edzés" címke. `src/app/(tabs)/index.tsx` – a „Ma" kártya a mai edzéseket is mutatja. **Nincs új migráció / új tábla** – a device naptár a közös csatorna a két (külön Supabase projektű) app közt. tsc/lint tiszta az érintett fájlokon.
- [x] **Műszak-export a telefon naptárába (2026-06-25):** a generált műszakok mostantól a natív iOS/Android naptárba is kikerülnek, hogy a **külön Supabase projektben futó** appok (pl. az Underground KB edzésnaptár) is olvashassák őket — a device naptár a közös csatorna. Új dependency: `expo-calendar ~15.0.8` (felhasználói jóváhagyással; `app.json` plugin + `NSCalendarsUsageDescription`; `npx pod-install` → ExpoCalendar 15.0.8 linkelve, **Xcode/`npx expo run:ios` újrabuild szükséges**). Új: `src/lib/deviceCalendarSync.ts` (`ensureCalendarPermission`, saját „Műszakok (FamilyHub)" naptár, `syncShiftsToDevice` — a naptárat minden szinkronnál újraépíti és heti-ismétlődő eseményeket ír ki `recurrenceRule`-lal `INTERVAL = ciklushossz`, `clearShiftsFromDevice`). `src/app/muszak.tsx`: a Generálás a Supabase mentés után a device naptárba is kiír (nem-kritikus, külön try/catch + info toast engedély hiányában), a „Generált műszakok törlése" a device naptárat is takarítja. **v1 korlát:** a Supabase és a device naptár külön él (a sablon a `generatedEventIds`-szel a Supabase-t követi); a device oldalt a wipe+rewrite tartja szinkronban. tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon.
- [x] **Műszaksablon-generátor (2026-06-22):** a kézi „minden napot külön" workflow helyett egy sablonból legyártható a teljes rotáció. Belépő: a Naptár fejléc `CalendarClock` gombja → `/muszak` képernyő. Tartalom: (1) **műszaktípusok** szerkesztője (név · kezdet/vég idő · szín; hozzáadás/törlés) — lokális; (2) **ciklus** beállítás (hossz hetekben 1–12, ciklus-kezdő hétfő dátumpicker hétfőre snappel, „kihez tartozik" tag-választó); (3) **beosztás rács** (cycleWeeks × 7, ecset-alapú festés: válassz műszakot vagy „Pihenő", koppints a napokra); (4) **Generálás/Frissítés/Törlés**. A generálás minden kiosztott naphoz egy heti-ismétlődő `calendar_events` sort hoz létre (`FREQ=WEEKLY;INTERVAL=cycleWeeks`; az éjszakás műszak vége másnapra esik), **stabil kliens-oldali id-vel** (a sablon a `generatedEventIds`-ben követi → a Frissítés cseréli, a Törlés eltávolítja őket). Új: `src/types` (`ShiftType`, `ShiftSchedule`), `src/lib/shifts.ts` (`buildShiftEvents`/`mondayOf`/`resizeDays`/`defaultShiftTypes`…), `src/store/shiftStore.ts` (lokális, AsyncStorage `familyhub_shifts_v1`, seed: Délelőttös/Délutános/Éjszakás), `calendarStore.createEventsWithIds`/`deleteEvents` (bulk, explicit id), `calendar.ts` `insertEvents`/`removeEvents`, `src/app/muszak.tsx` (+ route a root `_layout`-ban). **Migráció NEM kellett** (a generált sorok sima `calendar_events`-ek). **v1 korlát:** a sablon single-user/lokális; ciklus-rövidítés után a régi generált események a következő Generálásig/Törlésig a naptárban maradnak (de a `generatedEventIds` követi őket). tsc nem hozott új hibát, lint 0 az érintett fájlokon.
- [x] **Bugfix – ExpoCalendar crash induláskor + Release build (2026-06-26):** az `expo-calendar` indításkor az Emlékeztetőket (Reminders) is ellenőrzi, de csak a Calendar usage description-ök voltak megadva → `MissingCalendarPListValueException` a `RemindersPermissionRequester.getPermissions()` láncban. Javítás: `ios/familyshopping/Info.plist` + `app.json` (`ios.infoPlist`) – `NSRemindersUsageDescription` + `NSRemindersFullAccessUsageDescription`; `app.json` expo-calendar plugin – `remindersPermission`. Telefonra Release build a beágyazott JS bundle-lel (`npx expo run:ios --device <UDID> --configuration Release`) – Metro nélkül fut. Telepítési parancsok: `TELEPITES.md` (gyökér). Megj.: 7 napos ingyenes (personal team) aláírás → ~7 naponta újratelepítés.

---

## 7. Étkezéstervező — ✅ KÉSZ (2026-06-21)

- [x] Migráció: `meal_plan_entries` (`user_id`, `created_by`, `date`, `meal_type` check `reggeli|ebéd|vacsora`, `recipe_id`, `servings`) + unique `(user_id, date, meal_type)` + RLS `user_id = auth.uid()` (select/insert/update/delete own) → `supabase/migrations/20260621130000_meal_plan_entries.sql` (alkalmazva a közös projektre)
- [x] Típusok `MealType`, `Recipe`, `RecipeIngredient`, `MealPlanEntry`, `MealPlanEntryInput` → `src/types/index.ts`
- [x] `src/lib/recipes.ts` — hét-helperek (`startOfWeek`/`weekDays`/`weekRangeLabel`/`isoWeekNumber`/`weekdayFull`/`dayDateLabel`), `MEAL_TYPES`, recept+hozzávaló olvasás (`fetchRecipes`/`fetchIngredients`), entry CRUD (`fetchMealPlanEntries`/`upsertMealPlanEntry`/`deleteMealPlanEntry`), `buildShoppingItems` aggregálás (üres állapot kezelve). RLS-finding: `recipe_ingredients` olvasható a saját recept tulajdonjogán keresztül (nincs `user_id` oszlopa)
- [x] `src/store/mealPlanStore.ts` (zustand): cache + `getSessionSafe` + üres/hiba retry (calendarStore-minta), optimista `assignRecipe` (upsert a sloton) / `removeEntry`
- [x] `src/app/(tabs)/etrend.tsx`: heti nézet (H–V, `DayCard`/`MealRow`), hét-váltó + ISO hétszám, recept napra/étkezésre rendelése slot-koppintással (`RecipePickerSheet`), napi kijelölő checkbox (alapból a tervezett napok kijelölve, kizárás-alapú)
- [x] **Bevásárlólista generálás:** kiválasztott napok `recipe_ingredients`-einek összevonása (név+egység szerint, `servings` arányosítással a recept alap-adagjához) → **új `ShoppingList` a familyshopping `shopping_lists` táblájába** (`listStore.createListWithItems`, kategória `inferCategory`-val)
- [x] Generált lista aktívvá tétele + megnyitása (`/lista/[id]`) + success toast/haptika; üres kijelölésnél figyelmeztetés
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [x] **Eltérés a mockuptól (v1 döntés):** a recept-hozzárendelés **drag-and-drop helyett slot-koppintással** történik (koppints egy étkezésre → `RecipePickerSheet` → recept kiválasztása). Indok: minimális működő verzió, nincs új gesztus-dependency. A „Receptkönyv" chip a recepteket böngésző módban nyitja. Az adagszám-szerkesztő elhalasztva (a recept alap `servings` értékét vesszük) — a `buildShoppingItems` az arányosítást már kezeli.
- [x] **Recept létrehozás/szerkesztés a mobilban (2026-06-21, scope-bővítés):** korábban a receptek csak olvashatók voltak (a familybudget weben kellett felvinni őket); a Receptkönyvben most **közvetlenül létrehozható/szerkeszthető/törölhető** recept. Ellenőrzött: a `recipes`/`recipe_ingredients` RLS engedi a saját sorok írását (insert/update/delete `user_id = auth.uid()`), és mindkét FK (`recipe_ingredients`, `meal_plan_entries`) `ON DELETE CASCADE` → migráció nem kellett.
  - `RecipeInput`/`RecipeIngredientInput` típusok → `src/types/index.ts`
  - `insertRecipe`/`updateRecipe`/`deleteRecipe`/`replaceIngredients` → `src/lib/recipes.ts` (hozzávaló-csere = régiek törlése + újak beszúrása)
  - `mealPlanStore`: `saveRecipe(input, ingredients, id)` + `deleteRecipe(id)` — írás session-kötött (a hozzávaló-FK miatt nincs offline-optimista út); törléskor a cache-ből a recept + hozzávalói + étrend-tételei is kikerülnek (szerveroldali CASCADE tükrözése)
  - `RecipeEditorSheet` (új): név, adag, idő, hozzávaló-szerkesztő (név · mennyiség · egység, sorhozzáadás/-törlés), leírás, elkészítés; mentés/törlés Alert-megerősítéssel; csak a kitöltött (név + pozitív mennyiség + egység) hozzávalósorok mentődnek
  - `RecipePickerSheet`: „Új recept" gomb mindkét módban; böngésző módban a sorok koppintásra a szerkesztőt nyitják (ceruza-affordancia); üres állapot szövege átírva (már nem a familybudget webre utal)
  - **Megjegyzés:** ez felülírja a CLAUDE.md „Out of scope (v2) – Recept-szerkesztés a mobilban" tételét (felhasználói döntés). tsc/lint tiszta az érintett fájlokon
- [x] **Tagonkénti, több tételes étrend + termékár-bekötés (2026-06-21, scope-bővítés):** korábban egy slot (nap+étkezés) = pontosan egy recept; mostantól egy slothoz tetszőleges számú tétel rendelhető, tagonként, és a tétel lehet **recept VAGY nyers termék** (pl. „80g pur-pur vekni"). A recept-hozzávalók termékkatalógushoz köthetők → a generált bevásárlólistába a **termék ára** is bekerül.
  - **Felhasználói döntések:** (1) tagok = lokális, appban szerkeszthető store; (2) slot = recept ÉS termék, tagonként; (3) migráció a közös DB-re alkalmazva.
  - Migráció `supabase/migrations/20260621140000_meal_plan_per_member_and_products.sql` (alkalmazva): `recipe_ingredients.product_id` (FK → products, ON DELETE SET NULL); `meal_plan_entries` átalakítás — unique `(user_id,date,meal_type)` eldobva, `recipe_id` nullable, új oszlopok `member_id text`, `item_name text`, `product_id uuid`, `quantity numeric`, `unit text` + check `recipe_id is not null or item_name is not null`
  - Típusok (`src/types`): `FamilyMemberLocal`; `MealPlanEntry/Input` bővítés (member_id/item_name/product_id/quantity/unit, recipe_id nullable); `RecipeIngredient(+Input).product_id`
  - `src/store/memberStore.ts` (új): lokális tag-store (zustand + AsyncStorage), seed Apa/Anya/Kevin/Kira (tagszínekkel), add/update/remove. **Eltérés/finding:** v1 single-user, `profiles` üres → a `member_id` a lokális tag-id (nincs DB-családtábla); a család-megosztással szinkronizálható (v2.x)
  - `src/lib/recipes.ts`: `upsertMealPlanEntry` → `insertMealPlanEntry` (több tétel/slot → nincs onConflict); `buildShoppingItems` bővítve (recept-hozzávaló + nyers termék tétel; `productsById`-ből egységár + product_id a listatételbe); hozzávaló `product_id` olvasás/írás
  - `src/store/mealPlanStore.ts`: `assignRecipe` → `addEntry(input)` (általános, recept vagy termék); `removeEntry` változatlan
  - UI: `ProductPickerSheet` (új, kereshető termék-lista árral, újrahasznosított); `MealEntrySheet` (új — tag-választó chipek + Recept/Termék mód; recept-lista vagy katalógus-termék/szabad szöveg + mennyiség/egység; több tétel egymás után); `MealRow` átírva (slotonként tétel-lista tagszínes pöttyel + összegárral + tétel-törlés + „Tétel hozzáadása"); `DayCard` propok (entries lista, membersById, productsById); `MemberEditorSheet` (új — tagok hozzáadás/átnevezés/szín/törlés); `RecipeEditorSheet` hozzávaló-soronkénti termékhez kötés (Tag gomb → ProductPickerSheet, link-chip árral, kötés bontható). Az étrend slot-koppintása mostantól a `MealEntrySheet`-et nyitja; a „Receptkönyv" chip a `RecipePickerSheet`-et böngésző módban (recept-kezelés)
  - Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon

---

## Visszamaradt v0.1 feladatok (nyitott, beolvasztva)

> A Bevásárló v0.1-ből át nem fejlesztett, még nyitott tételek. Prioritás a v2 funkciók (1–7) után, hacsak nem blokkolnak.

**Auth / Profil:**

- [x] **01c – ForgotPassword** képernyő — már létezik és működik (`src/app/(auth)/forgot-password.tsx`, `resetPasswordForEmail` + „email elküldve" állapot). **Megjegyzés:** még a v0.1 dizájnt (hardcode hex/StyleSheet) használja; a v2 token-redesign külön, alacsony prioritású UI-adósság (nem blokkol).
- [x] **Profil push-célok valódi sub-screenjei (2026-06-26):** a korábbi placeholder `notImplemented` Alertek helyett valós képernyők, v2 token-dizájnnal, közös `SettingsScaffold` fejléccel (`src/components/profil/`):
  - **Profil szerkesztése** (`profil-szerkesztes.tsx`) — teljes név mentése `supabase.auth.updateUser({ data: { full_name } })`-val (email read-only); az `onAuthStateChange` frissíti a store-t
  - **Jelszó módosítása** (`jelszo-modositas.tsx`) — `updateUser({ password })`, min. 6 karakter + megerősítés-egyezés validáció
  - **Értesítések** (`ertesitesek.tsx`) — lokális preferenciák (Switch) `notificationPrefsStore` + AsyncStorage (`StorageKeys.notificationPrefs`); naptár/ár/bevásárlás kapcsolók. **v1 korlát:** csak a beállítást tároljuk, a tényleges push-ütemezés a v2.1 (out of scope) — a képernyő ezt jelzi
  - **Adatvédelem** (`adatvedelem.tsx`) + **Felhasználási feltételek** (`feltetelek.tsx`) — statikus tartalom közös `LegalSections` renderelővel
  - Route-ok regisztrálva a root `_layout.tsx`-ben; a Profil sorok bekötve (`router.push`). tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [~] **12 – FamilySettings** (családtagok, megosztás) — a képernyő (`src/app/family-settings.tsx`) már létezik (familyStore: meghívó link, szerepkörök, tag-eltávolítás), de a **v0.1 `family_id`/szerepkör modellre** épül, ami **ütközik a v1 `user_id`-scoped döntéssel** (profiles üres). A valódi család-megosztás + a v2 token-redesign szándékosan **v2.x** — most nem nyúlunk hozzá (a CLAUDE.md „meglévő UI módosítása → előbb kérdezz" szabálya szerint is)

**Általános UI:**

- [ ] **PickerScreen** (generikus: bolt / kategória / egység)
- [ ] Typed ParamList-ek (`navigation/types.ts`)

**OCR deploy (függőben):**

- [ ] `supabase functions deploy ocr-receipt` + migráció futtatása (`supabase db push`) — a kliens az `ocr-receipt`-et hívja; a régi `supabase/functions/ocr/` mappa elavult
- [x] **OCR ÚJRADEPLOY megtörtént (2026-06-22):** az `ocr-receipt` Edge Function **version 6**-ra deploy-olva (a korábbi élesben futó verzió még a 2026 áprilisi OpenAI-os volt, tanuló réteg nélkül — a CLI deploy sosem ment át; most MCP-n keresztül deploy-olva a repo-tükör). Tartalmazza: Claude Haiku 4.5 + `raw_name` tanulás + structured outputs.
- [ ] **⚠️ SECRET ellenőrzés:** `ANTHROPIC_API_KEY` Supabase secret beállítva legyen (Anthropic Console + feltöltött kredit). Enélkül `CONFIGURATION_ERROR`; ekkor a kliens a kézi bevitelre vált. A régi `OPENAI_API_KEY` már nem kell.

**OCR modellváltás: GPT-4o-mini → Claude Haiku 4.5 — ✅ KÉSZ (kód), deploy függőben (2026-06-22):**

> **Indok:** a GPT-4o-mini gyenge a magyar, gyűrött blokkokon (a felhasználó panasza). A Claude Haiku 4.5 erősebb víziómodell, kedvező áron (~3,5 Ft/blokk a ~7 Ft/gpt-4o-hoz képest). Felhasználói döntés.

- [x] `supabase/functions/ocr-receipt/index.ts`: az OpenAI `chat/completions` hívás lecserélve az Anthropic Messages API-ra (`https://api.anthropic.com/v1/messages`, `x-api-key` + `anthropic-version` header), modell `claude-haiku-4-5`, `temperature: 0`. Nyers `fetch` (nincs új dependency, a meglévő OpenAI-hívás mintáját követi).
- [x] **Structured outputs** (`output_config.format` json_schema-val) → garantáltan valid JSON, kiesik a `PARSE_ERROR` ág. A séma a `raw_name`/`name`/mennyiség/ár/kategória/confidence mezőket kényszeríti (nullable mezőkkel, `additionalProperties: false`).
- [x] Válasz-feldolgozás átírva az Anthropic `content[]` (text blokk) alakjára; `stop_reason === "refusal"` kezelve. A normalizálás (raw_name, clamp, nem-termék szűrés) változatlan.
- [x] Secret: `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`; a config-error üzenet frissítve.
- [ ] **Élesítés:** `ANTHROPIC_API_KEY` secret beállítása + `ocr-receipt` újradeploy.

**OCR tanuló réteg javítása — ✅ KÉSZ (kód), deploy függőben (2026-06-22):**

> **Bejelentett tünet:** „az OCR pontatlan, és a javító algoritmus nem működik — a blokkok beolvasása után sem javul." **Gyökérok:** a tanuló glosszárium (`ocr_corrections`) a ROSSZ tokenre tanult. A `rawName` (amit a glosszárium kulcsának hittünk) valójában a modell MÁR KIBŐVÍTETT nevének másolata volt (`ocrStore.setOcrResponse: rawName: item.name`), nem a blokkon betűhíven szereplő rövidítés. A modell az adott rövidítést (`"Parad.koktél"`) blokkról blokkra eltérően bővítheti → a glosszárium bal oldala (egy korábbi kibővített kitalálás) ritkán egyezett az új scan-nel → a tanulás gyakorlatilag sosem sült el.

- [x] Edge Function (`supabase/functions/ocr-receipt/index.ts`): a JSON-séma + prompt új `raw_name` mezővel — a terméksor BETŰHÍVEN, rövidítésekkel (csak ÁFA-kód/cikkszám/ár-rész/„Ft" levágva), a `name` marad a tiszta/kibővített név. A glosszárium-blokk a `raw_name`-re kulcsol, és utasítja a modellt: ha egy tétel `raw_name`-je (kis-/nagybetűtől eltekintve) egyezik egy szótár-kulccsal, a `name` KÖTELEZŐEN a kanonikus név. A parser visszaadja a `raw_name`-et (fallback a tiszta névre).
- [x] Kliens: `OCRItem.rawName` (a blokkon látható szöveg) + `ReviewItem.suggestedName` (a modell eredeti javaslata); `lib/ocr.ts` átveszi a `raw_name`-et; `ocrStore` NEM írja felül a `rawName`-et a tiszta névvel; `review.tsx` `recordCorrections` csak akkor rögzít, ha a user TÉNYLEGESEN javított (`name !== suggestedName`) — így nem szennyezzük a szótárat a modell saját auto-bővítéseivel, és a stabil nyers token lesz a kulcs.
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 error az érintett fájlokon.
- [ ] **Élesítés:** `ocr-receipt` újradeploy (a tanulás csak a deploy után kezd működni); meglévő `ocr_corrections` sorok a régi (kibővített) kulccsal maradnak — ezek ártalmatlanok, de nem fognak illeszkedni; idővel a helyes nyers kulcsok feltöltődnek.

**Wallet-integráció (élesítés, függőben):**

- [ ] `BUDGETBAKERS_API_TOKEN` Supabase secret beállítása (személyes Wallet API token a Wallet web Settings → API-ból, Premium). A `wallet-spending` Edge Function már deploy-olva; token nélkül a Kassza a tervezési nézetre esik vissza.

**Tech adósság (alacsony prioritás):**

- [ ] `screens/` mappa szerkezet bevezetése (jelenleg az üzleti logika az `app/` mappában van)

---

## Adatbázis (közös Supabase projekt) — állapot

**Megvan (familyshopping, írjuk/olvassuk):**
- [x] `shopping_lists`, `products`, `product_price_history`, `shopping_statistics`, `ocr_corrections`

**Megvan (familybudget, CSAK olvassuk):**
- [x] `budget_plans`, `annual_budget_plans`, `savings_goals`

**Megvan (familybudget, olvassuk + írjuk a saját sorokat — RLS `user_id`):**
- [x] `recipes`, `recipe_ingredients` (2026-06-21 óta a Receptkönyvből létrehozható/szerkeszthető/törölhető); `recipe_ingredients.product_id` (FK → products) a termékár-bekötéshez

**Új (létrehozandó) — v1 RLS: `user_id = auth.uid()` (NEM family_id):**
- [x] `calendar_events` (RLS: `user_id`) — létrehozva és alkalmazva (2026-06-21)
- [x] `meal_plan_entries` (RLS: `user_id`) — létrehozva és alkalmazva (2026-06-21); tagonkénti/több tételes átalakítás (recipe_id nullable, member_id/item_name/product_id/quantity/unit) alkalmazva (2026-06-21)

**Lokális (nincs DB — AsyncStorage, v1 single-user):**
- [x] `familyhub_members_v1` — családtagok (név + tagszín) az étrend tagonkénti tételeihez + a naptár esemény-hozzárendeléséhez; család-megosztáskor szinkronizálandó (v2.x)
- [x] `familyhub_shifts_v1` — műszaksablon (műszaktípusok + ciklus-beosztás + generált esemény-id-k); a generált események valódi `calendar_events` sorok

---

## Ship előtt

- [ ] Teljes flow éles iOS eszközön (Kezdőlap → Naptár → lista generálás étrendből → Bolt mód)
- [ ] Bolt mód boltban, valós körülmények közt (új háttérszín ellenőrzés)
- [ ] Edge case-ek: üres állapot minden tabon, hosszú magyar szöveg, nincs net, lassú net
- [ ] `budget_data` 3 formátuma valós adattal tesztelve
- [x] Lint + typecheck hibamentes (2026-08-28): `tsc --noEmit` tiszta; `expo lint` 0 error / 8 warning
      (starter-sablon maradék `SymbolView name` objektumok stringre, `useColorScheme() ?? 'light'`, `handoff/` kizárva a typecheckből)
- [ ] Dev segédeszközök eltávolítva (mock adat, console.log)
- [ ] Secrets ellenőrzés (kliens bundle + git history)
- [ ] `backlog.md` frissítve
- [x] EAS setup kész (2026-08-28): `eas.json` (development/preview/production profilok),
      EAS projekt `@katsa00781/familyshopping`, `expo-updates` + EAS Update (fingerprint runtime policy),
      `EXPO_PUBLIC_*` változók feltöltve az EAS környezetekbe, expo-doctor 18/18. Részletek: `TELEPITES.md`
- [x] EAS Build → TestFlight (2026-08-29): `1.0.0 (2)` build fent, saját iPhone-ra telepítve.
      ASC app: `FamilyHub (7ad880)`, kezdőképernyőn `FamilyHub`. A build 90 nap múlva lejár.
- [ ] TestFlight tesztelők (a család többi tagja) meghívása az App Store Connectben
- [x] Új app ikon + splash (2026-09-04): a `assets/images/App Icon-selection.png` (kék gradiens,
      fehér bevásárló-táska + lista) lett az app ikon. `assets/images/icon.png` felülírva (1024², alfa
      nélkül – App Store-kompatibilis); ez fedi az `expo.icon`, `ios.icon` és `constants/images.ts`
      `images.logo` hivatkozást is. Android: `android-icon-foreground.png` = a glyph a safe zone-ba
      igazítva, `adaptiveIcon.backgroundColor` `#2563EB`, `backgroundImage` eltávolítva,
      `android-icon-monochrome.png` = táska-sziluett a témázott ikonhoz. Splash (`expo-splash-screen`
      plugin): `image` = új `splash-icon.png` (átlátszó hátterű glyph, floodfill-lel kivágva),
      `imageWidth` 200, `backgroundColor` `#2563EB` (light+dark). **Natív változás → új build kell**
      (nem OTA): a telefonon csak EAS Build → TestFlight után jelenik meg.
- [x] Session-hidratálás javítva — "csak ki/bejelentkezés után látszanak az adatok" (2026-08-30):
      Supabase edge_logs bizonyíték: 08-29 login után 1 mp-en belül lefut mind a 9 REST GET;
      08-30 meleg indításkor a token-refresh 200-as, de **egyetlen REST GET sem megy ki** —
      miközben egy perccel később a felhasználói írás (POST calendar_events) átment.
      Ok: a GoTrue `initialize()` (AsyncStorage + lejárt token frissítése) aszinkron, a
      `getSessionSafe()` viszont csak 250 ms-ot várt rá → minden store "nincs session"-re
      jutott és el sem küldte a lekérdezést. Javítás: `INITIAL_SESSION` eseményre várunk
      (8 mp vészfék-timeout), single-flight `refreshSession()` a rotáló refresh token
      versenyhelyzete ellen, és az `isInvalidRefreshToken` regex szűkítve (az átmeneti
      "Already Used" többé nem léptet ki lokálisan).
- [x] Első EAS Update (OTA) kiadva (2026-08-29): `production` branch/channel, iOS,
      runtimeVersion `bf83840a…` — a helyi fingerprint egyezik a `1.0.0 (2)` TestFlight buildével,
      így a telepített app megkapja. Update group `e4e710cf-81b3-4cb7-be1c-5758c5ce3933`.
      Tartalom: az Árak üres állapot javítása. A telefonon app-újraindítás kell (`checkAutomatically: ON_LOAD`,
      a frissítés a következő indításkor aktiválódik).
- [x] Árak tab — üres „Árváltozások" lista beszédes üres állapota (2026-08-29): TestFlight-visszajelzés
      alapján. Ok: a 30 napos alapértelmezett ablakban (legutolsó ársor 2026-08-02) mind a 8 többszörös
      termék ára változatlan → `computePriceChanges()` mindet kiszűri (`change_ft === 0`). A félrevezető
      „Nincs találat a szűrési feltételekre." helyett most „Nincs árváltozás az elmúlt X napban." +
      gomb a következő szélesebb időszakra (7→30→90). 90 napon 28 valódi árváltozás van.
- [ ] Árak — nyitott hibák (TestFlight 2026-08-29, javítás elhalasztva):
      (1) azonos napi sorok sorrendje: a query `price_date DESC`, a `sorted` csak dátumra rendez, így egy
      napon belül az „oldest" a legújabb sor → az árváltozás előjele megfordulhat (90 napon 11 ilyen termék);
      (2) egy blokk duplikált sorai „figyelt terméknek" számítanak a KPI-ban, de árváltozást sosem adnak.
- [ ] Következő build előtt: `ITSAppUsesNonExemptEncryption: false` az infoPlistbe (kimarad a kézi
      export compliance kérdés) + ASC app-név átírása egyedire

---

## Out of scope (v2)

- Helymegosztás / safe zone (FamilyWall fő különbsége — későbbi nagy feladat)
- Fotó/videó megosztás
- Családi chat / üzenetküldő
- Több külön csoport (multi-group)
- Push értesítések (naptár emlékeztetők) — v2.1
- familybudget-be írás a Kasszából (jelenleg csak olvasás)
- Recept-szerkesztés a mobilban (a familybudget weben marad v1-ben)
- Barcode scanner (ItemAdd, ProductAdd)
- Tab badge számok, deep linkek, i18n setup, automatizált tesztek
