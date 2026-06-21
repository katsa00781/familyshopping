import { Pressable, Text, View } from 'react-native'
import { MoreHorizontal, Play, ShoppingCart } from 'lucide-react-native'

import { colors } from '@/constants/colors'
import { formatHuf, formatHuDate } from '@/lib/format'
import type { ShoppingList } from '@/types'

interface Props {
  list: ShoppingList
  /** A chip színét index szerint forgatja (teal · korall · lila). */
  index: number
  onPress: () => void
  onBolt: () => void
  onMenu: () => void
}

// A chip tintje a tagszín-paletta első három színéből forog (a mockup colored chipjei).
const CHIP_TINTS = [
  { chip: 'bg-primary/15', color: colors.primary },
  { chip: 'bg-accent/15', color: colors.accent },
  { chip: 'bg-member-purple/15', color: '#A78BFA' },
] as const

// A statikus kártya-stílusokat belső View hordozza (objektum-style + className) —
// NativeWind v4-ben a Pressable függvény-style-jából a statikus property-k eldobódnak.
const cardShadow = {
  shadowColor: colors.foreground,
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
}

const boltShadow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
}

export function ListCardActive({ list, index, onPress, onBolt, onMenu }: Props) {
  const total = list.items.length
  const checked = list.items.filter((i) => i.checked).length
  const progress = total > 0 ? checked / total : 0
  const tint = CHIP_TINTS[index % CHIP_TINTS.length]!

  const meta = [formatHuDate(list.date), list.store_name].filter(Boolean).join(' · ')

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${list.name} megnyitása`}
      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
    >
      <View
        style={[cardShadow, { paddingHorizontal: 17, paddingTop: 17, paddingBottom: 15, borderRadius: 22 }]}
        className="bg-card dark:bg-dark-card dark:border dark:border-dark-border"
      >
        {/* Fejléc: chip + cím/meta + menü */}
        <View className="flex-row items-start" style={{ gap: 13 }}>
          <View
            className={`items-center justify-center ${tint.chip}`}
            style={{ width: 46, height: 46, borderRadius: 15 }}
          >
            <ShoppingCart size={24} color={tint.color} strokeWidth={1.75} />
          </View>
          <View className="flex-1" style={{ paddingTop: 1 }}>
            <Text
              className="text-foreground dark:text-dark-foreground"
              style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.2 }}
              numberOfLines={1}
            >
              {list.name}
            </Text>
            <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          <Pressable
            onPress={onMenu}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Műveletek"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: -4, marginTop: -2 })}
          >
            <MoreHorizontal size={20} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Haladássáv */}
        <View
          className="bg-border dark:bg-dark-border"
          style={{ marginTop: 14, height: 8, borderRadius: 99, overflow: 'hidden' }}
        >
          <View
            className="bg-primary"
            style={{ height: '100%', borderRadius: 99, width: `${Math.round(progress * 100)}%` }}
          />
        </View>

        {/* Lábrész: statisztika + Bolt mód */}
        <View
          style={{ marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ gap: 2 }}>
            <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '700' }}>
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontWeight: '700' }}>
                {checked}
              </Text>
              {` / ${total} tétel`}
            </Text>
            {list.total_amount > 0 ? (
              <Text
                className="text-foreground dark:text-dark-foreground"
                style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2, fontVariant: ['tabular-nums'] }}
              >
                <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>
                  {'Becsült '}
                </Text>
                {`~${formatHuf(list.total_amount)}`}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={onBolt}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Bolt mód: ${list.name}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <View
              style={[
                boltShadow,
                { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 17 },
              ]}
              className="bg-primary"
            >
              <Play size={17} color={colors.primaryForeground} strokeWidth={2} fill={colors.primaryForeground} />
              <Text className="text-primary-foreground" style={{ fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 }}>
                Bolt mód
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}
