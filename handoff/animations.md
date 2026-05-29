# Animations & haptics

iOS-native érzés. Springs everywhere there's a state flip; ease-out for everything that exits; linear for ambient loops. Haptics are aligned 1:1 with the moment of **visual settle**, not the moment of touch.

> Hardware: `expo-haptics`. Use `Haptics.selectionAsync()`, `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`, etc.

## Full motion table

| Element | Animation | Duration | Easing | Haptic |
|---|---|---|---|---|
| Tab váltás | instant (native) | — | — | none |
| Stack push / pop | slide right / left | 350 / 300 ms | iOS default | none |
| Bottom sheet open | slide up from bottom | 300 ms | spring damping 20 | `selection` |
| Bottom sheet close | slide down | 250 ms | ease-out | none |
| OCR modal open | slide up full screen | 400 ms | spring damping 22 | `impactMedium` |
| Checkbox tick (List) | scale 0.8 → 1.2 → 1.0 + color | 150 ms | spring damping 16 | `selection` |
| **Checkbox tick (Bolt)** | **scale 0.8 → 1.3 → 1.0 + color** | **200 ms** | **spring damping 12** | **`impactMedium`** |
| Swipe-action reveal | follows finger; snap on release | 200 ms snap | ease-out | `selection` at threshold |
| Row delete | slide up & fade | 200 ms | ease-in | `impactLight` |
| FAB tap | scale 0.9 → 1.0 | 100 ms | ease-out | `selection` |
| OCR scanner band | top → bottom · loop | 1400 ms | linear | none |
| SaveConfirm check | scale 0 → 1.1 → 1.0 · ring fade | 300 ms | spring damping 14 | `notificationSuccess` |
| List complete | confetti pip + check stamp | 600 ms | spring | `notificationSuccess` |
| Skeleton shimmer | gradient sweep left → right | 1200 ms loop | linear | none |
| Toast appear | slide up from bottom | 200 ms | spring damping 18 | none |
| Toast dismiss | slide down | 180 ms | ease-in | none |
| Validation error | shake 4× (±4 px) | 220 ms | ease-in-out | `notificationError` |
| Pull-to-refresh | follows finger; spinner spin | continuous / 600 ms | ease-out | `impactLight` at threshold |

## Reanimated patterns

### Spring tick (List checkbox)

```ts
import { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const scale = useSharedValue(1);

const onPress = () => {
  scale.value = withSpring(1.2, { damping: 16, stiffness: 200 }, () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 200 });
  });
  Haptics.selectionAsync();          // fire at touch — selection is cheap
  onChange(!checked);
};

const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
```

### Bolt checkbox (medium haptic on settle)

```ts
import { withSequence, withSpring, runOnJS } from 'react-native-reanimated';

const onTick = () => {
  scale.value = withSequence(
    withSpring(1.3, { damping: 12, stiffness: 220 }),
    withSpring(1.0, { damping: 12, stiffness: 220 }, (finished) => {
      if (finished) runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
  );
  onChange(!checked);
};
```

### Shake (validation error)

```ts
const offset = useSharedValue(0);

const shake = () => {
  offset.value = withSequence(
    withTiming(-4, { duration: 55 }),
    withTiming(4,  { duration: 55 }),
    withTiming(-4, { duration: 55 }),
    withTiming(0,  { duration: 55 })
  );
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};
```

### Sheet open haptic

```ts
useEffect(() => {
  if (open) Haptics.selectionAsync();
}, [open]);
```

## Haptic alignment rule

**Fire at visual settle, not at touch-down.** Exception: FAB tap and Selection-style toggles where the press IS the affordance.

Why: tap-cancellation honesty. If a user starts a press and drags away, no haptic should fire. Animation completion is the source of truth.

```ts
// Bad — fires even if user cancels
onPressIn={Haptics.selectionAsync}

// Good — fires after spring settles
withSpring(1, config, (finished) => {
  if (finished) runOnJS(Haptics.selectionAsync)();
});
```

## Bolt mód: medium haptic, every tick

Not negotiable. The user's eyes are on the shelf, not the screen. The haptic is the **only** confirmation they get that the tap landed.

```ts
// ShopMode/BoltRow.tsx
const onToggle = () => {
  // ...spring animation...
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  onChange(item.id);
};
```

## Don'ts

- ❌ `notificationSuccess` everywhere — reserve for end-of-flow moments (SaveConfirm, list complete).
- ❌ Haptic on `onPressIn` — see alignment rule above.
- ❌ Skeleton durations < 200 ms — they'll flicker on fast networks.
- ❌ Stacking toasts — always cross-fade, see `components/Toast.md`.
