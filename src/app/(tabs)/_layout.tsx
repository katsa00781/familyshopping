import { Redirect, Tabs } from 'expo-router'
import { Package, ShoppingBag, ShoppingCart, TrendingUp, User } from 'lucide-react-native'
import { useColorScheme } from 'react-native'

import { useAuthStore } from '@/store/authStore'

export default function TabsLayout() {
  const { session, initialized } = useAuthStore()
  const dark = useColorScheme() === 'dark'

  if (!initialized) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: dark ? '#334155' : '#E2E8F0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lista',
          tabBarIcon: ({ color }) => <ShoppingCart size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="termekek"
        options={{
          title: 'Termékek',
          tabBarIcon: ({ color }) => <Package size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="arak"
        options={{
          title: 'Árak',
          tabBarIcon: ({ color }) => <TrendingUp size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bolt"
        options={{
          title: 'Bolt',
          tabBarIcon: ({ color }) => <ShoppingBag size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
        }}
      />
      <Tabs.Screen name="lists" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  )
}
