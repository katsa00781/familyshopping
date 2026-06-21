import { Text, View } from 'react-native'

import { formatHuf } from '@/lib/format'

interface BudgetCategoryRowProps {
  name: string
  amount: number
  /** A kategória aránya az összes allokációból (0–1) – a sáv szélessége. */
  share: number
}

/**
 * Kassza kategória-sor: név + összeg, alatta arány-sáv (token primary).
 */
export function BudgetCategoryRow({ name, amount, share }: BudgetCategoryRowProps) {
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
