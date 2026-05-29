# Bevásárló – CLAUDE.md

> **Claude Code-nak:** ezt olvasd el először, minden prompt előtt. Ez definiálja, mit építünk, hogyan, és mik a nem-alkudható szabályok.

## Szerepkör
Te egy tapasztalt Expo és React Native mérnök vagy, aki segít megépíteni a **Bevásárló** alkalmazást. Írj tiszta, egyszerű, karbantartható kódot. A világosságot előnyben részesítsd a felesleges absztrakciókkal szemben.

---

## Projekt áttekintés
**Bevásárló** – magyar háztartási bevásárló app, amelyben egy család közösen kezel bevásárlólistákat, termékeket és árelőzményeket. iOS-first.

A killer feature a **Bolt mód**: nagy kontrasztú, óriási tap-targetes képernyő, amit a boltban, a polc előtt használsz.

Az app a következőket tartalmazza:
- Közös bevásárlólisták (család szinten megosztva)
- Bolt mód – fekete háttér, óriás sorok, haptikus pipálás
- Termékkatalógus árelőzménnyel
- Áráttekintés / ártrendek boltonként
- OCR blokk-szkennelés (kamera + szerver oldali vision endpoint)
- Profil és családbeállítások

Az implementáció legyen egyszerű és olvasható.

---

## Tech stack (rögzített)

- **Runtime:** React Native via Expo (managed workflow), SDK ~54
- **Nyelv:** TypeScript, strict mode. `src/`-ben nincs JS fájl.
- **Styling:** NativeWind v4 (Tailwind RN-hez). `StyleSheet.create` csak ha elkerülhetetlen (animált értékek, stb.)
- **Navigáció:** `expo-router` (file-based routing, Tabs + Stack). **Megjegyzés:** a projekt expo-router-t használ, nem @react-navigation direktben.
- **State:** Local state first. Megosztott state-hez `zustand` v5. **Redux tilos.**
- **Perzisztencia:** `AsyncStorage` (theme, view toggle-ök, utolsó aktív lista)
- **Animáció:** `react-native-reanimated` v4. Spring minden state-flipnél.
- **Ikonok:** `lucide-react-native`, stroke width 1.75
- **Haptika:** `expo-haptics` — **telepítendő még** (mapping: `handoff/animations.md`)
- **Backend / Auth:** `@supabase/supabase-js` v2, Supabase Auth. Kliens: `src/lib/supabase.ts`.
- **OCR kamera:** `expo-camera` — **telepítendő még**; az OCR hívás szerver oldali (vision endpoint, kontraktus: `handoff/screens/10-OCRFlow.md`)
- **Keep-awake (Bolt mód):** `expo-keep-awake` (telepítve, **de még nincs bekapcsolva a Bolt képernyőn**)

Új könyvtárat ne adj hozzá engedély nélkül. Ha indokolt lenne, javasold és kérdezz rá. Max kevés, jól dokumentált dependency.

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

## Döntési szabályok
Ha valami nem egyértelmű, javasold a jobb megközelítést.
Ha egy új könyvtár segítene, indokold meg és kérdezz rá mielőtt hozzáadod.
Meglévő UI-t ne változtass meg engedély nélkül.
**Ha egy markdown spec és a HTML mockup eltér, a HTML a kanonikus igazság.**

---

## Mappastruktúra

Részletesen: `handoff/architecture.md`. Tényleges jelenlegi állapot:

```
src/
  app/             # expo-router route-ok (tabs, auth stack, lista/[id], termekek/[id])
  components/
    ui/            # Button, Input, Badge, BottomSheet, EmptyState, Skeleton, Toast
    bolt/          # BoltRow, BoltCheckbox
    lista/         # ListCard, ListItem, ItemAddSheet, ItemEditSheet, ListCreateSheet
    termekek/      # ProductCard, ProductRow
    arak/          # KpiCard, DonutChart, ChangeRow
  store/           # authStore, listStore, productStore, priceStore, toastStore
  hooks/           # use-theme.ts, use-color-scheme.ts
  lib/             # supabase.ts (hiányzik: format.ts, storage.ts, haptics.ts)
  types/           # index.ts (minden típus egy fájlban)
  data/            # mockLists.ts, mockProducts.ts (dev only)
  constants/       # colors.ts, theme.ts, typography.ts, images.ts
```

**Tervezett (backlogban):** `screens/`, `navigation/types.ts`, `lib/format.ts`, `lib/storage.ts`, `lib/haptics.ts`

**app/ + screens/** – csak route-ok és képernyők. Komponenseket és üzleti logikát ne tartalmazzon.

**components/** – újrafelhasználható UI primitívek. Egy fájl / komponens, named export. Példák: Button, Input, Card, Badge, Checkbox, BottomSheet, EmptyState, Skeleton, Toast.

**lib/** – külső service helperek (pl. ocr.ts, storage.ts, format.ts). Titkos kulcsokat soha ne tárolj itt.

**store/ (zustand)** – csak megosztott state-hez. Példa: aktív lista, family kontextus.

---

## Design tokenek
**Egyetlen forrás:** `handoff/tokens/tokens.json`. Típusos tükör: `handoff/tokens/tokens.ts`. A Tailwind a `tailwind.config.js`-en keresztül olvassa.

**Soha** ne hardcode-olj hex értéket, betűméretet vagy pt spacinget komponensekben. Ha kell egy érték, ami nincs a tokenekben, először javasold a tokens fájlba felvenni.

---

## Komponens szabályok
- Minden UI primitív a `src/components/`-ben, egy fájl / komponens.
- Named export, soha nem default. `import { Button } from '@/components/Button'`.
- Propok az ugyanabban a fájlban definiált `ButtonProps` interfészen át.
- Variant/size/state union típusként, nem boolean-ként:
  ```ts
  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
  type ButtonSize = 'sm' | 'md' | 'lg';
  ```
- Minimum tap target **44×44 pt** mindenhol. `hitSlop`-pal, ha a vizuál kisebb.
- **Minden interaktív komponens támogassa a magyar VoiceOver feliratot** `accessibilityLabel`-en át.

---

## Képernyő szabályok
- Egy mappa / képernyő: `src/screens/<ScreenName>/`.
- Belül: `index.tsx` (komponens), `styles.ts` ha elkerülhetetlen, `hooks.ts` a képernyő-lokális state-hez.
- Képernyők soha ne stílusozzanak literál színnel — csak `bg-primary`, `text-foreground`, stb.

---

## UI szabályok
- A megadott designt **pontosan** replikáld.
- Layout, spacing, padding, betűméret, hierarchia, színek, border-radius, árnyékok, igazítás és arányok mind egyezzenek.
- Ne approximálj, ne egyszerűsíts engedély nélkül.

---

## Styling szabályok
Használj NativeWind osztályokat. `StyleSheet.create`-et csak akkor, ha className-mel nem megoldható (animált értékek, runtime-számolt dinamikus stílus, platform-specifikus eset).

---

## State management
- **Zustand** – globális/megosztott kliens state (csak ha kell)
- **Lokális state** – átmeneti UI state (first choice)
- **AsyncStorage** – perzisztencia

Tárolt kulcsok (typed, `lib/storage.ts`): `appearance`, `product.viewMode`, `price.period`, `list.lastActive`, `auth.token`.

---

## TypeScript szabályok
- Strict mode + `noUncheckedIndexedAccess`
- `any` tiltott
- Path alias: `@/*` → `src/*`
- Tartsd a típusokat egyszerűnek és olvashatónak

---

## Magyar copy és formázás
Minden user-facing string magyar. Pénznem `Ft` (HUF), suffix pozícióban (`340 Ft`), ezres elválasztó szóköz (`1 240 Ft`). Dátum: `2026.04.18.`. Számokhoz `Intl.NumberFormat('hu-HU')`. Helperek: `lib/format.ts` (`formatHuf`, `formatHuDate`).

---

## Bolt mód szent
- Háttér **mindig** `#000000`, függetlenül a rendszer témától.
- Sormagasság **72 pt**, checkbox **56 pt**, item szöveg **24 pt Semibold**.
- Medium haptika minden pipálásnál.
- Kipipált sorok **nem rendeződnek át** — helyben dimmelnek. A user "hol volt a Tej" mentális térképének túl kell élnie.
- `useKeepAwake()` aktív az egész képernyőn.
- A Bolt mód **nem** veszi figyelembe a rendszer dark/light módot.

---

## Don'ts
- ❌ Nincs emoji a tab barban vagy core navigációban. Csak segmented controlon belül (Megjelenés: ☀ ◐ ☾).
- ❌ Nincs stacked toast. Új toast lecseréli a régit 120 ms cross-fade-del.
- ❌ Nincs `destructive` button variant a "Mégse"-hez — csak törléshez/eltávolításhoz.
- ❌ Nincs floating label inputon belül. Mindig fölötte (a magyar összetett szavak hosszúak).
- ❌ Nincs skeleton < 200 ms — ha gyors az adat, hagyd ki.

---

## Kép szabályok
Centralizált image importot használj (`constants/images.ts` vagy `theme/`). Képeket ne importálj közvetlenül képernyőkben vagy komponensekben.

---

## Titkok és biztonság
- Titkos kulcsokat soha ne tegyél kliens kódba.
- Server route-okat használj tokenekhez, OCR/AI hívásokhoz és külső API hozzáféréshez.

---

## Autentikáció
Az MVP-ben egyszerű auth (Login / Register / ForgotPassword). Ne építs túlbonyolított egyedi auth megoldást; ha külső szolgáltató (pl. Clerk / Supabase Auth) kerül szóba, javasold és kérdezz rá.

---

## Parancsok

```bash
# dev
npm run start          # expo start
npm run ios            # ios simulator
npm run android        # android emulator (alacsonyabb prioritás)

# lint (működik)
npm run lint           # expo lint (eslint)

# typecheck / format — még NINCS package.json scriptként bekötve
npx tsc --noEmit       # typecheck
npx prettier --write . # format
```

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

## Referencia — handoff mappa

A `handoff/` mappa tartalmaz minden tervezési dokumentumot. Ha bármi kétséges, ezek az igazság forrása:

- `handoff/screens/screenshots/` — képernyő screenshotok (01–12 + OCR lépések)
- `handoff/screens/` — részletes screen spec markdown fájlok (01-Login.md … 12-FamilySettings.md)
- `handoff/components/` — komponens spec markdown fájlok
- `handoff/tokens/tokens.json` — design tokenek
- `handoff/animations.md` — haptika + animáció mapping
- `handoff/navigation.md` — nav gráf

---

## Emlékeztető
**Minden feature előtt:**
- Olvasd el ezt a fájlt
- Kövesd szigorúan
- Tiszta, egyszerű kódot írj
- UI-t pontosan replikáld a megadott design alapján
- Ha a markdown és a HTML eltér → a HTML nyer
-Ha végeztél egy művelettel azt a backlog.md fájlban is aktualizáld. 