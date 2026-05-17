import { ShoppingBag } from 'lucide-react-native'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function BoltScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <View
        className="px-screen-x"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}
      >
        <Text style={{ fontSize: 34, lineHeight: 41, fontWeight: '700', color: '#F8FAFC', letterSpacing: -0.68 }}>
          Bolt mód
        </Text>
      </View>
      <View className="flex-1 items-center justify-center gap-3">
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 72, height: 72, backgroundColor: '#1E293B' }}
        >
          <ShoppingBag size={32} color="#334155" />
        </View>
        <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '600', color: '#F8FAFC' }}>
          Bolt mód
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 20, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 16 }}>
          Hamarosan elérhető
        </Text>
      </View>
    </SafeAreaView>
  )
}
