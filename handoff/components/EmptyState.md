# EmptyState

Nulla adat felülete. Soha nem zsákutca — minden variánshoz tartozik recovery action.

## Props

```ts
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Lucide icon component, rendered 48 pt muted. */
  icon: ReactNode;

  /** Title — heading-md, foreground. Hungarian, warm and short. */
  title: string;

  /** Up to 2 lines — body-md, muted. Optional. */
  description?: string;

  /** Primary CTA. Always present. */
  cta: { label: string; onPress: () => void };

  /** Optional secondary action below the CTA (ghost variant). */
  secondary?: { label: string; onPress: () => void };
}
```

## Visual spec

- Centered vertical stack
- Icon — 48 pt, `text-muted` (light: `#94A3B8`)
- Title — `heading-md` (22/28 semibold) · 12 pt below icon · max width 280 pt · centered
- Description — `body-md` (15/20) · `text-muted` · 8 pt below title · max width 280 pt · centered · max 2 lines
- CTA — primary lg, 24 pt below description, min width 200 pt
- Secondary — ghost md, 8 pt below CTA

## Example

```tsx
import { EmptyState } from '@/components/EmptyState';
import { ShoppingCart, Package, Image } from 'lucide-react-native';

// No lists yet
<EmptyState
  icon={<ShoppingCart size={48} color="#94A3B8" strokeWidth={1.5} />}
  title="Még nincs listád"
  description="Hozz létre egyet a heti bevásárláshoz."
  cta={{ label: 'Első lista létrehozása', onPress: createList }}
/>

// No products
<EmptyState
  icon={<Package size={48} color="#94A3B8" strokeWidth={1.5} />}
  title="Nincs termék"
  description="Add hozzá az első terméket, hogy elindulhasson az árfigyelés."
  cta={{ label: 'Első termék hozzáadása', onPress: addProduct }}
/>

// Filter empty
<EmptyState
  icon={<Search size={48} color="#94A3B8" strokeWidth={1.5} />}
  title="Nincs ebben a kategóriában"
  description="Próbálj másikat, vagy add hozzá kézzel."
  cta={{ label: 'Tétel hozzáadása', onPress: addItem }}
  secondary={{ label: 'Szűrő törlése', onPress: clearFilter }}
/>
```

## Copy rules

- Hungarian, conversational tone. "Még nincs listád" not "0 lista található".
- Title is never a question.
- Description optional — drop it if the title is self-explanatory.
- CTA verb-led, present tense. "Hozzáadás", "Létrehozás", "Beolvasás".
