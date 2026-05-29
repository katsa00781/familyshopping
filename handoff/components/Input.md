# Input

Egyetlen szövegmező cím-felülettel. Soha nem floating label.

## Types × states

| Axis | Values |
|---|---|
| `type`   | `text` · `email` · `password` · `number` · `currency` · `search` |
| `state`  | default · focused · error · disabled |

## Props

```ts
import type { TextInputProps } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Label rendered ABOVE the field. Never floats. */
  label?: string;

  /** Field type — drives keyboard, secureTextEntry, suffix, leading icon. */
  type?: 'text' | 'email' | 'password' | 'number' | 'currency' | 'search';

  /** Inline helper text below the field. Hidden when `error` is set. */
  helper?: string;

  /** Inline error text below the field. Renders red. Triggers red border. */
  error?: string;

  /** Marks the field with a small red `*` in the label. */
  required?: boolean;

  /** Disables input and dims to 60% opacity. */
  disabled?: boolean;

  /** Controlled value. */
  value?: string;

  /** Called on change. */
  onChangeText?: (text: string) => void;

  /** For `type="search"`: shows clear button when value is non-empty. */
  onClear?: () => void;
}
```

## Visual spec

- **Label** — `body-sm` (13 pt) · `#475569` · 6 pt below
- **Field** — height 44 pt · radius 10 pt · padding 12 H / 12 V · `body-lg` (17 pt)
- **Helper / error** — `body-sm` (13 pt) · 6 pt above

| Border state | Color | Width | Notes |
|---|---|---|---|
| default | `#E2E8F0` / dark `#334155` | 1 px | |
| focused | `#2563EB` | 1.5 px | animate 120 ms |
| error   | `#EF4444` | 1.5 px | |
| disabled | `#E2E8F0` | 1 px | bg `#F8FAFC` |

## Type behaviors

| Type | Keyboard | Extras |
|---|---|---|
| `text` | default | — |
| `email` | `email-address` | `autoCapitalize="none"`, `autoCorrect={false}` |
| `password` | default | `secureTextEntry` + eye toggle (Eye / EyeOff icon, light haptic on toggle) |
| `number` | `numeric` | — |
| `currency` | `numeric` | right-aligned, suffix `Ft` (mono) |
| `search` | default + `returnKeyType="search"` | leading magnifier · trailing X clear when value |

## Example

```tsx
import { Input } from '@/components/Input';
import { useState } from 'react';

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

<Input
  label="E-mail cím"
  type="email"
  required
  value={email}
  onChangeText={setEmail}
  error={emailError}
  placeholder="janos@example.hu"
/>

<Input
  label="Jelszó"
  type="password"
  required
  value={password}
  onChangeText={setPassword}
/>

<Input
  label="Ár"
  type="currency"
  value={price}
  onChangeText={setPrice}
  helper="A vásárláskor látott ár"
/>

<Input
  type="search"
  placeholder="Termék keresése"
  value={query}
  onChangeText={setQuery}
  onClear={() => setQuery('')}
/>
```

## Rules

- Validation messages appear **250 ms after blur**, never while typing.
- Focus border animates in 120 ms.
- Required marker is **red `*`** appended to label, never inside the field.
- VoiceOver: `accessibilityLabel` = `label` + ` (kötelező)` if `required`. Error reads via `accessibilityHint`.
