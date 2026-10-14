import { supabase } from '@/lib/supabase'
import type { ProductPriceHistory } from '@/types'

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
  const { error } = await supabase
    .from('product_price_history')
    .update({
      unit_price: patch.unit_price,
      price_date: patch.price_date,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deletePriceEntry(id: string): Promise<void> {
  const { error } = await supabase.from('product_price_history').delete().eq('id', id)
  if (error) throw error
}
