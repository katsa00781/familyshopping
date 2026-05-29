import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Search, ShoppingCart, WifiOff } from 'lucide-react-native'
import { colors } from '@/constants/colors'

export type EmptyStatePreset = 'emptyList' | 'offline' | 'noResults'

interface EmptyStateProps {
  preset: EmptyStatePreset
  ctaLabel?: string
  onCtaPress?: () => void
}

const PRESETS: Record<
  EmptyStatePreset,
  { Icon: typeof ShoppingCart; title: string; body: string }
> = {
  emptyList: {
    Icon: ShoppingCart,
    title: 'Nincs lista',
    body: 'Hozz létre egy bevásárlólistát\na + gombbal!',
  },
  offline: {
    Icon: WifiOff,
    title: 'Nincs kapcsolat',
    body: 'Ellenőrizd az internetkapcsolatod,\nés próbáld újra.',
  },
  noResults: {
    Icon: Search,
    title: 'Nincs találat',
    body: 'Próbálj más keresési kifejezést.',
  },
}

export default function EmptyState({ preset, ctaLabel, onCtaPress }: EmptyStateProps) {
  const { Icon, title, body } = PRESETS[preset]

  return (
    <View className="flex-1 items-center justify-center px-4 py-8">
      <View className="w-16 h-16 rounded-full items-center justify-center bg-[#F1F5F9] dark:bg-dark-card mb-4">
        <Icon size={32} color={colors.muted} strokeWidth={1.75} />
      </View>

      <Text className="text-heading-md text-foreground dark:text-dark-foreground text-center mb-2">
        {title}
      </Text>

      <Text
        className="text-body-md text-muted text-center mb-6"
        numberOfLines={2}
      >
        {body}
      </Text>

      {ctaLabel && onCtaPress && (
        <Pressable
          className="h-cta px-6 rounded-button bg-primary items-center justify-center"
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          onPress={onCtaPress}
        >
          <Text className="text-[17px] leading-[22px] font-semibold text-white">
            {ctaLabel}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
})
