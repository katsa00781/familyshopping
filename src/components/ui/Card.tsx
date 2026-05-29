import { type ReactNode, useRef } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import { haptics } from '@/lib/haptics'

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface CardProps extends ViewProps {
  elevated?: boolean
  bleed?: boolean
  onPress?: () => void
  children: ReactNode
}

export function Card({
  elevated = true,
  bleed = false,
  onPress,
  children,
  style,
  ...rest
}: CardProps) {
  const inner = <View className={bleed ? '' : 'p-4'}>{children}</View>

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="bg-card dark:bg-dark-card rounded-card"
        style={({ pressed }) => [
          elevated ? styles.shadow : undefined,
          pressed ? styles.pressed : undefined,
          style,
        ]}
        {...rest}
      >
        {inner}
      </Pressable>
    )
  }

  return (
    <View
      className="bg-card dark:bg-dark-card rounded-card"
      style={[elevated ? styles.shadow : undefined, style]}
      {...rest}
    >
      {inner}
    </View>
  )
}

// ─── CardHeader ───────────────────────────────────────────────────────────────

export interface CardHeaderProps {
  title: string
  trailing?: ReactNode
}

export function CardHeader({ title, trailing }: CardHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-body-lg font-semibold text-foreground dark:text-dark-foreground">
        {title}
      </Text>
      {trailing}
    </View>
  )
}

// ─── CardContent ──────────────────────────────────────────────────────────────

export interface CardContentProps {
  children: ReactNode
}

export function CardContent({ children }: CardContentProps) {
  return <View className="mt-3">{children}</View>
}

// ─── CardFooter ───────────────────────────────────────────────────────────────

export interface CardFooterProps {
  children: ReactNode
}

export function CardFooter({ children }: CardFooterProps) {
  return (
    <View>
      <View className="mt-4 mb-4 h-px bg-border dark:bg-dark-border" />
      {children}
    </View>
  )
}

// ─── SwipeableCard ────────────────────────────────────────────────────────────

export interface SwipeableCardAction {
  label: string
  onAction: () => void
  variant?: 'destructive' | 'edit'
}

export interface SwipeableCardProps extends CardProps {
  onSwipeLeft?: SwipeableCardAction
  onSwipeRight?: SwipeableCardAction
  threshold?: number
}

export function SwipeableCard({
  onSwipeLeft,
  onSwipeRight,
  threshold = 0.65,
  children,
  ...cardProps
}: SwipeableCardProps) {
  const ref = useRef<SwipeableMethods | null>(null)
  const screenWidth = Dimensions.get('window').width

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={screenWidth * threshold}
      leftThreshold={screenWidth * threshold}
      onSwipeableOpen={() => haptics.medium()}
      renderRightActions={
        onSwipeLeft
          ? () => (
              <Pressable
                onPress={() => {
                  ref.current?.close()
                  onSwipeLeft.onAction()
                }}
                style={[
                  styles.action,
                  {
                    backgroundColor:
                      onSwipeLeft.variant === 'destructive' ? '#EF4444' : '#2563EB',
                  },
                ]}
                accessibilityLabel={onSwipeLeft.label}
              >
                <Text style={styles.actionText}>{onSwipeLeft.label}</Text>
              </Pressable>
            )
          : undefined
      }
      renderLeftActions={
        onSwipeRight
          ? () => (
              <Pressable
                onPress={() => {
                  ref.current?.close()
                  onSwipeRight.onAction()
                }}
                style={[
                  styles.action,
                  {
                    backgroundColor:
                      onSwipeRight.variant === 'destructive' ? '#EF4444' : '#2563EB',
                  },
                ]}
                accessibilityLabel={onSwipeRight.label}
              >
                <Text style={styles.actionText}>{onSwipeRight.label}</Text>
              </Pressable>
            )
          : undefined
      }
    >
      <Card {...cardProps}>{children}</Card>
    </ReanimatedSwipeable>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
  },
})
