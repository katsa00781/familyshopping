import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogOut, User } from 'lucide-react-native'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export default function ProfilScreen() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F5F9' }} edges={['top']}>
      {/* Header */}
      <View
        className="px-screen-x border-b border-border dark:border-dark-border bg-background dark:bg-dark-background"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Profil
        </Text>
      </View>

      <View className="flex-1 px-screen-x pt-6 gap-6">
        {/* Felhasználói adatok */}
        <View className="rounded-card bg-card dark:bg-dark-card border border-border dark:border-dark-border overflow-hidden">
          <View className="flex-row items-center gap-4 p-4">
            <View
              className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
              style={{ width: 48, height: 48 }}
            >
              <User size={24} color="#94A3B8" />
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
                {(user?.user_metadata?.['full_name'] as string | undefined) ?? 'Felhasználó'}
              </Text>
              <Text className="text-body-sm text-muted">
                {user?.email ?? ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Kijelentkezés gomb */}
        <View className="rounded-card bg-card dark:bg-dark-card border border-border dark:border-dark-border overflow-hidden">
          <Pressable
            onPress={handleSignOut}
            disabled={loading}
            style={({ pressed }) => ({
              height: 56,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed || loading ? 0.6 : 1,
            })}
          >
            <LogOut size={20} color="#EF4444" />
            <Text className="text-body-lg text-destructive">
              {loading ? 'Kijelentkezés...' : 'Kijelentkezés'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}
