import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
          Fedezd fel
        </Text>
        <Text className="text-body-md text-muted text-center">
          Termékek és árak hamarosan…
        </Text>
      </View>
    </SafeAreaView>
  )
}
