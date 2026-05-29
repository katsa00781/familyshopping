# Toast

Egyszeri, ideiglenes visszajelzés. Egyszerre csak egy.

## Variants

| `variant` | Use | Left border |
|---|---|---|
| `success` | Confirmation | `#22C55E` |
| `error`   | Failure | `#EF4444` |
| `info`    | Neutral notice | `#2563EB` |
| `warning` | Caution | `#F59E0B` |

## API

Toast is fired imperatively, not rendered as a child. A single `<ToastHost />` lives at the root of the app.

```ts
import { toast } from '@/components/Toast';

toast.success('Hozzáadva ✓');
toast.error('Nem sikerült menteni. Próbáld újra.');
toast.info('Frissítve 2 perce');
toast.warning('Engedélyezd a kamera-hozzáférést a Beállításokban.');

// With action
toast.error('Törölted a tételt.', {
  action: { label: 'Visszavonás', onPress: undo },
  duration: 4000,
});

// Programmatic
const id = toast.show({ variant: 'info', message: 'Szinkronizálás…' });
toast.dismiss(id);
```

### Toast options

```ts
export interface ToastOptions {
  variant?: 'success' | 'error' | 'info' | 'warning';
  message: string;

  /** Optional inline action (e.g. Undo). */
  action?: { label: string; onPress: () => void };

  /** Hold duration in ms. Default 2800. */
  duration?: number;

  /** Force-hide the X close button. Default: visible. */
  hideClose?: boolean;
}
```

## Visual spec

- **Container** — full width minus 16 pt margins · 16 pt from bottom safe area · radius 12 pt · shadow-md
- **Background** — light `#FFFFFF` / dark `#1E293B`
- **Border** — 1 px `border` · 4 pt **left** border in variant color
- **Inner padding** — 12 V / 16 H
- **Text** — `body-md` (15/20) · foreground
- **Action label** — `body-md` semibold · variant color · 12 pt right margin
- **X close** — 24 pt Lucide `X`, muted, always present unless `hideClose`

## Animation

| Phase | Animation | Duration |
|---|---|---|
| Enter | slide up from bottom safe-area | 200 ms spring · damping 18 |
| Hold | — | 2800 ms default |
| Exit | slide down | 180 ms ease-in |
| Replace (new toast while old shown) | cross-fade | 120 ms |

## Rules

- **Single toast at a time.** A new toast replaces the active one via cross-fade — never stacks.
- Errors get 4000 ms, others 2800 ms.
- Don't include actions on success toasts unless it's an undo for a destructive op.
- Use info toast sparingly — most "Frissítve" status belongs in a pull-to-refresh pip, not a toast.
