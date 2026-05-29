import { Pressable, Text, View } from 'react-native'
import { Svg, Circle } from 'react-native-svg'

import { colors } from '@/constants/colors'
import type { ShoppingList } from '@/types'

interface Props {
  list: ShoppingList
  onPress: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ProgressRing({ progress }: { progress: number }) {
  const size = 32
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)
  const pct = Math.round(progress * 100)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={pct === 100 ? colors.success : colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 9,
          lineHeight: 11,
          fontWeight: '600',
          color: pct === 100 ? colors.success : colors.primary,
          letterSpacing: 0,
        }}
      >
        {pct}%
      </Text>
    </View>
  )
}

export function ListCard({ list, onPress }: Props) {
  const total = list.items.length
  const checked = list.items.filter((i) => i.checked).length
  const progress = total > 0 ? checked / total : 0

  const meta = [
    `${checked}/${total} kipipálva`,
    list.store_name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card mx-screen-x mb-3"
    >
      <View className="flex-row items-center p-4 gap-3">
        {/* Left: name + date */}
        <View className="flex-1 gap-1">
          <Text
            className="text-body-lg font-semibold text-foreground dark:text-dark-foreground"
            numberOfLines={1}
          >
            {list.name}
          </Text>
          <Text className="text-body-sm text-muted">
            {formatDate(list.date)}
          </Text>
          <View className="h-px bg-border dark:bg-dark-border my-1" />
          <Text className="text-body-sm text-muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>

        {/* Right: progress ring */}
        <ProgressRing progress={progress} />
      </View>
    </Pressable>
  )
}
