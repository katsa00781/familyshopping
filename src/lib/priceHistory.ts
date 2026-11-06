import { supabase } from '@/lib/supabase'
import type { ProductPriceHistory } from '@/types'

/**
 * Rendes (nem akciós) ár-e. Az akciós ár nem valódi árváltozás, ezért kimarad az
 * árváltozás-, infláció- és árstatisztika-számításból (a familybudget web
 * `isRegularPrice()` szabályával azonosan). Hiányzó `akcios` → rendes ár.
 */
export function isRegularPrice(record: { akcios?: boolean | null }): boolean {
  return !record.akcios
}

/**
 * Termék-statisztika (min/max/trend) alapja: a rendes árak; ha a terméknek csak
 * akciós ára van, akkor azok (familybudget `getPriceStatistics` szabály).
 */
export function pricesForStatistics<T extends { akcios?: boolean | null }>(entries: T[]): T[] {
  const regular = entries.filter(isRegularPrice)
  return regular.length > 0 ? regular : entries
}

function normalize(r: ProductPriceHistory): ProductPriceHistory {
  return {
    ...r,
    unit_price: Number(r.unit_price),
    quantity: Number(r.quantity),
    total_price: Number(r.total_price),
  }
}

/** Egy termék teljes árnaplója (legrégebbi → legújabb). */
export async function fetchProductPriceHistory(productId: string): Promise<ProductPriceHistory[]> {
  const { data, error } = await supabase
    .from('product_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('price_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ProductPriceHistory[]).map(normalize)
}

export async function updatePriceEntry(
  id: string,
  patch: { unit_price: number; price_date: string },
): Promise<void> {
  // Az összár az egységár × mennyiség alapján újraszámolódik (familybudget szabály),
  // különben a javított ár mellett elavult total_price torzítaná a költés-súlyozást.
  const { data: row, error: readError } = await supabase
    .from('product_price_history')
    .select('quantity')
    .eq('id', id)
    .single()
  if (readError) throw readError
  const quantity = Number((row as { quantity: number | string | null }).quantity) || 1

  const { error } = await supabase
    .from('product_price_history')
    .update({
      unit_price: patch.unit_price,
      total_price: patch.unit_price * quantity,
      price_date: patch.price_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deletePriceEntry(id: string): Promise<void> {
  const { error } = await supabase.from('product_price_history').delete().eq('id', id)
  if (error) throw error
}
