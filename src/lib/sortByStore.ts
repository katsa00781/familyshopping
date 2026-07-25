import type { Product, ShoppingItem } from '@/types'

const STORE_PRIORITY = ['lidl', 'aldi']

function normalizeStoreName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  return trimmed ? trimmed : null
}

function storeRank(storeName: string | null): number {
  if (!storeName) return STORE_PRIORITY.length + 1
  const idx = STORE_PRIORITY.indexOf(storeName.toLowerCase())
  return idx === -1 ? STORE_PRIORITY.length : idx
}

/**
 * Tételek rendezése bolt szerint: Lidl elöl, utána Aldi, utána a többi bolt
 * (ábécésorrendben), végül a bolt nélküli (nincs hozzárendelt termék) tételek.
 * A rendezés stabil: azonos boltcsoporton belül az eredeti sorrend marad,
 * így a kipipálás (Bolt mód) nem mozgatja el a tételeket.
 */
export function sortItemsByStore(items: ShoppingItem[], products: Product[]): ShoppingItem[] {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const storeOf = (item: ShoppingItem) =>
    normalizeStoreName(item.product_id ? productMap.get(item.product_id)?.store_name : null)

  return items
    .map((item, index) => ({ item, index, store: storeOf(item) }))
    .sort((a, b) => {
      const rankDiff = storeRank(a.store) - storeRank(b.store)
      if (rankDiff !== 0) return rankDiff
      if (a.store && b.store && a.store !== b.store) {
        return a.store.localeCompare(b.store, 'hu')
      }
      return a.index - b.index
    })
    .map((entry) => entry.item)
}
