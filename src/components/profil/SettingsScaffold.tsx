import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { router } from 'expo-router'

import { colors } from '@/constants/colors'

interface SettingsScaffoldProps {
  title: string
  backLabel?: string
  children: ReactNode
}

/**
 * Közös scaffold a Profil sub-screenekhez: SafeAreaView + nagy-című fejléc
 * vissza-gombbal + görgethető tartalom. A Profil képernyő fejléc-mintáját
 * követi (token színek, semmi hardcode hex).
 */
export function SettingsScaffold({ title, backLabel = 'Profil', children }: SettingsScaffoldProps) {
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      <View
        className="px-screen-x border-b border-border dark:border-dark-border bg-background dark:bg-dark-background"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: -6,
            marginBottom: 2,
            alignSelf: 'flex-start',
          })}
          accessibilityLabel="Vissza"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.muted} strokeWidth={1.75} />
          <Text className="text-body-md text-muted">{backLabel}</Text>
        </Pressable>
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          {title}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="px-screen-x pt-6 pb-8 gap-6">{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
