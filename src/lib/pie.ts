import { chartNeutral, chartSeries } from '@/constants/colors'

export interface PieInput {
  name: string
  amount: number
}

export interface PieSlice {
  name: string
  amount: number
  /** Arány az összesből (0–1). */
  share: number
  color: string
  /** Összevont „Többi” szelet (a kisebb tételek összege). */
  isRest: boolean
}

export const PIE_REST_LABEL = 'Többi'

/**
 * Tortadiagram-szeletek (a familybudget web `MegoszlasTorta` szabályával azonosan):
 * csak a pozitív tételek; a legnagyobb `chartSeries.length` darab kap saját színt, az
 * eredeti sorrendjükben (hogy egy összeg változásakor ne ugráljanak a színek); a
 * többi egy semleges „Többi” szeletbe olvad a végén.
 */
export function buildPieSlices(items: PieInput[]): PieSlice[] {
  const positive = items.filter((i) => i.amount > 0)
  const kept = new Set(
    [...positive]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, chartSeries.length)
      .map((i) => i.name),
  )
  const total = positive.reduce((s, i) => s + i.amount, 0)
  if (total <= 0) return []

  const slices: PieSlice[] = []
  let paletteIndex = 0
  for (const item of positive) {
    if (!kept.has(item.name)) continue
    slices.push({
      name: item.name,
      amount: item.amount,
      share: item.amount / total,
      color: chartSeries[paletteIndex++ % chartSeries.length]!,
      isRest: false,
    })
  }

  const rest = positive.filter((i) => !kept.has(i.name)).reduce((s, i) => s + i.amount, 0)
  if (rest > 0) {
    slices.push({ name: PIE_REST_LABEL, amount: rest, share: rest / total, color: chartNeutral, isRest: true })
  }
  return slices
}

/** Százalék magyar formában, egy tizedesig (pl. „12,5%”). */
export function formatShare(share: number): string {
  return `${(share * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`
}
