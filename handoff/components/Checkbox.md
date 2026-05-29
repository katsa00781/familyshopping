# Checkbox

Két méret, két kontextus. **A bolt mód variánsa nem opcionális** — más szabályok érvényesek rá.

## Variants

| `variant` | Use | Size | Border | Fill |
|---|---|---|---|---|
| `list` | List rows in normal mode | 24 pt | 1.5 px `#CBD5E1` | `#2563EB` |
| `bolt` | Bolt mód rows | 56 pt | none (filled both states) | `#22C55E` when checked, `#334155` when empty |

## Props

```ts
export interface CheckboxProps {
  /** Controlled state. */
  checked: boolean;

  /** Called on tap. */
  onChange: (next: boolean) => void;

  /** Visual + behavior preset. Default: 'list'. */
  variant?: 'list' | 'bolt';

  /** Disabled state. Drops opacity to 0.4. */
  disabled?: boolean;

  /** Optional label to read for VoiceOver. */
  accessibilityLabel?: string;
}
```

## Behavior

### `list` variant

- Empty: 1.5 px border, transparent fill
- Checked: solid `#2563EB` fill, white `Check` icon (Lucide, stroke 2.5)
- Animation: 150 ms spring · damping 16 · scale 0.8 → 1.2 → 1.0
- Haptic: `selection` on tick

### `bolt` variant

- Empty: solid `#334155` fill, no icon
- Checked: solid `#22C55E` fill, white `Check` icon (Lucide, stroke 3, size 32)
- Animation: 220 ms spring · damping 12 · scale 0.8 → 1.3 → 1.0 (intentional overshoot)
- Haptic: `impactMedium` on tick — every time, without exception

## Tap target

- `list` (24 pt visual) → wrap in 44 pt Pressable (use `hitSlop`)
- `bolt` (56 pt visual) → already meets target

## Side effects on the row

The checkbox itself does **not** modify the row's appearance — that's the row's job. Conventions:

- **List variant in a row:** when toggled true, the row strikes through its label, dims to opacity 0.55, and slides to the bottom of its category (180 ms ease-out).
- **Bolt variant in a row:** the row dims to 40% opacity, strikes through — **but does not move**. The user's positional memory of the list stays intact.

## Example

```tsx
import { Checkbox } from '@/components/Checkbox';

// List row
<View className="flex-row items-center h-row gap-3 px-screen-x">
  <Checkbox
    checked={item.done}
    onChange={(next) => toggle(item.id, next)}
    accessibilityLabel={`${item.name} kipipálása`}
  />
  <Text className={item.done ? 'line-through text-muted' : 'text-body-lg'}>{item.name}</Text>
</View>

// Bolt mód row
<View className="flex-row items-center h-row-bolt gap-4 px-screen-x">
  <Checkbox variant="bolt" checked={item.done} onChange={onToggle} />
  <Text className="text-bolt-mod-item text-white">{item.name}</Text>
</View>
```

## Rules

- Never use `bolt` variant outside Bolt mód.
- Never skip the medium haptic on `bolt`.
- Don't reorder checked rows in Bolt mód — only in normal list mode.
