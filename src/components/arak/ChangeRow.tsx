import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { formatHuf } from '@/lib/format'
import type { PriceChange } from '@/types'

interface Props {
  change: PriceChange
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
}

export default function ChangeRow({ change }: Props) {
  const router = useRouter()
  const isUp = change.change_pct > 0
  const pctText = `${isUp ? '+' : ''}${Math.round(change.change_pct)}%`
  const ftText = `${isUp ? '+' : ''}${formatHuf(Math.round(change.change_ft))}`

  function handlePress() {
    if (change.product_id) {
      router.push(`/termekek/${change.product_id}`)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="flex-row items-center px-screen-x bg-card dark:bg-dark-card" style={{ height: 56 }}>
        {/* Left: name + store · date */}
        <View className="flex-1 mr-3">
          <Text className="text-body-lg text-foreground dark:text-dark-foreground" numberOfLines={1}>
            {change.product_name}
          </Text>
          <Text className="text-caption text-muted" numberOfLines={1}>
            {change.store_name ?? '—'} · {formatDate(change.date)}
          </Text>
        </View>
        {/* Right: pct chip + Ft delta */}
        <View className="items-end gap-0.5">
          <View className={`px-2 py-0.5 rounded-badge ${isUp ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            <Text className={`text-caption font-semibold ${isUp ? 'text-destructive' : 'text-success'}`}>
              {pctText}
            </Text>
          </View>
          <Text className="text-body-sm text-muted">{ftText}</Text>
        </View>
      </View>
    </Pressable>
  )
}
