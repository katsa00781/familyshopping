import '../global.css'

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => setSession(session))

    return () => subscription.unsubscribe()
  }, [setSession])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
