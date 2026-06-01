import '../global.css'

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { ToastContainer } from '@/components/ui/Toast'
import { AppThemeProvider } from '@/lib/theme'
import { supabase, getSessionSafe } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const initialized = useAuthStore((s) => s.initialized)
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    void getSessionSafe().then((session) => setSession(session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => setSession(session))

    return () => subscription.unsubscribe()
  }, [setSession])

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppThemeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={styles.root}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="lista/[id]" />
              <Stack.Screen name="vasarlasok/index" />
              <Stack.Screen name="vasarlasok/[id]" />
              <Stack.Screen name="termekek/[id]" />
              <Stack.Screen name="termekek/uj" />
              <Stack.Screen
                name="ocr"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="family-settings" />
            </Stack>
            <ToastContainer />
          </View>
        </ThemeProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
