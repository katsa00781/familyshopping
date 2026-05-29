# BottomSheet

Modális felület a képernyő aljáról csúszva. Két magasság, közös chrome.

## Variants

| `size` | Height | Use |
|---|---|---|
| `half` | 50 vh (~440 pt on 14/15) | Quick edits, item add |
| `full` | 90 vh (~760 pt) | Multi-step flows, add-product |

## Props

```ts
import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /** Open / closed. Controlled. */
  open: boolean;

  /** Called when the user dismisses (swipe-down, backdrop tap, or X button). */
  onClose: () => void;

  /** Magasság preset. Default: 'half'. */
  size?: 'half' | 'full';

  /** Optional title rendered in the header. */
  title?: string;

  /** Sticky CTA rendered above the bottom safe area. */
  cta?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };

  /** Renders an X close button leading in the header. Auto-true when size === 'full'. */
  showClose?: boolean;

  /** Snap points (vh). Default depends on size: half = [0.5, 0.9], full = [0.9]. */
  snapPoints?: number[];

  children: ReactNode;
}
```

## Visual spec

- **Container** — top radius 16 pt · `bg-card` · shadow-xl
- **Backdrop** — `rgba(0,0,0,0.4)` · fades in 200 ms
- **Drag indicator** — 36 × 4 pt rounded bar, `#CBD5E1`, centered, 8 pt from top
- **Header** — 56 pt; X (leading, full only) + title (heading-md, centered) + spacer
- **CTA strip** — 16 pt padding · primary lg · respects bottom safe area

## Animations

| Event | Animation | Duration | Haptic |
|---|---|---|---|
| Open | slide up from bottom | 300 ms spring, damping 20 | `selection` |
| Close | slide down | 250 ms ease-out | none |
| Swipe-dismiss | follows finger; commit when velocity > 800 px/s OR drag > 30% of height | snap 200 ms | none |

## Example

```tsx
import { BottomSheet } from '@/components/BottomSheet';

const [open, setOpen] = useState(false);

// Half sheet — item add
<BottomSheet
  open={open}
  onClose={() => setOpen(false)}
  size="half"
  cta={{ label: 'Hozzáadás', onPress: handleAdd, disabled: !canAdd }}
>
  <Input type="search" placeholder="Termék keresése" autoFocus />
  <ResultList items={results} onPick={addItem} />
</BottomSheet>

// Full sheet — product edit
<BottomSheet
  open={editing}
  onClose={() => setEditing(false)}
  size="full"
  title="Termék szerkesztése"
  cta={{ label: 'Mentés', onPress: save, loading: saving }}
>
  <ProductForm value={product} onChange={setProduct} />
</BottomSheet>
```

## Rules

- Outside taps cascade: keyboard → sheet. First tap dismisses keyboard, second dismisses sheet.
- Only one bottom sheet open at a time — no nesting.
- The OCR flow is **not** a bottom sheet; it's a fullscreen modal stack. See `screens/10-OCRFlow.md`.
