# Bevásárló – Feature task lista v1

## Setup (egyszeri, ebben a sorrendben)

- [ ] Expo projekt létrehozása: `npx create-expo-app bevasarlo --template blank-typescript`
- [ ] Git init, első commit: `"init"`
- [ ] `.env` és `.env.example` létrehozása, `.gitignore` beállítása (`.env` bent legyen)
- [ ] Supabase URL + anon key beállítása `.env`-be (`EXPO_PUBLIC_` prefix)
- [ ] Függőségek telepítése:
  - `nativewind` + `tailwindcss`
  - `@supabase/supabase-js`
  - `@react-native-async-storage/async-storage`
  - `zustand`
  - `lucide-react-native`
  - `react-native-svg` (Lucide-hoz kell)
  - `expo-router`
  - `expo-keep-awake` (bolt mód screen-lock tiltáshoz)
- [ ] NativeWind v4 konfiguráció (`tailwind.config.js`, `babel.config.js`, `global.css`)
- [ ] `constants/colors.ts` létrehozása (design system tokenek)
- [ ] `constants/typography.ts` létrehozása
- [ ] `constants/images.ts` létrehozása
- [ ] `types/index.ts` létrehozása (List, Item, Product, PriceEntry, Category)
- [ ] `lib/supabase.ts` létrehozása (Supabase kliens AsyncStorage-dzsal)
- [ ] `data/mockProducts.ts` – 10-15 hardcoded termék (tej, kenyér, sajt stb.)
- [ ] `data/mockLists.ts` – 1-2 hardcoded bevásárlólista kezdő tartalommal
- [ ] CLAUDE.md elhelyezése a projekt gyökerében
- [ ] Push GitHub-ra
- [ ] Expo Go-ban vagy szimulátoron fut

---