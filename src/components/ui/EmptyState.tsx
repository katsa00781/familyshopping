import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  body: string
  ctaLabel?: string
  onCtaPress?: () => void
}

export default function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-4 py-8">
      {/* Icon circle */}
      <View className="w-16 h-16 rounded-full items-center justify-center bg-[#F1F5F9] dark:bg-dark-card mb-4">
        {icon}
      </View>

      {/* Title */}
      <Text className="text-[22px] leading-7 font-semibold text-foreground dark:text-dark-foreground text-center tracking-[-0.3px] mb-2">
        {title}
      </Text>

      {/* Body */}
      <Text className="text-body-md text-muted text-center max-w-[240px] mb-6">
        {body}
      </Text>

      {/* CTA */}
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
