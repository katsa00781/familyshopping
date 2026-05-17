import { Package } from 'lucide-react-native'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function TermekekScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F5F9' }} edges={['top']}>
      <View
        className="px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Termékek
        </Text>
      </View>
      <View className="flex-1 items-center justify-center gap-3">
        <View
          className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
          style={{ width: 72, height: 72 }}
        >
          <Package size={32} color="#94A3B8" />
        </View>
        <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
          Termékkönyvtár
        </Text>
        <Text className="text-body-md text-muted text-center px-screen-x">
          Hamarosan elérhető
        </Text>
      </View>
    </SafeAreaView>
  )
}
