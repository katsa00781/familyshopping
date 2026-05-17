import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { CheckCircle, Info, X, XCircle } from 'lucide-react-native'
import { useToastStore, type ToastItem, type ToastVariant } from '@/store/toastStore'

const ACCENT: Record<ToastVariant, string> = {
  success: '#22C55E',
  error: '#EF4444',
  info: '#2563EB',
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const color = ACCENT[variant]
  if (variant === 'success') return <CheckCircle size={14} strokeWidth={2.5} color={color} />
  if (variant === 'error') return <XCircle size={14} strokeWidth={2.5} color={color} />
  return <Info size={14} strokeWidth={2.5} color={color} />
}

function ToastVisual({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const dark = useColorScheme() === 'dark'
  const accent = ACCENT[item.variant]

  return (
    <View
      className="flex-row items-center gap-3 rounded-card bg-card dark:bg-dark-card"
      style={[
        styles.shadow,
        {
          height: 56,
          paddingLeft: 12,
          paddingRight: 14,
          borderWidth: 1,
          borderColor: dark ? '#334155' : '#E2E8F0',
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
      ]}
    >
      <View
        className="w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <ToastIcon variant={item.variant} />
      </View>

      <Text className="flex-1 text-[15px] leading-5 font-medium text-foreground dark:text-dark-foreground">
        {item.message}
      </Text>

      <Pressable
        className="w-6 h-6 items-center justify-center"
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        onPress={onDismiss}
        hitSlop={4}
      >
        <X size={16} strokeWidth={2} color="#94A3B8" />
      </Pressable>
    </View>
  )
}

export function ToastContainer() {
  const current = useToastStore((s) => s.current)
  const dismiss = useToastStore((s) => s.dismiss)
  const [displayed, setDisplayed] = useState<ToastItem | null>(null)
  const displayedRef = useRef<ToastItem | null>(null)
  displayedRef.current = displayed

  const opacity = useSharedValue(0)
  const translateY = useSharedValue(80)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => dismissRef.current(), 2800)
  }, [clearTimer])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  useEffect(() => {
    const d = displayedRef.current

    if (current === null) {
      if (d !== null) {
        clearTimer()
        cancelAnimation(opacity)
        cancelAnimation(translateY)
        translateY.value = withTiming(80, { duration: 200 })
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(setDisplayed)(null)
        })
      }
    } else if (d === null) {
      setDisplayed(current)
      opacity.value = 0
      translateY.value = 80
      translateY.value = withSpring(0, { damping: 20, stiffness: 250, mass: 0.5 })
      opacity.value = withTiming(1, { duration: 240 }, (finished) => {
        if (finished) runOnJS(scheduleHide)()
      })
    } else if (current.id !== d.id) {
      clearTimer()
      cancelAnimation(opacity)
      cancelAnimation(translateY)
      const nextItem = current
      opacity.value = withTiming(0, { duration: 120 }, (finished) => {
        if (!finished) return
        runOnJS(setDisplayed)(nextItem)
        translateY.value = 80
        translateY.value = withSpring(0, { damping: 20, stiffness: 250, mass: 0.5 })
        opacity.value = withTiming(1, { duration: 120 }, (fin) => {
          if (fin) runOnJS(scheduleHide)()
        })
      })
    }
    // intentional: only re-run when toast id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  useEffect(() => {
    return () => {
      clearTimer()
      cancelAnimation(opacity)
      cancelAnimation(translateY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!displayed) return null

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      <ToastVisual
        item={displayed}
        onDismiss={() => {
          clearTimer()
          dismiss()
        }}
      />
    </Animated.View>
  )
}

export default function Toast({
  kind,
  message,
  onDismiss,
}: {
  kind: ToastVariant
  message: string
  onDismiss?: () => void
}) {
  const item: ToastItem = { id: '0', message, variant: kind }
  return <ToastVisual item={item} onDismiss={onDismiss ?? (() => {})} />
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { opacity: 0.75 },
})
