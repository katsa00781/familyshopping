# FamilyHub *(munkacím)* – CLAUDE.md

> **Claude Code-nak:** ezt olvasd el először, minden prompt előtt. Ez definiálja, mit építünk, hogyan, és mik a nem-alkudható szabályok.
>
> **v2 megjegyzés:** Ez a `familyshopping` app továbbfejlesztése egy teljes családi szervezővé (FamilyWall-stílus). A korábbi „Bevásárló" CLAUDE.md szabályai **érvényben maradnak**, kivéve ahol ez a fájl felülírja (lásd: Dizájn tokenek, Navigáció, Bolt mód). Az új funkciók: **Kezdőlap dashboard, Naptár, Kassza (familybudget integráció), Étkezéstervező.**

## Szerepkör
Tapasztalt Expo + React Native mérnök vagy, aki a **FamilyHub** családi szervezőt építi. Tiszta, egyszerű, karbantartható kód. Világosság > felesleges absztrakció.

---

## Projekt áttekintés
**FamilyHub** – magyar családi szervező mobilapp, amely egy helyen hozza össze a család **naptárát, bevásárlását, kasszáját (költségvetését) és étkezéstervezését**. iOS-first. Család szinten megosztott (`family_id` modell).

A `familyshopping` appra épül, amelyben már kész:
- Közös bevásárlólisták (család szinten)
- **Bolt mód** – nagy kontrasztú, óriás tap-targetes boltban-használt képernyő
- Termékkatalógus árelőzménnyel + ártrendek
- OCR blokk-szkennelés (kamera + szerver oldali vision endpoint)
- Profil és családbeállítások

**Új v1 funkciók:**
- **Kezdőlap** – közös dashboard: mai naptáresemények + aktív bevásárlólista + kassza-állapot egy képernyőn
- **Naptár** – közös családi naptár, tagonkénti színkóddal
- **Kassza** – havi költségvetés-áttekintés a `familybudget` adataiból (ugyanaz a Supabase projekt)
- **Étkezéstervező** – receptek heti étrendbe húzása, amiből pontosabb bevásárlólista generálható

---

## Tech stack (rögzített)

Változatlan a `familyshopping` stackhez képest:
- **Runtime:** Expo (managed), SDK ~54 · React Native 0.81 · React 19
- **Nyelv:** TypeScript strict, `src/`-ben nincs JS
- **Styling:** NativeWind v4. `StyleSheet.create` csak elkerülhetetlen esetben
- **Navigáció:** `expo-router` (file-based, Tabs + Stack)
- **State:** local-first, megosztotthoz `zustand` v5. **Redux tilos.**
- **Perzisztencia:** `AsyncStorage`
- **Animáció:** `react-native-reanimated` v4, spring minden state-flipnél
- **Ikonok:** `lucide-react-native`, stroke 1.75
- **Haptika:** `expo-haptics`
- **Backend/Auth:** `@supabase/supabase-js` v2, Supabase Auth (`src/lib/supabase.ts`)

**Új dependency (jóváhagyásra vár):**
- **`react-native-calendars`** – a Naptár hónap-nézetéhez. Jól dokumentált, bevált. Ha túl nehéznek bizonyul, a hónap-grid saját komponensként is megírható (`react-native-reanimated`-tel). **Telepítés előtt kérdezz rá.**

Új könyvtárat ne adj hozzá engedély nélkül. Max kevés, jól dokumentált dependency.

---

## Dizájnirány (v2 – FELÜLÍRJA a régi tokeneket)

A hideg kék/slate paletta helyett meleg, családias FamilyWall-stílus.

### Új paletta (a `handoff/tokens/tokens.json` ezzel frissül)
| Token | Érték | Megjegyzés |
|---|---|---|
| `primary` | `#14B8A6` | teal-500 – brand, CTA, aktív tab |
| `primaryForeground` | `#FFFFFF` | szöveg primary-n |
| `accent` | `#FB7185` | korall – kiemelés, riasztás, „ma" |
| `success` | `#22C55E` | – |
| `warning` | `#F59E0B` | árváltozás, túlköltés |
| `destructive` | `#EF4444` | törlés |
| `background` (light) | `#F8F7F4` | meleg törtfehér |
| `card` (light) | `#FFFFFF` | – |
| `foreground` (light) | `#1C2B2A` | meleg sötét |
| `muted` | `#8A8F8E` | meta, placeholder |
| `border` (light) | `#E9E7E1` | – |
| dark háttér | `#13201F` | meleg sötét (nem tiszta fekete) |

### Tagszínek (ÚJ – kulcselem)
Minden családtagnak saját szín, ami megjelenik az avatar-gyűrűn, a naptáreseményein és a hozzá rendelt feladatokon. Javasolt készlet (a `member_color` mezőhöz):
`#14B8A6` (teal) · `#FB7185` (korall) · `#A78BFA` (lila) · `#F59E0B` (sárga) · `#38BDF8` (kék) · `#34D399` (zöld).

### Forma & típus
- Kártyák: `radius 20–24`, lágy árnyék (`shadow-sm`/`shadow-md`), bőséges padding
- Barátságos, kerek érzet; nagy fejlécek, sok levegő
- **Soha ne hardcode-olj hex/spacing értéket** – csak token osztály (`bg-primary`, `text-foreground`, `rounded-2xl`…). Hiányzó érték → előbb a tokens fájlba.

---

## Navigáció / IA (v2 – FELÜLÍRJA a régi tab-struktúrát)

5 tab (hüvelykujj-elérés):

| Tab | Tartalom |
|---|---|
| **Kezdőlap** | Dashboard: köszöntés + tag-avatarok, „Ma" kártya (naptár), aktív lista kártya (+ Bolt mód gomb), Kassza kártya |
| **Naptár** | Hónap nézet + napi agenda + esemény szerkesztő sheet |
| **Bevásárlás** | Listák (kész) + alnézetként Termékek és Árak + belépés a Bolt módba |
| **Étrend** | Heti étkezésterv + receptek; „bevásárlólista generálása" gomb |
| **Kassza** | Havi keret / elköltött / hátralévő + kategóriák + megtakarítási célok |

A **Család/Profil** beállítások a Kezdőlap fejlécébe (avatar → beállítások) kerülnek, nem külön tabra.

---

## Kassza – familybudget integráció

**Ugyanaz a Supabase projekt**, ezért közvetlenül olvassuk a familybudget tábláit. **Csak olvasás** – a Kassza tabról nem írunk a budget táblákba v1-ben.

Releváns táblák (familybudget sémából):
- **`budget_plans`** – havi terv. Mezők: `user_id`, `total_amount` (tervezett keret, INT Ft), `actual_income` (tényleges bevétel, INT, lehet NULL), `budget_data` (JSONB tételek), `description`, `created_at`, `updated_at`.
- **`annual_budget_plans`** – éves terv (havi bevételek, éves/ismétlődő kiadások, megtakarítási terv – mind JSONB).
- **`savings_goals`** – `name`, `target_amount`, `current_amount`, `category`, `target_date`.

**`budget_data` parser – KRITIKUS:** három formátumot is felvehet, mindet kezelni kell:
```ts
type BudgetItem = { category: string; subcategory: string; amount: number }
type BudgetCategory = { name: string; /* ... */ }
type BudgetStorageV2 = { categories: BudgetCategory[] }
type BudgetStoragePayload = BudgetCategory[] | BudgetItem[] | BudgetStorageV2
```
A normalizáló logika már létezik a familybudget `src/components/dashboard.tsx`-ében – **azt emeld át** `src/lib/budget.ts`-be, ne írj újat.

**Implementáció:**
- `src/lib/budget.ts` – `getCurrentBudgetPlan()`, `normalizeBudgetData()`, `getSavingsGoals()`
- `src/store/budgetStore.ts` (zustand) vagy egy `useBudgetSummary()` hook
- Kezdőlap Kassza-kártya: tervezett keret, elköltött, hátralévő (token színek, `formatHuf`)
- Kassza tab: kategória-bontás + megtakarítási célok progress

> ⚠️ **Megerősítendő implementáció előtt:** mindkét repó (familyshopping + familybudget) tartalmaz `shopping_lists` / `products` migrációkat. Ha tényleg egy közös projekt, tisztázni kell, melyik tábla az igazság forrása, hogy ne legyen két párhuzamos bevásárló-rendszer. A Kassza/receptek olvasása előtt ezt ellenőrizd.

---

## Étkezéstervező

A familybudget kész tábláit használjuk (közös projekt):
- **`recipes`** – `name` (VARCHAR 255), `description`, `prep_time` (perc), `servings`, `image_url`, `instructions`
- **`recipe_ingredients`** – `recipe_id`, `name`, `quantity` (DECIMAL), `unit` (VARCHAR 50)

**Új tábla a heti tervhez** (lásd Új Supabase táblák):
- **`meal_plan_entries`** – `family_id`, `date`, `meal_type` (`reggeli`|`ebéd`|`vacsora`), `recipe_id`, `servings`, `created_by`.

**Workflow:** Étrend tabon a felhasználó recepteket húz napokra → „Bevásárlólista generálása" összegzi a kiválasztott napok `recipe_ingredients`-eit (név/mennyiség/egység szerint összevonva) → létrehoz vagy bővít egy `ShoppingList`-et (a meglévő lista-rendszerben, `name`/`quantity`/`unit`/`category` mezőkkel). A `servings` arányosít.

---

## Új Supabase táblák (a közös projektbe)

Mindkettő **`family_id`-vel** RLS-ezve (a meglévő `profiles.family_id` modellt követve), nem `user_id`-vel, hogy az egész család lássa.

**`calendar_events`**
```
id uuid pk, family_id uuid, created_by uuid,
title text not null, description text, location text,
starts_at timestamptz not null, ends_at timestamptz,
all_day boolean default false,
member_id uuid null,            -- melyik családtaghoz tartozik (szín)
color text null,                -- felülírja a tag színt, ha kell
rrule text null,                -- ismétlődés (RFC 5545), v1-ben opcionális
created_at timestamptz, updated_at timestamptz
```

**`meal_plan_entries`** (lásd Étkezéstervező).

Mindkettőhöz migráció a `supabase/migrations/`-be, RLS policy `family_id` alapján. Típusok a `src/types/index.ts`-be (`CalendarEvent`, `MealPlanEntry`).

---

## Bolt mód (v2 – finomított, de SZENT marad)

A funkció érintetlen, csak a háttérszín lágyul a stílushoz:
- Háttér: tiszta fekete helyett **`#13201F`** (meleg, nagyon sötét) – a magas kontraszt és olvashatóság megmarad.
- **Változatlan:** sormagasság 72 pt, checkbox 56 pt, item szöveg 24 pt Semibold, medium haptika pipáláskor, kipipált sorok helyben dimmelnek (nem rendeződnek át), `useKeepAwake()` aktív, rendszer dark/light módot figyelmen kívül hagyja.
- Az accent (korall `#FB7185`) használható a sticky bar CTA-ján.

---

## A `familyshopping` eredeti szabályai (változatlanul érvényben)

- **Fejlesztési filozófia:** feature-by-feature, legkisebb működő verzió először, refaktor csak ismétlésnél.
- **Komponensek:** `src/components/`, egy fájl/komponens, **named export**, propok lokális interfészen, variant/size/state union típusként. Min. tap target **44×44 pt** (`hitSlop`).
- **Képernyők:** `src/app/` csak route + képernyő, üzleti logika nélkül. Literál szín tilos – csak token osztály.
- **UI:** a megadott designt **pontosan** replikáld (layout, spacing, méret, szín, radius, árnyék, arányok). Ne approximálj engedély nélkül.
- **State:** local-first → zustand csak megosztotthoz → AsyncStorage perzisztencia.
- **TypeScript:** strict + `noUncheckedIndexedAccess`, `any` tilos, alias `@/*` → `src/*`.
- **Magyar copy:** minden user-facing string magyar. Pénznem `Ft` suffix (`340 Ft`), ezres szóköz (`1 240 Ft`), dátum `2026.04.18.`, `Intl.NumberFormat('hu-HU')`. Helperek: `lib/format.ts` (`formatHuf`, `formatHuDate`).
- **Accessibility:** minden interaktív elem magyar `accessibilityLabel`.
- **Don'ts:** nincs emoji a tab barban/core navigációban; nincs stacked toast (csere 120 ms cross-fade); `destructive` variant csak törléshez; nincs floating label inputon belül; nincs skeleton < 200 ms.
- **Képek:** centralizált import (`constants/images.ts`), soha közvetlenül képernyőben.
- **Titkok:** kulcs sosem kliens kódban; OCR/AI/külső API szerver route-on.
- **Auth:** Supabase Auth, ne építs egyedi megoldást.
- **Kanonikus igazság:** ha markdown spec és HTML mockup eltér → a HTML nyer. Handoff dokumentumok: `handoff/`.

---

## Parancsok
```bash
npm run start      # expo start
npm run ios        # ios simulator
npm run lint       # expo lint
npm run typecheck  # tsc --noEmit
npm run format     # prettier
```

---

## Feature implementáció (minden feature-nél)
1. Olvasd el ezt a fájlt
2. Azonosítsd az érintett fájlokat
3. Tartsd a változtatásokat fókuszáltan, ne írj át nem érintett kódot
4. Kövesd a meglévő mintákat
5. Győződj meg róla, hogy end-to-end működik
6. Javítsd a lint + type hibákat befejezés előtt
7. **Frissítsd a `backlog.md`-t**, ha végeztél egy művelettel

---

## Emlékeztető
**Minden feature előtt:** olvasd el ezt a fájlt és kövesd szigorúan. Tiszta, egyszerű kód. UI-t pontosan replikáld. Új dependency / új tábla / meglévő UI módosítása → előbb kérdezz.
