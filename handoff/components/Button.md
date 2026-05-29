# Button

A primer akció felülete. Minden screen-en megtalálható.

## Variants × sizes × states

| Axis | Values |
|---|---|
| `variant` | `primary` · `secondary` · `ghost` · `destructive` |
| `size`    | `sm` (36 pt) · `md` (44 pt) · `lg` (50 pt) |
| `state`   | default · pressed · disabled · loading |

## Props

```ts
import type { ReactNode } from 'react';
import type { TouchableOpacityProps } from 'react-native';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Visible label. Required unless `iconOnly` is true. */
  label?: string;

  /** Color treatment. Default: 'primary'. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';

  /** Height + text scale. Default: 'md'. */
  size?: 'sm' | 'md' | 'lg';

  /** When true, swaps label for a spinner and locks the current width. */
  loading?: boolean;

  /** Standard React Native disabled. Drops opacity to 0.4 and blocks haptics. */
  disabled?: boolean;

  /** Renders the button as a 1:1 square. `label` becomes the a11y label. */
  iconOnly?: boolean;

  /** Lucide icon, rendered left of the label (or centered when iconOnly). */
  icon?: ReactNode;

  /** Forces the button to stretch to its container's width. */
  fullWidth?: boolean;

  /** Haptic fired on press-up (not press-down). Default 'selection' for primary, none for ghost. */
  haptic?: 'none' | 'selection' | 'impactLight' | 'impactMedium';

  onPress?: () => void;
}
```

## Visual spec

| Variant | Background | Foreground | Border |
|---|---|---|---|
| `primary` | `#2563EB` | `#FFFFFF` | none |
| `secondary` | `#F1F5F9` (dark: `#1E293B`) | `#0F172A` (dark: `#F8FAFC`) | none |
| `ghost` | transparent | `#2563EB` | none |
| `destructive` | `#EF4444` | `#FFFFFF` | none |

| Size | Height | Padding (V/H) | Font size | Radius |
|---|---|---|---|---|
| `sm` | 36 | 12 / 16 | 13 | 12 |
| `md` | 44 | 14 / 20 | 15 | 12 |
| `lg` | 50 | 16 / 24 | 17 | 12 |

**Press animation:** scale 0.97 over 80 ms ease-out, 90% fill brightness.
**Disabled:** opacity 0.4, no haptic.
**Loading:** label → spinner (16 pt currentColor border), button width locked to pre-loading width to avoid layout shift.

## Example

```tsx
import { Button } from '@/components/Button';
import { ShoppingCart } from 'lucide-react-native';

// Primary CTA at the bottom of a form
<Button
  label="Bejelentkezés"
  variant="primary"
  size="lg"
  fullWidth
  loading={isSubmitting}
  onPress={handleLogin}
/>

// Secondary action
<Button label="Mégse" variant="secondary" size="md" onPress={onCancel} />

// Ghost link
<Button label="Elfelejtettem a jelszót" variant="ghost" size="md" onPress={onForgot} />

// Icon-only FAB-like
<Button
  iconOnly
  variant="primary"
  size="lg"
  icon={<ShoppingCart size={20} color="#fff" />}
  label="Új lista"
  haptic="impactLight"
  onPress={onCreate}
/>

// Destructive (use sparingly — never for "Cancel")
<Button label="Lista törlése" variant="destructive" size="md" onPress={confirmDelete} />
```

## A11y

- `accessibilityRole="button"` always.
- `accessibilityLabel` = `label` by default; explicit override required for icon-only.
- `accessibilityState={{ disabled, busy: loading }}` reflects the current state.
- Hit slop expanded to 44×44 if visual height < 44.

## Don't

- ❌ `destructive` for "Cancel" — reserved for delete/remove.
- ❌ More than one `primary` on the same screen.
- ❌ Disable haptic on `primary` without good reason.
