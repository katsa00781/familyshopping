import { Text, View } from 'react-native'
import { TrendingDown, TrendingUp } from 'lucide-react-native'

import type { ItemCategory } from '@/types'

// ─── Category badge ───────────────────────────────────────────────────────────

const CAT_BG: Record<ItemCategory, string> = {
  'Zöldség':   'bg-cat-produce',
  'Tejtermék': 'bg-cat-dairy',
  'Hús':       'bg-cat-meat',
  'Pékáru':    'bg-cat-bakery',
  'Egyéb':     'bg-cat-other',
}

interface CategoryBadgeProps {
  category: ItemCategory
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <View className={`self-start ${CAT_BG[category]} rounded-fab px-[10px] py-1.5`}>
      <Text className="text-[11px] leading-[14px] font-semibold text-foreground tracking-[0.2px]">
        {category}
      </Text>
    </View>
  )
}

// ─── Price badge ──────────────────────────────────────────────────────────────

interface PriceBadgeProps {
  direction: 'up' | 'down'
  pct: number
  ft: number
}

export function PriceBadge({ direction, pct, ft }: PriceBadgeProps) {
  const up = direction === 'up'
  const iconColor = up ? '#B91C1C' : '#15803D' // red-700 / green-700 — nincs token
  const sign = up ? '+' : '-'

  return (
    <View
      className={`self-start flex-row items-center gap-1 rounded-fab px-[10px] py-1 ${up ? 'bg-red-100' : 'bg-green-100'}`}
    >
      {up
        ? <TrendingUp size={11} strokeWidth={2.4} color={iconColor} />
        : <TrendingDown size={11} strokeWidth={2.4} color={iconColor} />}
      <Text className={`text-[12px] leading-4 font-semibold ${up ? 'text-red-700' : 'text-green-700'}`}>
        {sign}{Math.abs(pct).toFixed(1)}% · {sign}{Math.abs(ft)} Ft
      </Text>
    </View>
  )
}
