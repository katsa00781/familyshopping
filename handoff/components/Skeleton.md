# Skeleton

Töltést jelző placeholder. A kontúrját utánozza annak, ami a helyére kerül.

## Sub-components

- `Skeleton` — single shimmering block
- `SkeletonCard` — card-shaped (radius 12 pt)
- `SkeletonRow` — 56 pt list row preset (avatar + 2 lines)
- `SkeletonGrid` — N × tile preset

## Props

```ts
import type { ViewStyle } from 'react-native';

export interface SkeletonProps {
  /** Width in pt or '%' string. */
  width?: number | string;

  /** Height in pt. Default: 14. */
  height?: number;

  /** Border radius. Default: 6. */
  radius?: number;

  /** Optional style override. */
  style?: ViewStyle;
}

export interface SkeletonRowProps {
  /** Show the leading avatar block. Default: true. */
  avatar?: boolean;

  /** Number of stacked text lines. Default: 2. */
  lines?: 1 | 2;
}

export interface SkeletonGridProps {
  /** Tile count. Default: 6. */
  count?: number;

  /** Columns. Default: 2. */
  columns?: number;
}
```

## Visual spec

- **Color (light)** — base `#E2E8F0`, sweep `#F1F5F9`, 35% opacity
- **Color (dark)** — base `#1E293B`, sweep `#334155`
- **Animation** — 1200 ms left → right linear loop
- **Radius** — default 6 pt; SkeletonCard 12 pt

## Rules

- Mirror the geometry of what's loading — same radius, same row height, same column count.
- Never show a skeleton for less than 200 ms — guard with `if (Date.now() - loadStart < 200) skip`.
- Don't use a skeleton when you already have stale-cached data — show that with a "Frissítve: X perce" pip instead.

## Example

```tsx
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonGrid } from '@/components/Skeleton';

// Loading list view
<View className="px-screen-x">
  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
</View>

// Loading product grid
<SkeletonGrid count={6} columns={2} />

// Custom skeleton inside a chart card
<Skeleton width="100%" height={80} radius={4} />

// Card-shaped placeholder
<SkeletonCard className="h-24" />
```
