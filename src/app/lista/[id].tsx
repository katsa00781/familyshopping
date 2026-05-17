import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'

import { useListStore } from '@/store/listStore'

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const list = useListStore((s) => s.lists.find((l) => l.id === id))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F5F9' }} edges={['top']}>
      <View className="flex-row items-center px-screen-x border-b border-border" style={{ height: 56 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 12 })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </Pressable>
        <Text className="text-heading-md font-semibold text-foreground flex-1" numberOfLines={1}>
          {list?.name ?? 'Lista'}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-body-md text-muted">
          Lista részletei – hamarosan
        </Text>
      </View>
    </SafeAreaView>
  )
}
