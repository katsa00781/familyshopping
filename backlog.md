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
> **Utolsó frissítés:** 2026-11-09

---

## ✅ ALAP KÉSZ (familyshopping v0.1 – öröklött)

- [x] Expo + RN (SDK ~57) + TS strict + expo-router + NativeWind v4 + reanimated v4
- [x] Supabase Auth + kliens (`src/lib/supabase.ts`), session-timing javítások (`getSessionSafe`, AppState/autoRefresh, halott-session takarítás)
- [x] UI primitívek: Button, Input, Card, Badge, Checkbox, BottomSheet, EmptyState, Skeleton, Toast
- [x] Bevásárlólisták (`shopping_lists`), ListOverview, ListDetail, ItemAdd/Edit, **Bolt mód** (keep-awake, medium haptika)
- [x] Termékkatalógus + árelőzmény (`products`, `product_price_history`), Árfigyelés, Vásárlások (`shopping_statistics`)
- [x] Személyes infláció: kategória-normalizálás (`lib/categories.ts`), költés-súlyozott árindex
- [x] OCR blokk-szkennelés (kamera + `ocr-receipt` Edge Function), per-tétel confidence, tanuló réteg (`ocr_corrections`), okos kategória-besorolás + termék-egyeztetés
- [x] Profil (iOS grouped list), format/storage/haptics helperek, token-alapú színek
- [x] Natív iOS build setup (bundle id `com.kacsorzsolt.familyshopping`, prebuild)
- [x] iOS 27 / iPadOS 27 indítási összeomlás javítva: SDK 54→57 frissítés + `plugins/withIosSceneDelegate.js` (scene-alapú életciklus, `ExpoAppSceneDelegate`). A plugin törölhető, ha az SDK sablon már maga is scene-alapú (SDK 58)
- [x] **Expo SDK 57→58 frissítés (2026-11-06):** `expo ~58.0.23`, RN 0.88.1, React 19.3.0, reanimated 4.7.1, worklets 0.13.0, gesture-handler 3.3, screens 4.30; `expo-doctor` 20/20, `tsc` tiszta, lint 0 hiba, iOS bundle export OK.
  - `plugins/withIosSceneDelegate.js` **törölve**: az SDK 58 prebuild sablon már scene-alapú (`ExpoReactNativeFactoryProvider` + `SceneDelegate.swift`); prebuild-del ellenőrizve. `withIosMinDeploymentTarget.js` marad.
  - **expo-calendar 58:** a gyökér-importból hívott régi `*Async` metódusok futásidőben dobnak → `deviceCalendarSync.ts` az `expo-calendar/legacy`-t importálja (műszak-szinkron).
  - **gesture-handler 3:** a régi `Swipeable` megszűnt → `ListItem`, `ProductRow` a `ReanimatedSwipeable`-re állítva (azonos propok, mint a `Card.tsx`-ben).
  - **RN 0.88 strict TS API:** ref-típusok `TextInputInstance` / `ScrollViewInstance` (login, register, ocr/review, DayTimeline); `app-tabs.web.tsx` (nem használt sablon-maradék) típusszűkítés.
  - Lockfile újragenerálva (npm peer-feloldási hiba a régi `@expo/ui`/`expo-symbols` 57-es bejegyzések miatt).
  - **expo-router 58 – rejtett tabok:** a `href: null` mostantól `hidden` tabot jelent, és a fókuszba kerülő rejtett tabról a router visszairányít a kezdő tabra → a Termékek / Árak / Bolt mód / Profil nem nyílt meg, mindig a Kezdőlapra ugrott. Javítva: `(tabs)/_layout.tsx` `HIDDEN_TAB_OPTIONS` (`tabBarButton: () => null` + `tabBarItemStyle: display none`), így a route látható marad, csak a gombja nem renderelődik (a korábbi viselkedés).
  - ⚠️ Eszközön tesztelendő (EAS build kell, natív váltás → új fingerprint/runtimeVersion): swipe a listákon/termékeken, műszak → telefon-naptár szinkron, BottomSheet gesztusok.

> Részletek: a korábbi v0.1 backlog-bejegyzések (git history). Ezek **nem** változnak, csak a redesign érinti a megjelenésüket.

- [x] **Termékkategória-bővítés: Vegán, Ital, Gyümölcs, Édesség (2026-09-19):** a korábbi 5 kategória (Zöldség, Tejtermék, Hús, Pékáru, Egyéb) kiegészítve némileg átrendezve 9-re: **Zöldség, Gyümölcs, Tejtermék, Hús, Pékáru, Vegán, Ital, Édesség, Egyéb**. A Gyümölcs a korábban Zöldségbe olvasztott gyümölcsöket önállósítja.
  - Típus (`ItemCategory` → `src/types/index.ts`), kanonikus lista + alias-térkép + kulcsszó-alapú név-felismerés (`src/lib/categories.ts`) bővítve; minden kategória-chip lista (lista szűrő, termék szűrő, ár szűrő, tétel hozzáadás/szerkesztés, termék létrehozás/szerkesztés) frissítve.
  - Új token-színek (pastel-300, a meglévő mintát követve): Gyümölcs `#FDBA74` (orange-300), Vegán `#BEF264` (lime-300), Ital `#67E8F9` (cyan-300), Édesség `#F9A8D4` (pink-300) → `handoff/tokens/tokens.json`, `tokens.ts`, `src/constants/colors.ts`, `src/global.css`, `tailwind.config.js`, `Badge.tsx` (`CategoryBadge`), rövidítések (`catAbbr`: GYÜ/VEG/ITA/ÉDE).
  - **Meglévő termékek átsorolva a közös Supabase `products` táblában** (480 termékből 47 sor UPDATE-elve, id-alapú, ellenőrzött listával): pl. Alpro mandulaital/növényi ital/kókuszital, Barista zabital, Magnum vegán mangó, Viola/Violife vegán sajt → **Vegán**; Alma, Banán, Eper, Öszibarack, Fekete cseresznye, Gyorsfagyasztott meggy, "GYÜMÖLCS 750G" → **Gyümölcs**; BARACKLÉ, Kinley (üdítő), Szentkirályi ásványvíz/Csepp, Ice Tea, Ape Light Meggy → **Ital**; Dörmi, Magnum jégkrém, berlineri fánk, Detki vaníliás karika, Grízes puding → **Édesség**; a vegyes "Zöldség és gyümölcs" / "Zöldség-gyümölcs" bucket tételei (Paradicsom, Vöröshagyma) → **Zöldség**-re normalizálva. A `computeInflation`/`DonutChart` (személyes infláció) és a `toCategory` alias-normalizálás változtatás nélkül skálázódik a 9 kategóriára (generikus, `ALL_CATEGORIES`-alapú).
  - Füstteszt: `tsc --noEmit` és `npm run lint` tiszta (0 hiba, csak meglévő, nem érintett figyelmeztetések).

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
- [x] **„Vásárlás kész" már nem zárja le a listát (2026-09-05):** a Bolt mód CTA-ja eddig `completeList`-et hívta (a lista `completed: true`-ra állt, lekerült az aktív listák közül). Cél: „mozgó" bevásárlólista, amit a család bármikor bővíthet. Új `listStore.finishShopping(id)`: a kipipált (megvett) tételek eltávolítva a listából, a meg nem vettek megmaradnak, a lista `completed` marad `false` (nem archiválódik) — az ár/statisztika-rögzítés (`shopping_statistics`, `product_price_history`) változatlanul megtörténik a megvett tételekre. A `bolt.tsx` `handleComplete` ezt hívja `completeList` helyett. A `lista/[id].tsx` és `bevasarlas.tsx` explicit „Lista befejezése" / „Befejezettnek jelöl" akciói (teljes archiválás) változatlanok — azok külön, szándékos műveletek maradtak.
- [x] **Tétel hozzáadás gyorsítása (2026-09-05):** `ItemAddSheet` legördülő terméktalálataira koppintva a tétel azonnal bekerül a listába (alapértelmezett/beírt mennyiséggel, a termék egysége/kategóriája/ára szerint) — nem kell külön megnyomni a „Hozzáadás" gombot.
- [x] **Tétel hozzáadás egyszerűsítése (2026-11-06):** az `ItemAddSheet` mennyiség mezője léptető lett (új `src/components/ui/QuantityStepper.tsx`; lépésköz egységenként: db 1, kg/l 0,5, g 50, ml 100 — egységváltáskor az egység alapmennyiségére áll), az egység és a kategória chip-sor helyett lenyíló választóban van (új `src/components/ui/Select.tsx` – a mező alatt nyílik, nem nyit második modalt a sheeten belül). **Az ár mező megszűnt:** keresőtalálatnál az ár a termékből jön (mint eddig), új (kézzel beírt) termék ár nélkül kerül a listába és a katalógusba (`price`/`last_price: null`) — az első vásárlás/blokk rögzíti. A találatsor a termék boltját is mutatja. A sheet mezői token-osztályokat kaptak (a korábbi slate hex-ek helyett). Az `ItemEditSheet` (szerkesztés) változatlan.
- [x] **Bolt mód bolt-fejlécekkel + találat kiválasztása mennyiség-állítással (2026-11-06):**
  - **Bolt mód:** a tételek eddig csak bolt szerint sorrendben voltak, elválasztás nélkül → `groupItemsByStore` alapján bolt-fejlécek (bolt neve nagybetűvel teal színnel + kipipált/összes, `boltBar` háttér), **sticky** (`stickyHeaderIndices`) – görgetéskor a tetején marad, melyik boltnál tartasz. Egyetlen, bolt nélküli csoportnál nincs fejléc. A SZENT elemek (72 pt sor, 56 pt checkbox, 24 pt szöveg, helyben dimmelés, medium haptika, keep-awake) változatlanok.
  - **Tétel hozzáadás:** a keresőtalálatra koppintva a termék már **nem kerül azonnal a listára** (a 2026-09-05-i „gyorsítás” visszavonva, felhasználói kérésre): kiválasztódik (kiemelt kártya: név, bolt · kategória · egység, ár, × törlés), a mennyiség a termék egységéhez illő léptetéssel állítható (`stepFor`; ismeretlen egységnél darabos), a „Hozzáadás a listához” gomb teszi fel. A név átírása törli a kiválasztást (új keresés / új termék).
- [x] **Tétel szerkesztés léptetővel + bolt választó (2026-11-06):** az `ItemEditSheet` az `ItemAddSheet` mintáját kapta (léptető, egység/kategória select, token-osztályok, `full` magasságú sheet); az ár mező a szerkesztőben megmaradt. **Bolt választó** (új `src/components/lista/StorePicker.tsx`: katalógus-boltok a boltsorrendben + „Nincs megadva” + „Új bolt…” szabad szöveggel) ott jelenik meg, ahol nincs bolt: a szerkesztőben, ha a tétel termékének nincs boltja / nincs terméke, a hozzáadásnál az új (kézzel beírt) terméknél. Új `listStore.assignItemStore(listId, itemId, store)`: a tétel termékét frissíti a bolttal; ha ebben a boltban már van ilyen termék (DUPLICATE), vagy nincs termék, a tétel **új id-vel**, a bolti termékhez kötve cserélődik (a `persistList` szerver-`product_id`-védelme miatt meglévő tétel `product_id`-ja nem írható át). Az `ItemAddSheet` új terméket már a `productStore.upsertProduct`-on át hoz létre (eddig nyers supabase-hívás volt, így a helyi katalógus nem látta → a bolt-csoportosítás sem); az `upsertProduct` mostantól visszaadja a mentett `Product`-ot.
- [x] **Bevásárlólista boltonként csoportosítva, állítható boltsorrenddel (2026-11-06):** a `lista/[id].tsx` a tételeket bolt-fejlécekkel (bolt neve + kipipált/összes) csoportosítja; a bolt a tételhez kötött termék `store_name`-jéből jön (`normalizeStoreName`, márka szint). A korábbi fix Lidl → Aldi sorrend helyett **felhasználói sorrend**: új `src/store/storeOrderStore.ts` (zustand + AsyncStorage `list.storeOrder`, alapértelmezés Lidl, Aldi) és `src/components/lista/StoreOrderSheet.tsx` (fel/le gombok, spring layout-animáció) – megnyitás a lista ⋮ menüjének „Boltok sorrendje" pontjából vagy bármelyik bolt-fejlécre koppintva. A rendezés: beállított sorrend → többi bolt ábécérendben → „Bolt nélkül" a végén; csoporton belül az eredeti sorrend marad. `src/lib/sortByStore.ts`: új `groupItemsByStore` / `orderedStoreNames`, a `sortItemsByStore` sorrend-paramétert kapott. **Bolt mód:** csak a sorrend követi a beállítást (nincs új fejléc, a SZENT elrendezés változatlan). ~~v1 korlát: a sorrend eszközönként lokális~~ → **2026-11-06 később: szerveren, a családdal közösen mentődik** (lásd „Család-megosztás”). Bolt nélküli tételhez a szerkesztőben és a hozzáadásnál bolt választó van (lásd lent).

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

**Kassza tortadiagram (2026-11-06):** új „Megoszlás” kártya az összegző kártya alatt. Saját SVG torta (`react-native-svg`, már meglévő dependency) jelmagyarázattal: szín, név, összeg, arány és egy összesen-sor. Új komponens: `src/components/kassza/BudgetPieChart.tsx`. Egy szeletre vagy jelmagyarázat-sorra koppintva kiemelődik, a többi elhalványul (reanimated spring a `fillOpacity`-n). **Tény/Terv** váltó, ha van Wallet-adat: a „Tény” a teljes havi költést mutatja (`spending.byCategory`, a terven kívüli „Egyéb” is benne van); a „Terv” a betervezett keretek megoszlását. Wallet nélkül csak a Terv látszik. Szelet-szabály a webes `MegoszlasTorta`-val azonosan (`src/lib/pie.ts` `buildPieSlices`): csak a pozitív tételek; a legnagyobb 7 saját színt kap eredeti sorrendben, a többi egy „Többi” szeletbe kerül. Bemenetek: `budgetPieInputs()` (`src/lib/budget.ts`). **Új tokenek:** `chart.series` (7 szín: a 6 tagszín + narancs `#FB923C`) és `chart.neutral` (`#CBD5E1`) → `handoff/tokens/tokens.json`, `tokens.ts`, `src/constants/colors.ts` (`chartSeries`, `chartNeutral`). tsc/lint tiszta.

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
- [x] **Naptár-esemény ütközés-jelzés + lokális értesítések (2026-09-05):** az `AppointmentSheet`-ben már meglévő „Ekkor műszakban van" jelzés hiányzott a rendes családi naptár szerkesztőjéből (`EventSheet`) – emiatt a Naptár tabon felvett esemény nem jelzett ütközést a műszakkal. Átemelve (`expandEvents`/`rangesOverlap`, nem blokkoló info-sor jegyzet alatt, kizárja az épp szerkesztett saját eseményt). **Új: lokális (nem push) értesítések** `src/lib/notifications.ts` (`expo-notifications` dependency, `app.json` plugin `color: #14B8A6`): (1) **esemény-emlékeztető** – nem egész napos eseménynél `starts_at − 30 perc`, egész naposnál aznap 08:00; `scheduleEventReminder`/`cancelEventReminder` a `calendarStore` create/update/delete-jébe kötve, id→notificationId map `AsyncStorage`-ban (`StorageKeys.eventReminderMap`); (2) **beosztás-ütközés riasztás** – `notifyShiftConflicts` minden `loadEvents` után átvizsgálja a következő 60 napot, és minden még nem jelzett `event`/`appointment` × `shift` átfedésről azonnali lokális értesítést küld (`StorageKeys.shiftConflictNotified` – (esemény id + nap) kulcsok, hogy ne riasszon duplán, és a már nem aktuális ütközések lekopjanak). Mindkettő a meglévő `notificationPrefsStore`-ból kapcsolható (`calendarReminders`, új `shiftConflictAlerts` – `ertesitesek.tsx` kapott egy új Switch-sort). Engedélykérés (`ensureNotificationPermissions`) a root layoutban, session meglétekor. **v1 korlát:** csak lokális ütemezés – ha a feleség és a férj külön eszközön, külön Supabase auth-session alatt futtatná az appot, a másik eszköz csak a következő `loadEvents`-nél (app megnyitáskor) veszi észre az új ütközést, nincs azonnali push; ez a jelenlegi egy-közös-account modellel (v1 user_id-scoped) számolva elfogadott. tsc/lint tiszta az érintett fájlokon.
- [x] **Napi idővonal nézet (Google Calendar-szerű) (2026-09-05):** a napi agenda eddig csak lista volt, nehéz volt átlátni, mikor ütközik két időpont. Új `src/components/naptar/DayTimeline.tsx`: 24 órás függőleges idősáv, óránkénti rács, átfedő események **oszlopokba rendezve** egymás mellett (greedy column-packing algoritmus a `layoutTimedEvents`-ben — klaszterenként osztja el az oszlopokat), átfedésnél sárga (`colors.warning`) keret a vizuális jelzéshez. Egész napos események külön chip-sorban a rács felett. „Most" jelző csík mai napon (percenként frissül). Kezdő görgetés: mai napon a jelenlegi idő −2 óra, egyébként a legkorábbi esemény −1 óra, alapértelmezés 07:00. `naptar.tsx` fejlécében **Lista/Idővonal váltó** (segmented control) — a lista nézet változatlan marad, nem cseréltük le teljesen (felhasználói döntés). tsc/lint tiszta az érintett fájlokon.
  - **Idővonal nézetben a hónap-grid összecsukódik (2026-09-08):** a `MonthGrid` túl sok helyet vitt el az idővonal elől. `naptar.tsx`: új `calendarOpen` state — az „Idővonal”-ra váltás becsukja a hónap-naptárat (`FadeInUp`/`FadeOutUp` + `LinearTransition` az agenda-konténeren), a „Lista” visszanyitja. Idővonal módban az agenda-fejléc dátumcímkéje bal/jobb nap-léptető nyilakat kap (`shiftDay`, hónapváltásnál a látható hónapot is átállítja), és a címkére koppintva (`ChevronUp`/`ChevronDown` jelző) a naptár bármikor visszanyitható. tsc/lint tiszta.
- [x] **Helyi Xcode → TestFlight build előkészítés (2026-09-08):** az EAS build mellé bekerült a saját gépes archiválás útja. `app.json`: `ios.buildNumber: "8"` (utolsó EAS build 7 fölé), `updates.requestHeaders.expo-channel-name: "production"` (hogy a nem-EAS build is a `production` OTA-csatornán legyen). `npx expo prebuild -p ios --clean` lefuttatva (pod install is), `CFBundleVersion=8`, az `EXUpdatesRequestHeaders` bekerült az `Expo.plist`-be. Team: `66TY7MP862` (ZSOLT KÁCSOR, Apple Distribution cert megvan lokálisan). `TELEPITES.md` 1/b szakasz: Xcode signing + Archive + Organizer upload lépések. expo-doctor 18/18.
- [x] **Edzésnaptár-integráció átállítva közös Supabase táblára, device-naptár híd megszüntetve (2026-09-05):** a korábbi (2026-06-26-i) device-naptár híd (Underground KB app → telefon naptár → familyshopping csak-olvasás) a Google Calendar import mellett duplikációt okozott, és csak egyirányú volt. Döntés: mivel a két app felhasználója ugyanaz az email-c­ím és az Underground KB app be tud jelentkezni a familyshopping Supabase projektjébe (saját `auth.uid()`), a **közös `calendar_events` tábla lett az egyetlen forrás** — nincs többé szinkron két rendszer közt. Migráció `supabase/migrations/20260905102500_calendar_events_workout_type.sql` (alkalmazva a közös projektre): `event_type` check bővítve `'workout'`-tal. `CalendarEventType` union bővítve (`src/types/index.ts`). Törölve: `src/store/deviceWorkoutStore.ts`, `getWorkoutEventsInRange`/`DeviceWorkout`/`WORKOUT_CALENDAR_TITLE` a `src/lib/deviceCalendarSync.ts`-ből (a műszak→device-naptár export megmarad, más célt szolgál: rendszer Naptár app-beli láthatóság). `naptar.tsx`/`index.tsx`: a `workouts` merge megszűnt, a workout-sorok most simán a `calendarStore`-ból jönnek; `memberNameFor` helper `event_type==='workout'` esetén „Edzés" címkét ad. `AgendaEvent` új `Dumbbell` jelvényt kapott workout eseményekhez. **Biztonsági megfontolás:** NEM JWT-secret megosztás a két Supabase projekt közt (az Underground KB egy valódi többfelhasználós edzés-app fizető ügyfelekkel — a secret megosztása cross-tenant kockázatot jelentene); helyette az Underground KB app **külön, explicit bejelentkezéssel** szerez saját sessiont a familyshopping projekthez, csak a tulajdonos fiókjához kötve.
  - **Underground KB (`ugkettlebellmobile`, külön repo) oldali módosítás — ELVÉGEZVE (2026-09-05):** ugyanebben a munkamenetben, a másik projektben. `src/lib/familyHubSupabase.ts` (második Supabase kliens, saját `storageKey: 'familyhub-auth'`, env `EXPO_PUBLIC_FAMILYHUB_SUPABASE_URL`/`_ANON_KEY` — a familyshopping ugyanezen anon kulcsaival töltve); `src/lib/familyHubCalendar.ts` (`getFamilyHubEventsInRange` — workout kizárva, heti `rrule` kliens-oldali kibontása; `syncWorkoutsToFamilyHub` — workout sorok upsert `event_type: 'workout'`-tal, `id` = a workout saját id-je, wipe+rewrite az érintett dátumtartományban); `src/stores/familyHubAuthStore.ts` + `src/hooks/useFamilyHubAuth.ts` (session listener, `signInFamilyHub`/`signOutFamilyHub`); `src/hooks/useFamilyHubCalendar.ts` (react-query hookok). Törölve onnan: `src/lib/deviceCalendar.ts`, `src/hooks/useDeviceCalendar.ts`, az `expo-calendar` dependency + `app.json` plugin/Info.plist engedély-stringek. `app/(tabs)/workouts/index.tsx` átkötve az új hookokra. `app/(tabs)/profile/index.tsx`: új „Családi naptár" szekció, **csak a tulajdonos e-mail címénél** (`FAMILYHUB_OWNER_EMAIL` konstans) jelenik meg — Összekötés/Leválasztás gomb + email/jelszó modal (`signInFamilyHub`). Az ottani `backlog.md` is frissítve. **Nyitott/manuális teendők:** (1) a következő natív buildnél `npm install && npx pod-install` kell (dependency törölve); (2) az EAS environment variable-ök közé is fel kell venni a két új `EXPO_PUBLIC_FAMILYHUB_*` kulcsot (`eas env:list production`) a felhő buildekhez; (3) a tulajdonosnak be kell jelentkeznie egyszer a kettlebell app Profil → „Családi naptár" szekciójában a FamilyHub fiókjával. tsc/lint mindkét repóban tiszta volt a módosítások után.
- [x] **Időpont-egyeztető (ügyfél-időpontok) (2026-09-05):** a feleség műkörmös ügyfél-időpontjainak és a műszakbeosztásnak/családi eseményeknek a családi naptárban egyeztetése, minimális interakcióval. **Nincs új tábla** – a `calendar_events` bővült egy `event_type text not null default 'event' check (in event/shift/appointment)` mezővel (migráció: `supabase/migrations/20260905120000_calendar_events_event_type.sql`); az ügyfél neve a meglévő `title` mezőbe kerül (mint a shift-soroknál a műszaktípus neve) – nulla adatduplikáció, teljes újrahasznosítás a meglévő megjelenítő/lekérdező kódban. `src/types/index.ts`: `CalendarEventType` union + `CalendarEventInput.event_type`. A `buildShiftEvents` (`src/lib/shifts.ts`) mostantól `event_type: 'shift'`-et ír, a `deviceWorkoutStore.ts` device-workoutjai `event_type: 'event'`-et kapnak (kötelező mező miatt). `EventSheet.handleSave` megőrzi a szerkesztett esemény `event_type`-ját (nem alakítja vissza `'event'`-té). Új: `src/components/naptar/AppointmentSheet.tsx` (önálló, kisebb sheet – ügyfél név, nap/kezdés/időtartam-chip (30/60/90/120 perc), tag-választó, **nem blokkoló elérhetőség-jelzés**: ha az időszak átfedésben van egy `event_type==='shift'` eseménnyel, info-sor mutatja „Ekkor műszakban van: {tag}"; nincs ismétlődés v1-ben). Új képernyő: `src/app/idopontok.tsx` (top-level Stack route, a `muszak.tsx` mintáját követve) – heti nézet, csak `event_type==='appointment'` sorokkal, napi csoportosítással, a meglévő `AgendaEvent` komponenssel (nincs új kártya-komponens), FAB az új időponthoz. Belépési pont: `naptar.tsx` fejlécében új `CalendarCheck` ikon (`/idopontok`) a meglévő `CalendarClock` (Műszakbeosztás) mellett. `AgendaEvent`-en `CalendarCheck` jelvény jelzi az időpontokat (a műszakok tudatosan nem kapnak külön jelvényt, elég a szín). Kezdőlap „Ma" kártyája módosítás nélkül mutatja az időpontokat is (típus-agnosztikus). **v1 korlát:** a korábban generált műszak-sorok csak a legközelebbi `/muszak` Frissítésnél kapják meg az `event_type='shift'`-et (nincs backfill). `.expo/types/router.d.ts` kézzel kiegészítve az `/idopontok` route-tal (a következő `expo start` úgyis regenerálja). tsc és lint tiszta az érintett fájlokon.

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

## 8. familybudget → mobil szinkron (forrás: familybudget `docs/mobil-sync/`, 2026-11-06)

> A familybudget web minden mobilt is érintő változásról jegyzetet ír a `docs/mobil-sync/` mappába. Átnézve 2026-11-06-ig (8 jegyzet). Az élő DB-n a migrációk lefutottak (`product_price_history.akcios`, `termekek_osszevonasa` RPC).

- [x] **Akciós ár kiszűrése a számításokból (2026-11-06)** (`2026-11-06_arfigyeles-akcios-ar-es-szerkesztes.md`): `ProductPriceHistory.akcios?` és `PriceHistoryEntry.akcios?` (`src/types/index.ts`); új `isRegularPrice()` + `pricesForStatistics()` (`src/lib/priceHistory.ts`, a web szabályával azonos). A `computePriceChanges` és a `computeInflation` (`priceStore`) csak a rendes árakat nézi. Termék-részletek: a grafikon, a trend és a min/max a rendes árakból számol (ha az időszakban csak akciós ár van, akkor azokból); az árnapló továbbra is minden sort mutat. **Hibajavítás:** az `updatePriceEntry` újraszámolja a `total_price = unit_price × quantity` értéket, és írja az `updated_at`-et (eddig a javított ár mellett elavult maradt az összár, ami torzította a költés-súlyozott inflációt). A beszúrások (lista, OCR, kézi) nem küldenek `akcios`-t, a DB alapértéke `false`. Füstteszt: `tsc --noEmit` tiszta; lint: nincs új hiba (a `termekek/[id].tsx` `set-state-in-effect` hibája már korábban is megvolt).
- [x] **Termék-összevonás miatt eltűnő `product_id`-k (2026-11-06)** (`2026-11-06_termekadatbazis-osszevonas.md`): a `listStore` a teljes listát a helyi példányból `upsert`-elte, így a webes összevonás után visszaírhatta a már törölt `items[].product_id`-kat. Új `persistList()` (`src/store/listStore.ts`), mind a 7 mentési ponton: mentés előtt beolvassa a szerveren tárolt tételeket, és a mindkét helyen meglévő tételeknél a szerver `product_id`-ja nyer (a mobil meglévő tétel `product_id`-ját sosem módosítja). A javított id-kat tétel id szerint a helyi állapotba és a cache-be is átvezeti. Ha a beolvasás offline vagy hibára fut, a régi viselkedés marad. A `completeList` és a `finishShopping` az egyeztetett id-kkal rögzíti az árakat; a megvett, a listából már kikerült tételekre is átvezeti az id-kat. **Árvesztés-védelem:** a `product_price_history.product_id` FK (`ON DELETE SET NULL`), ezért egy törölt termékre mutató tétel eddig a teljes ártörténet-köteg beszúrását elbuktatta (csak `console.warn` jelezte). Most 23503 hibánál a nem létező id-kat NULL-ra állítja, és egyszer újrapróbálja (a webes *törlés* is hagyhat ilyen id-t a listában, nem csak az összevonás). Termék-részletek: ha a termék nincs a helyi katalógusban, egyszer újratölti a `productStore`-t. Költség: listamentésenként +1 kis `select('items')` kérés (a UI optimista, nem vár rá). Füstteszt: `tsc --noEmit` tiszta, a `listStore` lint 0 hibás.
- [ ] Opcionális: akciós címke és jelölés (be/ki), valamint a bolt szerkesztése a termék árnaplójában; akciós pontok a grafikonon (webes minta: narancs pont + a rendes átlag szaggatott vonallal).
- [ ] Opcionális: termékek összevonása mobilról (`supabase.rpc('termekek_osszevonasa', …)`), illetve név szerinti átnevezés és összevonás.
- [ ] Opcionális: havi egyenleg-pillanatkép (`egyenleg_pillanatkep`, csak olvasható) a Kassza tabon.
- Nincs mobil teendő: Wallet kategória angol név és UUID (a `wallet-spending` már UUID alapján képez), `transferPlan.walletAccountId` (a mobil nem írja a `budget_data`-t), bérkalkulátor (a mobilban nincs), webes diagramok.

---

## 9. React Compiler lint-adósság (SDK 58 után)

- [ ] Az `eslint-config-expo@58` (react-hooks v7) compiler-szabályai ideiglenesen `warn`-ra állítva az `eslint.config.js`-ben. 37 hely 21 fájlban: `set-state-in-effect` (14), `refs` (12), `immutability` (10), `purity` (2). Érintett pl. `ui/BottomSheet`, `ui/Toast`, `ui/Skeleton`, a sheet-ek (etrend, naptar, lista, kassza), `(auth)/login`, `ocr/*`. Ezeket a komponenseket a React Compiler most kihagyja (nem optimalizálja). Javítás fájlonként, utána a szabály vissza `error`-ra.

---

## 10. Családi feladatok (Feladatok fül + Kezdőlap kártya)

> Felhasználói döntések (2026-11-09): a Bevásárlás szegmensben új „Feladatok" fül (Listák | Feladatok | Termékek | Árak) + Kezdőlap kártya; közös a családdal (adatgazda-modell, viewer csak olvas); 1 fotó / feladat; határidő = dátum + opcionális időpont + lokális emlékeztető.

- [x] **Migráció (2026-11-09, alkalmazva):** `supabase/migrations/20261109120000_family_tasks.sql` — `family_tasks` tábla („own" + 4 családi RLS policy, `is_family_peer`), privát `task-photos` Storage bucket (10 MB, jpeg/png/heic; útvonal `{adatgazda}/{taskId}-{ts}.jpg`), `task_photo_owner()` + 4 `storage.objects` policy. Ellenőrizve: saját sor írható/olvasható, idegen `user_id`-ra írás és idegen sor olvasása RLS-sel tiltva, fotó csak a saját/családi mappába tölthető (visszagörgetett tranzakcióban tesztelve). Security advisor: nincs új figyelmeztetés. Családtag-oldali teszt még hátra (jelenleg nincs család a DB-ben).
- [x] **Kliens (2026-11-09):** típusok `FamilyTaskInput`/`FamilyTask` (`src/types/index.ts`); `src/lib/tasks.ts` (CRUD, fotó-feltöltés `expo-file-system` `File.arrayBuffer()`-rel – nincs új dependency –, aláírt URL cache, `isOverdue`/`dueLabel`/`groupTasks`/`filterByAssignee`); `src/store/taskStore.ts` (zustand, `loadWithSessionRetry` + `resolveDataOwnerId`, `familyhub_tasks_v1` cache, optimista írás + rollback + hiba-toast, `pendingPhotos` a feltöltés alatti helyi képhez).
- [x] **UI (2026-11-09):** `src/app/(tabs)/feladatok.tsx` (rejtett tab, `HIDDEN_TAB_OPTIONS`); tag-szűrő (Mind / tagok / Közös); szekciók Lejárt (korall) / Hamarosan / Határidő nélkül / Kész (összecsukható, utolsó 20); `components/feladatok/TaskRow` (kör checkbox, spring-dimmelés, határidő-chip, tag-pötty, fotó-bélyegkép, balra húzás → törlés), `TaskSheet` (MIT / KINEK / HATÁRIDŐ / FOTÓ / MEGJEGYZÉS, kamera + galéria, teljes méretű fotó-nézet), `TaskPhoto`; `dashboard/TasksCard` a Kezdőlapon (nyitott/lejárt szám + 3 legsürgősebb).
- [x] **Ismétlődő feladatok (2026-11-09):** migráció `20261109130000_family_tasks_rrule.sql` (`family_tasks.rrule text`, alkalmazva). Szerkesztőben ISMÉTLŐDÉS (Nincs / Naponta / Hetente / Havonta / Évente / Egyéni „minden N nap/hét/hónap/év") – csak határidővel. Kipipáláskor NEM lesz kész: a `due_at` a következő esedékességre lép (`nextDueAt` → `lib/calendar.ts` `nextOccurrence`, az elmúlt alkalmakat átugorja), toast „Kész! Következő: …" + haptika; az emlékeztető a sync-kel átütemeződik. A sorban ismétlődés-ikon + gyakoriság (pl. „hetente"). Nincs vég-dátum (a feladat törléséig / az ismétlődés kikapcsolásáig ismétlődik), nincs előzmény a Kész szekcióban.
- [x] **Egységes FAB (2026-11-09):** új `src/components/ui/Fab.tsx` (fő szín / teal, 58 pt kör, objektum-style – a NativeWind Pressable függvény-style hibája miatt a Feladatok és a Bevásárlás „+" gombja nem látszott). Használja: Feladatok, Bevásárlás, Naptár, Időpontok, Termékek, (régi mock) `lists`. A Feladatok tag-szűrője tördelt sor (nincs oldalra görgetés), a fotó-gombok paddingot kaptak.
- [x] **Közös `MemberPicker`** (`src/components/MemberPicker.tsx`) – az `EventSheet` KINEK pill-sora kiemelve, az esemény-szerkesztő is ezt használja (viselkedés változatlan).
- [x] **Emlékeztető:** `syncTaskReminders` (`lib/notifications.ts`) – időponttal a határidőkor, csak dátummal aznap 08:00; max. 15 db; kész/törölt/lejárt feladatnál törlődik. Nincs külön kapcsoló az Értesítések képernyőn (később, ha kell).
- [x] `memberStore` taglista-védelem a `family_tasks.assignee_id` hivatkozásokat is számolja (hiányzó táblánál 0).
- [x] `app.json` kamera/fotó engedélyszövegek általánosítva → **natív változás, új EAS build kell** (OTA nem elég).
- Füstteszt: `tsc` ✅, lint 0 error (1 új `set-state-in-effect` warning a `TaskSheet` nyitáskori mezőfeltöltésében – ugyanaz a minta, mint az `EventSheet`, lásd 9. pont). Eszközön/szimulátorban még nem tesztelve.

---

## Visszamaradt v0.1 feladatok (nyitott, beolvasztva)

> A Bevásárló v0.1-ből át nem fejlesztett, még nyitott tételek. Prioritás a v2 funkciók (1–7) után, hacsak nem blokkolnak.

**Auth / Profil:**

- [x] **01c – ForgotPassword** képernyő — már létezik és működik (`src/app/(auth)/forgot-password.tsx`, `resetPasswordForEmail` + „email elküldve" állapot). **Megjegyzés:** még a v0.1 dizájnt (hardcode hex/StyleSheet) használja; a v2 token-redesign külön, alacsony prioritású UI-adósság (nem blokkol).
- [x] **Profil push-célok valódi sub-screenjei (2026-06-26):** a korábbi placeholder `notImplemented` Alertek helyett valós képernyők, v2 token-dizájnnal, közös `SettingsScaffold` fejléccel (`src/components/profil/`):
  - **Profil szerkesztése** (`profil-szerkesztes.tsx`) — teljes név mentése `supabase.auth.updateUser({ data: { full_name } })`-val (email read-only); az `onAuthStateChange` frissíti a store-t
  - **Jelszó módosítása** (`jelszo-modositas.tsx`) — `updateUser({ password })`, min. 6 karakter + megerősítés-egyezés validáció
  - **Értesítések** (`ertesitesek.tsx`) — lokális preferenciák (Switch) `notificationPrefsStore` + AsyncStorage (`StorageKeys.notificationPrefs`); naptár/beosztás-ütközés/ár/bevásárlás kapcsolók. **2026-09-05:** a naptár-emlékeztető és a beosztás-ütközés riasztás mostantól ténylegesen ütemez (lásd a Naptár szekció „Naptár-esemény ütközés-jelzés + lokális értesítések" bejegyzését); az ár/bevásárlás kapcsoló egyelőre még csak beállítás, ütemezés nélkül
  - **Adatvédelem** (`adatvedelem.tsx`) + **Felhasználási feltételek** (`feltetelek.tsx`) — statikus tartalom közös `LegalSections` renderelővel
  - Route-ok regisztrálva a root `_layout.tsx`-ben; a Profil sorok bekötve (`router.push`). tsc nem hozott új hibát (csak meglévő template-hibák), lint 0 az érintett fájlokon
- [x] **12 – FamilySettings / Család-megosztás (2026-11-06, felhasználói döntés: teljes családi tér + meghívókód + szerveres mentés):**
  - **Modell: „családi tér a tulajdonos adatain”.** A közös bevásárló-adatok (listák, termékek, árelőzmény, vásárlási statisztika, boltsorrend) a család tulajdonosának `user_id`-ja alatt élnek; a tagok RLS-en át olvassák és írják (a `viewer` csak olvas). A meglévő „own” policy-k érintetlenek, a családiak permissive kiegészítések → a familybudget web (explicit `user_id` szűrés) viselkedése nem változik.
  - **Migráció** `supabase/migrations/20261106120000_family_sharing.sql` (alkalmazva a közös projektre): `families` (owner_id, invite_link = 6 karakteres kód, invite_expires_at), `family_members` (user_id unique → egy család/felhasználó; FK `profiles`-ra a beágyazáshoz), `shopping_preferences` (store_order jsonb, az adatgazdához kötve); security definer helperek `my_family_id`, `is_family_admin`, `is_family_peer(target, needs_write)`, `family_data_owner`; RPC-k `create_family`, `join_family`, `regenerate_family_invite`; családi RLS policy-k a `shopping_lists`, `products`, `product_price_history`, `shopping_statistics`, `profiles` (csak select) táblákon. A tulajdonos tagsága nem törölhető. **RLS-teszt** (tranzakcióban, visszagörgetve): tag csatlakozás után 35 listát / 456 terméket lát és írhat, kívülálló 0-t, néző nem tud írni, a tulajdonos nem távolítható el.
  - Kliens: új `src/lib/dataOwner.ts` (`resolveDataOwnerId` — `family_data_owner` RPC, memória + AsyncStorage cache); a `listStore`, `productStore`, `priceStore`, `purchaseStore`, `ItemAddSheet` kereső és az OCR-mentés ezzel ír/olvas. `storeOrderStore` → `shopping_preferences` (AsyncStorage csak cache; első betöltéskor a telefonos sorrendet feltölti). `familyStore` újraírva az új sémára (`createFamily`/`joinFamily`/`leaveFamily`, családváltás után a közös adatok újratöltése). `Family.ownerId`, `FamilyMember.userId` típusbővítés.
  - `family-settings.tsx`: üres állapotban **Család létrehozása** + **Csatlakozás kóddal**; meghívókód másolás/megosztás, érvényességi dátum, új kód csak adminnak; a „saját sor” felismerése javítva (eddig tag-id ↔ user-id hasonlítás volt); tulajdonos jelölés, nem eltávolítható; **Kilépés a családból**. A Profil oldal családi mintaadatai („Admin”, „Kácsor család · 3 tag”, `bvr.so/…`) valós adatra kötve.
  - **Ismert korlátok:** (1) a lista teljes `items` tömbje egyben mentődik → ha két családtag *egyszerre* szerkeszti ugyanazt a listát, az utolsó mentés nyer (a másik új tétele elveszhet); (2) nincs realtime – a másik tag változása a következő betöltéskor (lista megnyitás / app előtérbe) látszik; (3) a `viewer` szerepkör szerkesztő gombjai látszanak, de az írás szerveroldalon elutasítódik és visszaáll. Következő lépés javaslat: Supabase Realtime a `shopping_lists`-re + tétel-szintű összefésülés mentéskor.
  - Az étrend tagjai (`memberStore`) és a naptár továbbra is lokális/`user_id`-scoped – ezek nem részei ennek a lépésnek.
- [x] **Kétirányú szinkron az Apple (telefon) Naptárral (2026-11-06):** bejelentett tünet: „nem frissül a naptáram az Apple naptárammal” – eddig csak a műszakok kerültek át, és csak a `/muszak` Generálás gombjára. Felhasználói döntés: **mindkét irány**; kiírás: **családi események + edzések** (műszak/ügyfél-időpont nem – a meglévő „Műszakok (FamilyHub)” export változatlan).
  - **FamilyHub → telefon:** `exportEventsToDevice` (`src/lib/deviceCalendarSync.ts`) a saját „FamilyHub” naptárba **növekményesen** tükröz: FamilyHub id → telefonos id + verzió (cím/kezdés/vég/egész nap/rrule/hely/leírás) map AsyncStorage-ban (`deviceCalendar.exportMap`); csak az új/változott eseményt írja újra (törlés + létrehozás), a FamilyHubból eltűntet törli; ha a naptárat törölték az Apple-ben, újraépíti. Ismétlődés `rrule` → `recurrenceRule` (új `parseRecurrence` a `calendar.ts`-ben), `alarms: []` (a FamilyHub saját emlékeztetőt küld). 60 napnál régebben véget ért egyszeri események kimaradnak. A `calendarStore` minden sikeres betöltés és módosítás után késleltetve (1,5 mp, sorban futó) indítja → a családtagok változásai is átkerülnek, amikor az app betölti a naptárat.
  - **Telefon → FamilyHub:** a kiválasztott naptárak (az app saját naptárai nélkül) eseményei −2…+13 hónapra, `dev:` id-előtaggal, `device_calendar` jelöléssel, **csak olvashatóan, csak ezen a telefonon** (nem kerülnek a közös naptárba, nincs rájuk emlékeztető/ütközés-jelzés). Naptár tab + Kezdőlap „Ma” kártya; koppintásra info („az Apple Naptárban szerkeszthető”), az agenda a forrásnaptár nevét mutatja.
  - Új `src/store/deviceCalendarStore.ts` (eszközönkénti beállítás: kiírás be/ki – alapból be, beolvasott naptárak; engedélyállapot) és `src/app/naptar-szinkron.tsx` (Naptár fejléc `CalendarSync` ikon → „Apple Naptár”: engedélykérés / Beállítások megnyitása, kiírás kapcsoló + utolsó szinkron + „Szinkron most”, beolvasható naptárak kapcsolói). Kikapcsoláskor a „FamilyHub” telefonos naptár törlődik. `CalendarEvent.device_calendar?` típusbővítés. `.expo/types/router.d.ts` kézzel kiegészítve (a következő `expo start` regenerálja).
  - **Korlátok:** háttérben nem fut – az Apple-oldal akkor frissül, amikor az app betölti a naptárat (megnyitás / Naptár vagy Kezdőlap tab); az Apple-ben a „FamilyHub” naptáron tett módosítást a következő szinkron felülírja; az `Info.plist` naptár-engedély szövegei még csak a műszakokat említik (módosításuk natív buildet igényel).
  - ⚠️ Eszközön tesztelendő: engedély → „FamilyHub” naptár megjelenik az Apple Naptárban; esemény létrehozása/módosítása/törlése FamilyHubban → Apple-ben követi; Apple-naptár kiválasztása → események a FamilyHub naptárban.
- [x] **Közös családi naptár + közös taglista (2026-11-06; migrációt a felhasználó SQL Editorban alkalmazta – nincs bejegyzés a migrációs történetben, a fájl idempotens):** felhasználói döntés: a naptár közös, a tag-lista új táblában közös, az **Étrend egyelőre saját** marad (de a közös taglistát használja).
  - **Migráció** `supabase/migrations/20261106140000_shared_calendar.sql` (idempotens) — az MCP-s alkalmazást a felhasználó elutasította, **kézzel kell lefuttatni** (SQL Editor) vagy kérésre alkalmazzuk. Tartalom: új `household_members` (id = kliens adja, user_id = adatgazda, name, color, sort_order; own + családi RLS), családi RLS policy-k a `calendar_events`-en. Ha MCP-vel/CLI-vel alkalmazzuk, a fájlt a rögzített verziószámra át kell nevezni (mint a `20261106102748_family_sharing`-nél).
  - Kliens: `fetchEvents`/`insertEvent`/`insertEvents` az adatgazdát kapja (`user_id` = tulajdonos, `created_by` = aki felvette); `calendarStore` `resolveDataOwnerId`-vel. **Emlékeztető-szinkron:** új `syncEventReminders` (`src/lib/notifications.ts`) minden `loadEvents` után a következő 30 nap `event`/`appointment` eseményeihez ütemez/újraütemez (verzió = kezdés+cím, `StorageKeys.eventReminderVersion`, max. 40 db az iOS 64-es korlátja miatt), a más által törölt események emlékeztetőit törli. A műszak-ütközés értesítés szövege semleges lett („Ütközés a beosztással … egy műszakkal”), mert közös naptárban bárkinek a műszakjára vonatkozhat.
  - `memberStore`: AsyncStorage cache + `household_members` szinkron (30 mp-es frissítési korlát, `loadMembers(true)` családváltáskor). **Adatvédelem a meglévő hozzárendelésekhez:** üres szerveres listát **csak az adatgazda** telefonja tölt fel, a saját (eddigi) tag-id-ivel → a 126 meglévő esemény és az étrend `member_id`-jai érvényesek maradnak; családtag telefonja sosem seedel, és szerkesztést is csak szerverről jött lista után küld fel. Tábla hiánya / hiba esetén a lista lokális marad (régi viselkedés).
  - `familyStore.reloadSharedData` a naptárat és a taglistát is újratölti.
  - **Finding a migráció után:** a `household_members`-be egy friss telepítés (a tulajdonos fiókjával futó szimulátor/újratelepített app) frissen seedelt Apa/Anya/Kevin/Kira tagokat töltött fel, amelyekre **egyetlen esemény/étrend-tétel sem hivatkozik** (a naptár 9, az étrend 8 korábbi tag-id-ra mutat – több korábbi telepítésből). A régi id-k nevei színből/címből nem fejthetők vissza megbízhatóan → adatot nem írtunk át. **Javítás (`memberStore`):** (1) az adatgazda telefonja csak akkor seedel/szerkesztéskor tölt fel, ha a helyi tagjaira van hivatkozás, vagy még nincs tag-hivatkozás (`isCanonicalLocalList`); (2) **öngyógyítás:** ha az adatgazda telefonján első szinkronkor a szerveres tagokra 0, a helyiekre >0 hivatkozás van, a helyi lista lecseréli a szervereset (a nem hivatkozott szerveres sorok törlődnek). Így a valódi telefon (09-05-i tag-id-k) az új kód első futásakor helyreállítja a listát.
  - **Teendő élesítéshez:** (1) migráció futtatása; (2) a tulajdonos (katsa007) egyszer nyissa meg az appot frissítés után → feltölti a tagokat; (3) utána csatlakozhatnak/frissíthetnek a családtagok.
  - **Korlátok:** nincs realtime (változás a következő betöltéskor látszik); ismétlődő eseménynél az emlékeztető továbbra is csak a mester-előfordulásra szól (régi viselkedés); a műszaksablon (`/muszak`) az azt létrehozó telefonon lokális, a generált műszak-események viszont közösek.
  - ⚠️ Eszközön tesztelendő: létrehozás → kód → második fiókkal csatlakozás → közös lista szerkesztése mindkét telefonon.

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

**Termék-adattisztítás (2026-10-14) — ✅ KÉSZ:** egy boltból egy termék = egy `products` sor, az árváltozás
(`product_price_history`) megmarad. Migrációk: `20261014115900_…_1_backup_and_store_names`,
`20261014120000_products_dedupe`, `…120100_products_unique_index`, `…130000_…_3_fuzzy_groups`,
`…140000_…_4_followups`, `…150000_…_5_statistics_cleanup`.
- [x] Bolt-nevek márka szintre (Aldi/Lidl/Tesco/EcoFamily/Hansa Italház/Müller Drogéria; BENU, Biobolt, Spar külön)
- [x] `products` 482 → 430, árhistória 1702 → 1333 (csak azonos nap+egységár+mennyiség+összeg sorok); nincs árva `product_id`
- [x] Egyedi index: `products_user_store_name_unit_uniq` (user, bolt, lower(név), egység) → az app `DUPLICATE` hibát kap
- [x] `shopping_statistics`: ismeretlen bolt-nevek → NULL, 2025-12-12-i gramm-mennyiség hibák javítva, dupla CBA-nyugta törölve
- [x] Kliens: `normalizeStoreName` (`lib/format.ts`) az `upsertProduct`-ban és az OCR-mentésben; az OCR-mentés a már létező (bolt, név, egység) terméket újrahasznosítja; meglévő termék boltját nem írja felül
- [x] `…160000_…_6_final_cleanup`: a 2025-12-12-i `shopping_statistics` sorok (55 db, használhatatlan) törölve, a `*_backup_20261014` mentő táblák eldobva (felhasználói jóváhagyással, lefuttatva 2026-10-14)
- [x] Árváltozás-anomáliák (2026-10-14): `computePriceChanges`/`computeInflation` mostantól like-for-like csoportosít (termék + bolt + egység) — a kg-os és db-os, ill. boltonként eltérő árak nem adnak hamis ugrást; azonos napi sorok sorrendje `created_at`-tel stabil (régi nyitott hiba (1) javítva). Termék-részletek: valódi árnapló a `product_price_history`-ból (`lib/priceHistory.ts`) trend-grafikonnal; sorra koppintva ár/dátum szerkeszthető, a nem valós ár törölhető; módosítás után az Árak tab frissül.
- [ ] Nyitott: Basmati rizs (Lidl) két sora (1 kg / db) külön termék
- [ ] Nyitott: OCR-nyugtánál a `shopping_statistics` még nem deduplikál (azonos nap+bolt+tétel újra-beolvasásnál)

**Közös (adatgazda-modell, családi RLS):**
- [x] `family_tasks` + `task-photos` Storage bucket — létrehozva és alkalmazva (2026-11-09, `20261109120000_family_tasks.sql`); `rrule` oszlop (`20261109130000_family_tasks_rrule.sql`, alkalmazva)

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
- [x] iOS tablet (iPad) támogatás engedélyezve (2026-09-11): `app.json` → `ios.supportsTablet: true`.
      Ez natív (Info.plist `UIDeviceFamily`) változás, **OTA update-tel nem terjeszthető** — új EAS Build
      (és TestFlight-feltöltés) kell hozzá. UI-oldalon még nincs iPad-specifikus (split-view/reszponzív)
      elrendezés — a meglévő layoutok nagyobb képernyőn nyújtva jelennek meg, ezt külön feladatként érdemes
      átnézni, ha valódi iPad-optimalizálás a cél.
- [x] Xcode build hiba javítva (2026-09-19): `IPHONEOS_DEPLOYMENT_TARGET 13.4` a `Pods.xcodeproj`-ban,
      Xcode 27 min. 15.0-t követel. Ok: a `RNCAsyncStorage_resources` resource-bundle target a saját
      podspecjéből örökli a 13.4-et, nem a Podfile `platform :ios, '15.1'` sorát. Mivel `/ios` gitignore-olt
      (CNG, minden `prebuild`/`expo run:ios` újragenerálja), a Podfile közvetlen szerkesztése nem maradt
      volna meg — helyette `plugins/withIosMinDeploymentTarget.js` Expo config plugin (regisztrálva az
      `app.json` plugins tömb végén), ami minden prebuildnél befűzi a `post_install`-ba, hogy minden pod
      target `IPHONEOS_DEPLOYMENT_TARGET`-jét felhúzza legalább 15.1-re.

---

## Out of scope (v2)

- Helymegosztás / safe zone (FamilyWall fő különbsége — későbbi nagy feladat)
- Fotó/videó megosztás (általános, pl. családi album) — a feladatokhoz csatolt egy fotó kész (10. pont)
- Családi chat / üzenetküldő
- Több külön csoport (multi-group)
- Push értesítések (naptár emlékeztetők) — v2.1
- familybudget-be írás a Kasszából (jelenleg csak olvasás)
- Recept-szerkesztés a mobilban (a familybudget weben marad v1-ben)
- Barcode scanner (ItemAdd, ProductAdd)
- Tab badge számok, deep linkek, i18n setup, automatizált tesztek
