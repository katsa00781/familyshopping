# Navigation graph

A teljes információs architektúra. Auth → bottom tabs → stacks; az OCR egy globális modál a tab-gráfon kívül.

## Top-level

```
RootNavigator
├── AuthStack            // when not signed in
│   ├── Login            (headerShown: false)
│   ├── Register         (headerShown: false)
│   └── ForgotPassword
│
└── AppRoot              // when signed in
    ├── AppTabs          (bottom tabs · 5 tabs)
    └── OCRFlow          (modal · presentation: 'modal')
```

Az `AppRoot` egy native-stack — az `AppTabs` az alsó képernyő, az `OCRFlow` pedig "modal" presentationnel feljöhet bárhonnan.

## AppTabs

```
┌──── Lista ───── Termékek ──── Árak ──── Bolt mód ──── Profil ────┐
│                                                                  │
│  ShoppingCart    Package    TrendingUp   ShoppingBag    User     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   ListaStack   TermekekStack  ArakStack   BoltStack   ProfilStack
```

Tab spec: `tabBarIcon`-ok Lucide RN, stroke 1.75, 28 pt. Aktív szín `primary` (`#2563EB`), inaktív `muted`.

## Per-stack routes

### ListaStack

```
ListOverview                      // root
  ├─ push → ListDetail
  │            ├─ sheet → ItemAdd          (BottomSheet half)
  │            │           └─ modal → BarcodeScan
  │            ├─ sheet → ItemEdit         (BottomSheet half)
  │            └─ modal → OCRFlow          (pre-bound to current list)
  └─ action sheet → 'Új lista' or 'Blokk szkennelése' (→ OCRFlow)
```

### TermekekStack

```
ProductList                       // root
  ├─ push → ProductDetail
  │            └─ sheet → ProductEdit      (BottomSheet full)
  └─ push → ProductAdd
              └─ modal → BarcodeScan
```

### ArakStack

```
PriceOverview                     // root
  └─ push → PriceHistoryDetail    // chart fullscreen — reuses ProductDetail's HistoryBlock
```

### BoltStack

```
ShopMode                          // root — standalone UX, no children
```

`ShopMode` egyetlen képernyő. Nincs alá-stack — ha még sincs aktív lista, push out of Bolt mode toasttal.

### ProfilStack

```
Profile                           // root
  ├─ push → FamilySettings
  ├─ push → NotificationSettings
  ├─ push → EditProfile
  ├─ push → ChangePassword
  ├─ push → Privacy
  ├─ push → Terms
  └─ push → PickerScreen          // generic, used for valuta / bolt / kategória
```

## OCRFlow (modal)

A teljes OCR flow egy 5-screen native stack inside a modal presentation:

```
OCRFlow [presentation: 'modal']
  ├─ Camera
  ├─ Preview
  ├─ Processing
  ├─ ReviewItems
  └─ SaveConfirm
```

Bárhonnan launchable: Lista FAB, ListDetail header camera, Termékek FAB long-press.
Close × bármikor (kivéve Processing) visszadob a hívó képernyőre.

## Gestures

| Surface | Gesture | Behavior |
|---|---|---|
| Stack | Swipe-back left edge | Native iOS. Push 350 ms slide, pop 300 ms. |
| Tab bar | Tap | Instant switch (no transition). State preserved per-tab. |
| Tab bar | Tap on active tab | First tap scrolls the root list to top; second tap pops the stack to root. |
| Bottom sheet | Drag down | Dismiss when velocity > 800 px/s or > 30 % drag. Backdrop tap = dismiss. Outside taps cascade → keyboard hide → sheet. |
| OCR modal | Pull down | 0.3 friction; locked during Processing. Hardware back on Android = step back if reversible, else dismisses. |

## Typed param lists

```ts
// navigation/types.ts
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type ListaStackParamList = {
  ListOverview: undefined;
  ListDetail: { listId: string };
};

export type TermekekStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: string };
  ProductAdd: { prefill?: Partial<Product> };
};

export type ArakStackParamList = {
  PriceOverview: undefined;
  PriceHistoryDetail: { productId: string };
};

export type ProfilStackParamList = {
  Profile: undefined;
  FamilySettings: undefined;
  NotificationSettings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Privacy: undefined;
  Terms: undefined;
  PickerScreen: {
    kind: 'currency' | 'store' | 'category' | 'unit';
    title: string;
    onPick: (value: string) => void;
  };
};

export type AppRootParamList = {
  AppTabs: undefined;
  OCRFlow: { listId?: string };
  BarcodeScan: undefined;
};
```

## Tab badges (out of scope v0.1)

Nem teszünk badge számokat a tabokra a v0.1-ben. Ha a jövőben:
- **Lista** — count of lists with un-checked items (max 99+)
- **Árak** — count of "új ár észlelt" since last visit

## Deep links

Out of scope v0.1, but reserve schema: `bevasarlo://list/<id>`, `bevasarlo://product/<id>`.
