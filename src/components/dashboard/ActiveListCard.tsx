import { Pressable, Text, View } from 'react-native'
import { Play, ShoppingCart } from 'lucide-react-native'

import { DashboardCard } from './DashboardCard'
import { colors } from '@/constants/colors'
import type { ShoppingList } from '@/types'

interface ActiveListCardProps {
  list: ShoppingList | null
  onOpen: () => void
  onOpenBolt: () => void
  onCreate: () => void
}

const boltShadow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.32,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
}

/**
 * Aktív bevásárlólista kártya: a lista neve + haladás, alul a tételszám és
 * egy gyors „Bolt mód" gomb. Üres állapotban CTA új lista létrehozásához.
 */
export function ActiveListCard({ list, onOpen, onOpenBolt, onCreate }: ActiveListCardProps) {
  if (!list) {
    return (
      <DashboardCard
        icon={ShoppingCart}
        tint="primary"
        title="Bevásárlás"
        subtitle="Nincs aktív lista"
        accessibilityLabel="Új bevásárlólista létrehozása"
        onPress={onCreate}
      >
        <Text className="text-muted" style={{ marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Koppints egy új lista létrehozásához.
        </Text>
      </DashboardCard>
    )
  }

  const total = list.items.length
  const checked = list.items.filter((i) => i.checked).length
  const progress = total > 0 ? checked / total : 0

  return (
    <DashboardCard
      icon={ShoppingCart}
      tint="primary"
      title={list.name}
      subtitle="Aktív lista"
      accessibilityLabel={`${list.name} megnyitása`}
      onPress={onOpen}
    >
      <View
        className="bg-border dark:bg-dark-border"
        style={{ marginTop: 13, height: 8, borderRadius: 99, overflow: 'hidden' }}
      >
        <View
          className="bg-primary"
          style={{ height: '100%', borderRadius: 99, width: `${Math.round(progress * 100)}%` }}
        />
      </View>

      <View
        style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700' }}>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontWeight: '700' }}>
            {checked}
          </Text>
          {` / ${total} tétel kész`}
        </Text>

        <Pressable
          onPress={onOpenBolt}
          accessibilityLabel="Bolt mód megnyitása"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View
            style={[
              boltShadow,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: 15,
                paddingVertical: 12,
                paddingHorizontal: 20,
              },
            ]}
            className="bg-primary"
          >
            <Play size={18} color={colors.primaryForeground} strokeWidth={2} fill={colors.primaryForeground} />
            <Text className="text-primary-foreground" style={{ fontSize: 15, fontWeight: '800' }}>
              Bolt mód
            </Text>
          </View>
        </Pressable>
      </View>
    </DashboardCard>
  )
}
