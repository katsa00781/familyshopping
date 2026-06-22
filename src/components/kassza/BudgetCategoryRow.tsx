import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'

import { formatHuf } from '@/lib/format'
import { colors } from '@/constants/colors'

interface BudgetCategoryRowProps {
  name: string
  /** Betervezett keret. */
  amount: number
  /** Valós (Wallet) költés a hónapban. */
  spent: number
  /** Van-e élő Wallet költés-adat – ettől függ a sor megjelenése. */
  hasSpending: boolean
  /** A kategória aránya az összes allokációból (0–1) – csak terv-nézetben a sáv. */
  share: number
  /** Koppintás a részletező megnyitásához (csak valós adat esetén értelmezett). */
  onPress?: () => void
}

/**
 * Kassza kategória-sor.
 *  - Valós adattal: „elköltve / betervezett" + a felhasználás sávja (túllépés → warning),
 *    koppintásra a tételes részletező nyílik (chevron affordancia).
 *  - Csak terv-adattal: betervezett összeg + arány-sáv (token primary).
 */
export function BudgetCategoryRow({ name, amount, spent, hasSpending, share, onPress }: BudgetCategoryRowProps) {
  if (!hasSpending) {
    const pct = Math.max(0, Math.min(1, share))
    return (
      <View className="py-2.5">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 text-body-md text-foreground dark:text-dark-foreground"
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className="ml-3 text-body-md font-semibold text-foreground dark:text-dark-foreground">
            {formatHuf(amount)}
          </Text>
        </View>
        <View className="mt-2 h-1.5 rounded-full bg-border dark:bg-dark-border overflow-hidden">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </View>
      </View>
    )
  }

  const usage = amount > 0 ? spent / amount : spent > 0 ? 1 : 0
  const over = spent > amount && amount > 0

  const content = (
    <View className="py-2.5">
      <View className="flex-row items-center justify-between">
        <Text
          className="flex-1 text-body-md text-foreground dark:text-dark-foreground"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="ml-3 text-body-md font-semibold text-foreground dark:text-dark-foreground">
          {formatHuf(spent)}
          <Text className="text-body-sm font-normal text-muted">{` / ${formatHuf(amount)}`}</Text>
        </Text>
        {onPress ? (
          <ChevronRight size={18} color={colors.muted} strokeWidth={1.75} style={{ marginLeft: 4 }} />
        ) : null}
      </View>
      <View className="mt-2 h-1.5 rounded-full bg-border dark:bg-dark-border overflow-hidden">
        <View
          className={`h-full rounded-full ${over ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${Math.round(Math.max(0, Math.min(1, usage)) * 100)}%` }}
        />
      </View>
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} költésének részletei`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  )
}
