# Card

Konténer header + content + opcionális footer komponensekkel. Két változat: alap és swipeable.

## Sub-components

- `Card` — root container
- `CardHeader` — title + optional trailing element
- `CardContent` — body
- `CardFooter` — optional, separated by a hairline rule

## Props

```ts
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  /** Adds a subtle elevation (shadow-sm). Default: true. */
  elevated?: boolean;

  /** Removes the inner padding so the children can bleed to edges. */
  bleed?: boolean;

  /** Wraps the card in a Pressable; runs on tap. Adds scale-down press animation. */
  onPress?: () => void;

  children: ReactNode;
}

export interface SwipeableCardProps extends CardProps {
  /** Reveals on left-swipe — destructive action. */
  onSwipeLeft?: { label: string; onAction: () => void; variant?: 'destructive' | 'edit' };

  /** Reveals on right-swipe — usually edit. */
  onSwipeRight?: { label: string; onAction: () => void; variant?: 'destructive' | 'edit' };

  /** Drag distance (as % of screen width) at which the action snaps full-open. Default: 0.65. */
  threshold?: number;
}
```

## Visual spec

- **Container** — `bg-card` · radius 12 pt · shadow-sm (when elevated)
- **Padding** — 16 pt all sides (skipped when `bleed`)
- **Header → Content** — 12 pt gap
- **Content → Footer** — 16 pt gap + 1 px `border` hairline
- **Press animation** — scale 0.99 over 100 ms ease-out

## Swipe behavior

- Left swipe reveals destructive (red `#EF4444` bg, white label) lane on the right
- Right swipe reveals edit (blue `#2563EB`) lane on the left
- At 65% screen width, the card snaps fully open with `impactMedium` haptic
- Releasing before threshold springs back (damping 18)

## Example

```tsx
import { Card, CardHeader, CardContent, CardFooter, SwipeableCard } from '@/components/Card';
import { Button } from '@/components/Button';

// Simple
<Card>
  <CardHeader title="Heti bevásárlás" trailing={<ProgressRing value={0.65} />} />
  <CardContent>
    <Text>4 / 7 kipipálva · Spar</Text>
  </CardContent>
  <CardFooter>
    <Button label="Folytatás" variant="ghost" size="sm" />
  </CardFooter>
</Card>

// Pressable list-overview card
<Card onPress={() => navigation.push('ListDetail', { id })}>
  <View className="flex-row items-center justify-between">
    <View>
      <Text className="text-body-lg font-semibold">Heti bevásárlás</Text>
      <Text className="text-body-sm text-muted">2026.04.18.</Text>
    </View>
    <ProgressRing value={0.65} />
  </View>
</Card>

// Swipeable list-overview row
<SwipeableCard
  onPress={() => open(id)}
  onSwipeLeft={{ label: 'Törlés', variant: 'destructive', onAction: () => confirmDelete(id) }}
  onSwipeRight={{ label: 'Megosztás', variant: 'edit', onAction: () => share(id) }}
>
  {/* same content as above */}
</SwipeableCard>
```

## Rules

- Hairline rule only between `CardContent` and `CardFooter` — never inside `CardContent`.
- Don't nest cards. A card inside a card means you should be using a `View` with a different background.
