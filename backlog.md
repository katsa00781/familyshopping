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
> **Utolsó frissítés:** 2026-06-21

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

## 6. Naptár — ✅ KÉSZ (2026-06-21)

- [x] Migráció: `calendar_events` (`user_id`, `created_by`, `title`, `description`, `location`, `starts_at`, `ends_at`, `all_day`, `member_id`, `color`, `rrule`) + RLS `user_id = auth.uid()` (select/insert/update/delete own) + `updated_at` trigger → `supabase/migrations/20260621120000_calendar_events.sql` (alkalmazva a közös projektre)
- [x] Típus `CalendarEvent` + `CalendarEventInput` → `src/types/index.ts`
- [x] `src/lib/calendar.ts`: dátum-helperek (helyi idő, `buildMonthMatrix`, `dayKey`/`eventDayKey`, `monthTitle`, `agendaDayLabel`, `eventTimeLabel`, `shortDateLabel`, `combineDateTime`) + CRUD (`fetchEvents`/`insertEvent`/`patchEvent`/`removeEvent`)
- [x] `src/store/calendarStore.ts` (zustand): cache + `getSessionSafe` + üres/hiba retry (budgetStore-minta), optimista create/update/delete
- [x] `src/app/(tabs)/naptar.tsx`: saját hónap nézet (`MonthGrid`, reanimated fade hónapváltáskor, tagszínes pöttyök max 3) + hónap-navigáció + „Ma" gomb + napi agenda (`AgendaEvent`, üres állapot) + FAB
- [x] Esemény létrehozó/szerkesztő sheet (`EventSheet`): cím, egész napos toggle, kezdet/vég dátum+idő (saját `DateTimePickerModal` — nincs új dependency), színválasztó, hely, jegyzet; szerkesztésnél törlés (Alert megerősítéssel)
- [x] Kezdőlap „Ma" kártya bekötve (mai események a `calendarStore`-ból)
- [x] Füstteszt: tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [x] **Eltérés a mockuptól (v1 döntés):** az esemény-sheet „családtag chip" választója helyett **közvetlen színválasztó** (6 tagszín). Indok: v1 = single-user (`profiles` üres, nincs több valós családtag) — a `member_id` NULL marad, az esemény színét a `color` mező adja. A tag-hozzárendelés a család-megosztással együtt jön (v2.x). Az agenda „who" chip emiatt v1-ben nem jelenik meg.
- [x] **Esemény-kártya stílus fix** (`AgendaEvent`, 2026-06-21): a kártya stílusai nem érvényesültek. Gyökérok ugyanaz a NativeWind v4 gotcha, mint a dashboardnál — a `Pressable` **függvény-formájú `style`-jának statikus property-jei** (`borderRadius`, `paddingVertical`, `marginBottom`, shadow) **eldobódnak** `className` mellett. Javítás: a kártya-stílusok belső `View`-ra kerültek (objektum-style + `bg-card` className), a `Pressable` függvény-style-ja csak `opacity`-t kezel
- [ ] Ismétlődés (`rrule`) — **elhalasztva** (v2.1, a push-emlékeztetőkkel együtt); az oszlop és típusmező létrehozva, de a UI nem kezeli

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
- [x] **Eltérés a mockuptól (v1 döntés):** a recept-hozzárendelés **drag-and-drop helyett slot-koppintással** történik (koppints egy étkezésre → `RecipePickerSheet` → recept kiválasztása). Indok: minimális működő verzió, nincs új gesztus-dependency. A „Receptkönyv" chip a recepteket böngésző (read-only) módban nyitja. Az adagszám-szerkesztő elhalasztva (a recept alap `servings` értékét vesszük) — a `buildShoppingItems` az arányosítást már kezeli.

---

## Visszamaradt v0.1 feladatok (nyitott, beolvasztva)

> A Bevásárló v0.1-ből át nem fejlesztett, még nyitott tételek. Prioritás a v2 funkciók (1–7) után, hacsak nem blokkolnak.

**Auth / Profil:**

- [ ] **01c – ForgotPassword** képernyő
- [ ] Profil push-célok valódi sub-screenjei (EditProfile, ChangePassword, NotificationSettings, Privacy, Terms) — jelenleg placeholder Alert
- [ ] **12 – FamilySettings** (családtagok, megosztás) — v1-ben user_id-scoped, a valódi megosztás v2.x

**Általános UI:**

- [ ] **PickerScreen** (generikus: bolt / kategória / egység)
- [ ] Typed ParamList-ek (`navigation/types.ts`)

**OCR deploy (függőben):**

- [ ] `supabase functions deploy ocr-receipt` + migráció futtatása (`supabase db push`) — a kliens az `ocr-receipt`-et hívja; a régi `supabase/functions/ocr/` mappa elavult

**Tech adósság (alacsony prioritás):**

- [ ] `screens/` mappa szerkezet bevezetése (jelenleg az üzleti logika az `app/` mappában van)

---

## Adatbázis (közös Supabase projekt) — állapot

**Megvan (familyshopping, írjuk/olvassuk):**
- [x] `shopping_lists`, `products`, `product_price_history`, `shopping_statistics`, `ocr_corrections`

**Megvan (familybudget, CSAK olvassuk):**
- [x] `budget_plans`, `annual_budget_plans`, `savings_goals`, `recipes`, `recipe_ingredients`

**Új (létrehozandó) — v1 RLS: `user_id = auth.uid()` (NEM family_id):**
- [x] `calendar_events` (RLS: `user_id`) — létrehozva és alkalmazva (2026-06-21)
- [x] `meal_plan_entries` (RLS: `user_id`) — létrehozva és alkalmazva (2026-06-21)

---

## Ship előtt

- [ ] Teljes flow éles iOS eszközön (Kezdőlap → Naptár → lista generálás étrendből → Bolt mód)
- [ ] Bolt mód boltban, valós körülmények közt (új háttérszín ellenőrzés)
- [ ] Edge case-ek: üres állapot minden tabon, hosszú magyar szöveg, nincs net, lassú net
- [ ] `budget_data` 3 formátuma valós adattal tesztelve
- [ ] Lint + typecheck hibamentes
- [ ] Dev segédeszközök eltávolítva (mock adat, console.log)
- [ ] Secrets ellenőrzés (kliens bundle + git history)
- [ ] `backlog.md` frissítve
- [ ] EAS Build → TestFlight a családnak (bundle id: `com.kacsorzsolt.familyshopping` — új név esetén frissítendő)

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
