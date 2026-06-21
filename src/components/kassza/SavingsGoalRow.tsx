import { Text, View } from 'react-native'

import { colors } from '@/constants/colors'
import { formatHuf, formatHuDate } from '@/lib/format'
import type { SavingsGoal } from '@/types'

interface SavingsGoalRowProps {
  goal: SavingsGoal
}

/**
 * Megtakarítási cél sor: név + cél dátum, összeg (gyűjtött / cél), arány-sáv.
 * A sáv színe a cél saját színe (adatvezérelt hex), fallback primary.
 */
export function SavingsGoalRow({ goal }: SavingsGoalRowProps) {
  const target = goal.target_amount > 0 ? goal.target_amount : 0
  const progress = target > 0 ? Math.max(0, Math.min(1, goal.current_amount / target)) : 0
  const barColor = goal.color ?? colors.primary

  return (
    <View className="py-3">
      <View className="flex-row items-center justify-between">
        <Text
          className="flex-1 text-body-md font-semibold text-foreground dark:text-dark-foreground"
          numberOfLines={1}
        >
          {goal.name}
        </Text>
        <Text className="ml-3 text-body-sm text-muted">{Math.round(progress * 100)}%</Text>
      </View>

      <Text className="mt-0.5 text-body-sm text-muted">
        {formatHuf(goal.current_amount)} / {formatHuf(target)}
        {goal.target_date ? ` · ${formatHuDate(goal.target_date)}` : ''}
      </Text>

      <View className="mt-2 h-1.5 rounded-full bg-border dark:bg-dark-border overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: barColor }}
        />
      </View>
    </View>
  )
}
