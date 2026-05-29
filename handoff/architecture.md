# Architecture — folder structure, dependencies, base layers

## Folder structure

```
bevasarlo/
├── App.tsx                    # Expo entry — wraps with providers + RootNavigator
├── app.json
├── babel.config.js            # nativewind/babel preset
├── tailwind.config.ts         # see handoff/tailwind.config.ts
├── tsconfig.json              # strict: true, paths: { "@/*": ["src/*"] }
├── package.json
└── src/
    ├── components/            # UI primitives — one file per component
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   ├── Card.tsx
    │   ├── Badge.tsx
    │   ├── Checkbox.tsx
    │   ├── BottomSheet.tsx
    │   ├── EmptyState.tsx
    │   ├── Skeleton.tsx
    │   └── Toast.tsx
    ├── screens/               # one folder per screen
    │   ├── Login/
    │   │   ├── index.tsx
    │   │   └── hooks.ts
    │   ├── ListOverview/
    │   ├── ListDetail/
    │   │   ├── index.tsx
    │   │   ├── ItemAddSheet.tsx
    │   │   └── ItemEditSheet.tsx
    │   ├── ShopMode/          # Bolt mód
    │   ├── ProductList/
    │   ├── ProductDetail/
    │   ├── ProductAdd/
    │   ├── PriceOverview/
    │   ├── OCRFlow/           # 5 step modal stack
    │   │   ├── Camera.tsx
    │   │   ├── Preview.tsx
    │   │   ├── Processing.tsx
    │   │   ├── ReviewItems.tsx
    │   │   └── SaveConfirm.tsx
    │   ├── Profile/
    │   ├── FamilySettings/
    │   └── PickerScreen/      # generic — used for valuta, bolt, kategória pickers
    ├── navigation/
    │   ├── RootNavigator.tsx  # auth vs app router
    │   ├── AppTabs.tsx        # 5-tab bottom navigator
    │   ├── ListaStack.tsx
    │   ├── TermekekStack.tsx
    │   ├── ArakStack.tsx
    │   ├── BoltStack.tsx
    │   ├── ProfilStack.tsx
    │   └── types.ts           # ParamList types
    ├── theme/
    │   ├── tokens.ts          # copy from handoff/tokens/tokens.ts
    │   ├── tokens.json        # copy from handoff/tokens/tokens.json
    │   ├── ThemeProvider.tsx  # reads AsyncStorage, applies class to root
    │   └── useTheme.ts
    ├── lib/
    │   ├── format.ts          # formatHuf, formatDate, formatHuDate
    │   ├── haptics.ts         # thin wrapper around expo-haptics
    │   ├── storage.ts         # AsyncStorage helpers, typed keys
    │   ├── ocr.ts             # OCR client — see screens/10-OCRFlow.md
    │   └── api/               # backend client (TBD)
    └── types/
        ├── product.ts
        ├── list.ts
        ├── user.ts
        └── ocr.ts
```

## Provider stack (App.tsx)

```tsx
<SafeAreaProvider>
  <ThemeProvider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
    <ToastHost />        {/* portal-style toast root */}
  </ThemeProvider>
</SafeAreaProvider>
```

## Dependencies (locked)

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "nativewind": "^4.0.36",
    "tailwindcss": "^3.4.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    "react-native-svg": "15.2.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "expo-haptics": "~13.0.0",
    "expo-camera": "~15.0.0",
    "expo-keep-awake": "~13.0.0",
    "lucide-react-native": "^0.376.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.79",
    "typescript": "~5.3.3",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0"
  }
}
```

## TypeScript

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

## Theme layer

The `ThemeProvider` does three things:

1. Reads `appearance` from `AsyncStorage` (`'light' | 'system' | 'dark'`, default `'system'`).
2. Resolves to actual light/dark using `useColorScheme()` when `system`.
3. Applies the class to the root view (NativeWind `dark:` modifier flips).

```tsx
// useTheme.ts
export function useTheme() {
  const [appearance, setAppearance] = useAsyncStorage('appearance', 'system');
  const system = useColorScheme(); // 'light' | 'dark' | null
  const resolved = appearance === 'system' ? (system ?? 'light') : appearance;
  return { appearance, resolved, setAppearance };
}
```

**Bolt mód is exempt.** The `ShopMode` screen sets a local style override (always `bg-bolt-bg`, `text-white`). It does not consult `useTheme()`.

## Storage keys (typed)

```ts
// lib/storage.ts
export const StorageKeys = {
  appearance:        'appearance',         // 'light' | 'system' | 'dark'
  productViewMode:   'product.viewMode',   // 'grid' | 'list'
  pricePeriod:       'price.period',       // '7' | '30' | '90'
  lastActiveListId:  'list.lastActive',    // string
  authToken:         'auth.token',         // keychain ideally
} as const;
```

## Navigation graph

See `navigation.md` for the full picture. Quick summary:

- `RootNavigator` — switches between `AuthStack` and `AppTabs` based on auth state
- `AppTabs` — 5 tabs: Lista, Termékek, Árak, Bolt mód, Profil
- Each tab has its own native stack
- `OCRFlow` is registered at the root level as a modal — launchable from any tab
- Bottom sheets are local (per-screen), not navigation routes

## Hungarian formatting helpers

```ts
// lib/format.ts
export const formatHuf = (n: number): string =>
  new Intl.NumberFormat('hu-HU', { style: 'decimal', maximumFractionDigits: 0 })
    .format(n) + ' Ft';

export const formatHuDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\./g, '.').replace(/ /g, '');
};
```
