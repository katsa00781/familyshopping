import { Redirect, Tabs } from 'expo-router'
import { Calendar, Home, ShoppingCart, UtensilsCrossed, Wallet } from 'lucide-react-native'
import { useColorScheme } from 'react-native'

import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

export default function TabsLayout() {
  const { session, initialized } = useAuthStore()
  const dark = useColorScheme() === 'dark'

  if (!initialized) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: dark ? colors.darkBorder : colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kezdőlap',
          tabBarIcon: ({ color }) => <Home size={26} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="naptar"
        options={{
          title: 'Naptár',
          tabBarIcon: ({ color }) => <Calendar size={26} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="bevasarlas"
        options={{
          title: 'Bevásárlás',
          tabBarIcon: ({ color }) => <ShoppingCart size={26} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="etrend"
        options={{
          title: 'Étrend',
          tabBarIcon: ({ color }) => <UtensilsCrossed size={26} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="kassza"
        options={{
          title: 'Kassza',
          tabBarIcon: ({ color }) => <Wallet size={26} color={color} strokeWidth={1.75} />,
        }}
      />

      {/* Rejtett route-ok – nem külön tab, a Bevásárlás / Kezdőlap fejléc alól érhetők el */}
      <Tabs.Screen name="termekek" options={{ href: null }} />
      <Tabs.Screen name="arak" options={{ href: null }} />
      <Tabs.Screen name="bolt" options={{ href: null }} />
      <Tabs.Screen name="profil" options={{ href: null }} />
      <Tabs.Screen name="lists" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  )
}
