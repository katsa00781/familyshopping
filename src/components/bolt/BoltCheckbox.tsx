import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { Check } from 'lucide-react-native'

interface Props {
  checked: boolean
  onToggle: () => void
}

// expo-haptics is optional – gracefully skipped if not installed
type HapticsModule = { impactAsync: (style: 'light' | 'medium' | 'heavy') => Promise<void> }
let Haptics: HapticsModule | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics') as HapticsModule
} catch {}

export default function BoltCheckbox({ checked, onToggle }: Props) {
  const progress = useSharedValue(checked ? 1 : 0)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // 220ms perceptual duration, dampingRatio 0.65 → ~8% overshoot
    progress.value = withSpring(checked ? 1 : 0, { duration: 220, dampingRatio: 0.65 })
    // Haptics fire at ~80% of spring settle (~176ms), NOT on touch-down
    const timer = setTimeout(() => {
      void Haptics?.impactAsync('medium')
    }, 176)
    return () => clearTimeout(timer)
  }, [checked, progress])

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#334155', '#22C55E']),
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }))

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <Animated.View style={[styles.circle, circleStyle]}>
        <Animated.View style={checkStyle}>
          <Check size={28} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
