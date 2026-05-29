# Bevásárló — Claude Code Handoff Package

> **Stack:** React Native · Expo · TypeScript · NativeWind (Tailwind)
> **Platform:** iOS 17+ (Android: stretch goal)
> **Locale:** hu-HU
> **Frame:** 390 × 844 pt (iPhone 14 / 15 / 16 logical)
> **Version:** v0.1 · 2026.04

Ez a mappa minden szükséges anyagot tartalmaz, hogy Claude Code (vagy bármely fejlesztő) el tudja kezdeni a tényleges implementációt. A design HTML mockupok a projekt gyökerében maradnak referenciaként.

---

## Olvasási sorrend

1. **[`CLAUDE.md`](./CLAUDE.md)** — projekt-konvenciók, parancsok, mit kell tudni az induláshoz. Claude Code ezt automatikusan beolvassa.
2. **[`architecture.md`](./architecture.md)** — javasolt mappastruktúra, függőségek, alaprétegek (theme, navigation, storage).
3. **[`tokens/tokens.json`](./tokens/tokens.json)** + **[`tokens/tokens.ts`](./tokens/tokens.ts)** — kanonikus design tokenek (színek, tipográfia, távolságok, sugarak, árnyékok). A `.ts` változat ad típusbiztos elérést a kódban.
4. **[`tailwind.config.ts`](./tailwind.config.ts)** — kész-bemásolható NativeWind / Tailwind konfiguráció a fenti tokenek alapján.
5. **[`components/`](./components/)** — 9 alapkomponens specifikációja. Minden fájl: prop API + `<Example />` használati minta + state-ek.
6. **[`screens/`](./screens/)** — 12 képernyő. Minden fájl: zónaspec, interakciók, edge case-ek, állapotok, navigáció. Screenshot mellette a `screens/screenshots/` mappában.
7. **[`navigation.md`](./navigation.md)** — teljes navigációs gráf (auth stack, tabok, modalok, gesztusok).
8. **[`animations.md`](./animations.md)** — minden animáció + haptika táblázat, eszközönként.

---

## Mit fed le a csomag

| Terület | Lefedettség |
|---|---|
| Design tokenek | ✅ teljes (14 base szín, 5 kategória, 8 típusszint, 9 spacing, 5 radius, 4 shadow) |
| Komponensek | ✅ 9 primitív, mind props + példa |
| Képernyők | ✅ 12 képernyő + 1 modális flow (OCR, 5 lépés) |
| Navigáció | ✅ teljes gráf, gesztusok, transitionök |
| Motion / haptika | ✅ 18-soros táblázat |
| Lokalizáció | ⚠️ hu-HU strings benne, de nincs i18n setup — javasolt: `i18n-js` |
| API contract | ⚠️ csak az OCR pipeline kontraktus van leírva — backend specet külön kell csinálni |
| Tesztelés | ❌ kívül esik a csomagon |

---

## Referencia HTML mockupok (a projekt gyökerében)

A handoff dokumentumok pixel-egzakt forrása. Ha bármi kétséges, ezek az igazság forrása:

- `design-system.html` — színek, típus, spacing, shadow
- `component-library.html` — minden komponens live, light + dark
- `screens.html` — Login, ListOverview, ListDetail, ItemAddModal, ShopMode (Bolt mód)
- `screens-04.html` — ProductList, ProductDetail, ProductAdd, PriceOverview
- `screens-05.html` — OCR flow (5 lépés), Profil, FamilySettings, navigáció diagram, animációs tábla

---

## Első parancsok

```bash
# új Expo TypeScript projekt
npx create-expo-app@latest bevasarlo --template expo-template-blank-typescript
cd bevasarlo

# NativeWind v4 + függőségek
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context

# Navigáció
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# Ikonok, haptika, kamera (OCR)
npx expo install lucide-react-native react-native-svg expo-haptics expo-camera expo-keep-awake

# Tárolás
npx expo install @react-native-async-storage/async-storage
```

Aztán másold be a `tailwind.config.ts`-t és a `tokens/`-mappát a projekt gyökerébe (vagy `src/theme/` alá), és kezdd a `architecture.md` szerinti mappastruktúrával.
