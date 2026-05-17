import { Redirect } from 'expo-router'
import { View } from 'react-native'

import { useAuthStore } from '@/store/authStore'

export default function Index() {
  const { session, initialized } = useAuthStore()

  if (!initialized) return <View className="flex-1 bg-gray-400 dark:bg-dark-background" />

  return <Redirect href={session ? '/(tabs)/lists' : '/(auth)/login'} />
}
