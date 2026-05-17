import { Redirect } from 'expo-router'

import AppTabs from '@/components/app-tabs'
import { useAuthStore } from '@/store/authStore'

export default function TabsLayout() {
  const { session, initialized } = useAuthStore()

  if (!initialized) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return <AppTabs />
}
