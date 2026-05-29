import { Text, View } from 'react-native'

interface Props {
  title: string
  value: string
  unit: string
}

export default function KpiCard({ title, value, unit }: Props) {
  return (
    <View className="w-40 rounded-card bg-card dark:bg-dark-card p-4">
      <Text className="text-body-sm text-muted mb-1" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-caption text-muted mt-0.5">{unit}</Text>
    </View>
  )
}
