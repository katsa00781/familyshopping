import { Redirect, Tabs } from 'expo-router'
import { Calendar, Home, ShoppingCart, UtensilsCrossed, Wallet } from 'lucide-react-native'
import { useColorScheme } from 'react-native'

import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

const HIDDEN_TAB_OPTIONS = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' },
} as const

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

      {/* Rejtett route-ok – nem külön tab, a Bevásárlás / Kezdőlap fejléc alól érhetők el.
          NEM `href: null`: expo-router 58 óta az `hidden` tabot jelöl, és ha egy rejtett tab
          kap fókuszt, a router `replace`-szel visszadob a kezdő tabra (Kezdőlap). Helyette a
          route deklarált/látható marad, csak a tab-gombja nem renderelődik (= a régi viselkedés). */}
      <Tabs.Screen name="termekek" options={HIDDEN_TAB_OPTIONS} />
      <Tabs.Screen name="arak" options={HIDDEN_TAB_OPTIONS} />
      <Tabs.Screen name="bolt" options={HIDDEN_TAB_OPTIONS} />
      <Tabs.Screen name="profil" options={HIDDEN_TAB_OPTIONS} />
      <Tabs.Screen name="lists" options={HIDDEN_TAB_OPTIONS} />
      <Tabs.Screen name="explore" options={HIDDEN_TAB_OPTIONS} />
    </Tabs>
  )
}
