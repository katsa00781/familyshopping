import { Redirect, Stack } from 'expo-router'

import { useAuthStore } from '@/store/authStore'

export default function AuthLayout() {
  const { session, initialized } = useAuthStore()

  if (!initialized) return null
  if (session) return <Redirect href="/(tabs)/lists" />

  return <Stack screenOptions={{ headerShown: false }} />
}
