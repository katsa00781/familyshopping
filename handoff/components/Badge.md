# Badge

Kis kontextuális címke. Két család: kategória és árváltozás.

## Variants

| Family | Variants |
|---|---|
| **Category** | `produce` · `dairy` · `meat` · `bakery` · `other` |
| **Price change** | `up` · `down` · `neutral` |
| **Source** | `ocr` · `list` · `manual` · `import` |
| **Role** | `admin` · `member` · `viewer` |

## Props

```ts
export interface BadgeProps {
  /** Text content. */
  label: string;

  /** Visual treatment. */
  variant:
    | 'produce' | 'dairy' | 'meat' | 'bakery' | 'other'    // Category
    | 'up' | 'down' | 'neutral'                            // Price change
    | 'ocr' | 'list' | 'manual' | 'import'                 // Source
    | 'admin' | 'member' | 'viewer';                       // Role

  /** Optional Lucide icon, rendered left of the label. Default included for price-change variants (arrows). */
  icon?: ReactNode;

  /** Size. Default: 'md'. */
  size?: 'sm' | 'md';
}
```

## Visual spec

- **Container** — radius 6 pt · padding 4V / 8H (sm) or 6V / 10H (md)
- **Text** — `caption` (11 pt) sm · `body-sm` (13 pt) md · `fontWeight: 600`
- **Icon** — 12 pt (sm) or 14 pt (md), 4 pt right-margin

### Category palette

| Variant | bg | fg |
|---|---|---|
| `produce` | `#86EFAC` | `#0F172A` |
| `dairy`   | `#93C5FD` | `#0F172A` |
| `meat`    | `#FCA5A5` | `#0F172A` |
| `bakery`  | `#FCD34D` | `#0F172A` |
| `other`   | `#CBD5E1` | `#0F172A` |

### Price change

| Variant | bg | fg | icon |
|---|---|---|---|
| `up`      | `#FEE2E2` | `#DC2626` | `ArrowUp` |
| `down`    | `#DCFCE7` | `#16A34A` | `ArrowDown` |
| `neutral` | `#E2E8F0` | `#475569` | `Minus` |

### Source (used in ProductDetail price history rows)

| Variant | bg | fg |
|---|---|---|
| `ocr`    | `#F3E8FF` | `#6B21A8` |
| `list`   | `#DBEAFE` | `#1E40AF` |
| `manual` | `#E2E8F0` | `#334155` |
| `import` | `#FFEDD5` | `#9A3412` |

### Role

| Variant | bg | fg |
|---|---|---|
| `admin`  | `#DBEAFE` | `#1E40AF` |
| `member` | `#DCFCE7` | `#166534` |
| `viewer` | `#FEF3C7` | `#92400E` |

## Example

```tsx
import { Badge } from '@/components/Badge';

<Badge label="Tejtermék" variant="dairy" />
<Badge label="-12%" variant="down" />          // auto ArrowDown icon
<Badge label="+40 Ft" variant="up" />
<Badge label="OCR" variant="ocr" size="sm" />
<Badge label="Admin" variant="admin" />
```

## Rules

- Up = red (`#DC2626`), down = green (`#16A34A`). Magyar konvenció megegyezik a nyugati piacokkal.
- Use category badges as the only color in monochrome lists — they carry the category identity across all screens.
- Don't stack >2 badges in a row; if you need more, switch to a list of properties.
