import { normalizeStoreName } from '@/lib/format'
import type { Product, ShoppingItem } from '@/types'

export interface StoreGroup {
  /** Márka szintű bolt-név; `null` = nincs hozzárendelt bolt. */
  store: string | null
  items: ShoppingItem[]
}

function storeOf(item: ShoppingItem, productMap: Map<string, Product>): string | null {
  return normalizeStoreName(item.product_id ? productMap.get(item.product_id)?.store_name : null)
}

/**
 * Bolt-csoportok sorrendje: előbb a felhasználó által beállított sorrend,
 * utána a többi bolt ábécérendben, végül a bolt nélküli tételek.
 */
function compareStores(a: string | null, b: string | null, order: string[]): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  const lowerOrder = order.map((s) => s.toLowerCase())
  const ia = lowerOrder.indexOf(a.toLowerCase())
  const ib = lowerOrder.indexOf(b.toLowerCase())
  const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
  const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
  if (ra !== rb) return ra - rb
  return a.localeCompare(b, 'hu')
}

/**
 * Tételek csoportosítása bolt szerint (a bolt a tételhez kötött termékből jön).
 * Csoporton belül az eredeti sorrend marad, így a kipipálás nem mozgatja el a
 * tételeket (Bolt mód).
 */
export function groupItemsByStore(
  items: ShoppingItem[],
  products: Product[],
  order: string[],
): StoreGroup[] {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const groups = new Map<string | null, ShoppingItem[]>()
  for (const item of items) {
    const store = storeOf(item, productMap)
    const bucket = groups.get(store)
    if (bucket) bucket.push(item)
    else groups.set(store, [item])
  }
  return [...groups.entries()]
    .map(([store, groupItems]) => ({ store, items: groupItems }))
    .sort((a, b) => compareStores(a.store, b.store, order))
}

/** Lapos, bolt szerint rendezett tétellista (lásd `groupItemsByStore`). */
export function sortItemsByStore(
  items: ShoppingItem[],
  products: Product[],
  order: string[],
): ShoppingItem[] {
  return groupItemsByStore(items, products, order).flatMap((g) => g.items)
}

/**
 * A sorrend-szerkesztőben megjelenő boltok: a katalógusban szereplő összes bolt,
 * a mentett sorrend szerint, az újak ábécérendben a végén.
 */
export function orderedStoreNames(products: Product[], order: string[]): string[] {
  const known = new Map<string, string>()
  for (const p of products) {
    const name = normalizeStoreName(p.store_name)
    if (name && !known.has(name.toLowerCase())) known.set(name.toLowerCase(), name)
  }
  const result: string[] = []
  for (const saved of order) {
    const key = saved.toLowerCase()
    // Betöltetlen katalógusnál a mentett sorrendet mutatjuk változatlanul.
    if (known.size === 0 || known.has(key)) {
      result.push(known.get(key) ?? saved)
      known.delete(key)
    }
  }
  const rest = [...known.values()].sort((a, b) => a.localeCompare(b, 'hu'))
  return [...result, ...rest]
}
