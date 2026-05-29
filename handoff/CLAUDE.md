# Project conventions — Bevásárló

> **For Claude Code:** read this first. It defines what to build, how, and the non-negotiables.

## What this is

A Hungarian household shopping app. iOS-first React Native + Expo. The user's family shares shopping lists, products and price history; the killer feature is **Bolt mód** — a high-contrast, oversized-target screen for use inside a supermarket aisle.

## Stack (locked)

- **Runtime:** React Native via Expo (managed workflow). SDK 51+.
- **Language:** TypeScript, strict mode. No JS files in `src/`.
- **Styling:** NativeWind v4 (Tailwind for RN). No StyleSheet.create unless absolutely necessary (animated values, etc.).
- **Navigation:** `@react-navigation/native` + `native-stack` + `bottom-tabs`.
- **State:** Local state first. For shared state, `zustand` if needed. **Do not** add Redux.
- **Storage:** `AsyncStorage` for prefs (theme, view toggles, last-active list).
- **Animation:** `react-native-reanimated` v3. Springs everywhere there's a state flip.
- **Icons:** `lucide-react-native`, stroke width 1.75.
- **Haptics:** `expo-haptics`. See `animations.md` for per-interaction mapping.
- **OCR camera:** `expo-camera` for capture; OCR call is server-side (vision endpoint, contract in `screens/10-OCRFlow.md`).
- **Keep-awake (Bolt mód):** `expo-keep-awake`.

## Folder structure

See `architecture.md`. Strictly:

```
src/
  app/             # routes (one folder per stack/tab)
  components/      # UI primitives — one file per component, named export
  screens/         # screen components, one folder each
  theme/           # tokens.ts, tailwind plugin helpers
  lib/             # data, OCR client, storage adapters
  types/           # shared types
```

## Design tokens

**Single source of truth:** `handoff/tokens/tokens.json`. Mirrored typed in `tokens/tokens.ts`. Tailwind reads them via `tailwind.config.ts`.

**Never** hardcode hex values, font sizes, or pt spacings in components. If you need a value that's not in tokens, propose adding it to the tokens file first.

## Component rules

- Every UI primitive lives in `src/components/`, one file per component.
- Named export, never default. Test ergonomics — `import { Button } from '@/components/Button'`.
- Props are typed via `ButtonProps` interface defined in the same file.
- Variants/sizes/states defined as union types, not booleans. Example:
  ```ts
  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
  type ButtonSize = 'sm' | 'md' | 'lg';
  ```
- Minimum tap target **44×44 pt** everywhere. Pass with `hitSlop` if the visual is smaller.
- **All interactive components must support Hungarian VoiceOver labels** via `accessibilityLabel`.

## Screen rules

- One folder per screen under `src/screens/<ScreenName>/`.
- Inside: `index.tsx` (component), `styles.ts` if unavoidable, `hooks.ts` for screen-local state.
- Screens never style themselves with literal colors — only `bg-primary`, `text-foreground`, etc.

## Hungarian copy

All user-facing strings are Hungarian. Currency is `Ft` (HUF), suffix-positioned (`340 Ft`), thousands separator is space (`1 240 Ft`). Date format `2026.04.18.`. Use `Intl.NumberFormat('hu-HU')` for numbers.

## Bolt mód is sacred

- Background **always** `#000000`, regardless of system theme.
- Row height **72 pt**, checkbox **56 pt**, item text **24 pt Semibold**.
- Medium haptic on every checkbox tick.
- Checked rows **do not reorder** — they dim in place. The user's mental "where Tej was" map must survive.
- `useKeepAwake()` active for the whole screen.

## Don'ts

- ❌ No emoji in tab bar or core navigation. Only inside segmented controls (Megjelenés: ☀ ◐ ☾).
- ❌ No stacked toasts. New toast replaces old via 120 ms cross-fade.
- ❌ No `destructive` button variant for "Cancel" — only for delete/remove.
- ❌ No floating labels inside inputs. Always above. Hungarian compounds are long.
- ❌ No skeletons < 200 ms — if data is fast, skip the skeleton.
- ❌ Bolt mód does **not** honor system dark/light mode.

## Commands

```bash
# dev
npm run start          # expo start
npm run ios            # ios simulator
npm run android        # android emulator (lower priority)

# typecheck / lint (set these up early)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run format         # prettier
```

## Reference HTML mockups

Project root (sibling to this `handoff/` folder):

- `design-system.html` — tokens visualised
- `component-library.html` — components live, light + dark
- `screens.html`, `screens-04.html`, `screens-05.html` — all 12 screens + OCR flow + nav graph

If a markdown spec and the HTML disagree, **the HTML is canonical**.
