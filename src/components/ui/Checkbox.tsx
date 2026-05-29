import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { Check } from 'lucide-react-native'
import { haptics } from '@/lib/haptics'
import { colors } from '@/constants/colors'
import * as ExpoHaptics from 'expo-haptics'

export interface CheckboxProps {
  checked: boolean
  onChange: (next: boolean) => void
  variant?: 'list' | 'bolt'
  disabled?: boolean
  accessibilityLabel?: string
}

export function Checkbox({
  checked,
  onChange,
  variant = 'list',
  disabled = false,
  accessibilityLabel,
}: CheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (variant === 'bolt') {
      // damping 12 → intentional overshoot (scale 0.8 → 1.3 → 1.0)
      progress.value = withSpring(checked ? 1 : 0, { damping: 12, stiffness: 200 })
      haptics.medium()
    } else {
      // damping 16 → mild overshoot (scale 0.8 → 1.2 → 1.0)
      progress.value = withSpring(checked ? 1 : 0, { damping: 16, stiffness: 200 })
      void ExpoHaptics.selectionAsync()
    }
  }, [checked, variant, progress])

  const listCircleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(37,99,235,0)', colors.primary]
    ),
    borderWidth: interpolate(progress.value, [0, 0.3], [1.5, 0], Extrapolation.CLAMP),
    borderColor: colors.cat.other,
  }))

  const boltCircleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.darkBorder, colors.success]),
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }))

  const isBolt = variant === 'bolt'

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      hitSlop={isBolt ? undefined : { top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View style={[isBolt ? styles.boltCircle : styles.listCircle, isBolt ? boltCircleStyle : listCircleStyle]}>
        <Animated.View style={checkStyle}>
          <Check
            size={isBolt ? 28 : 14}
            color={colors.card}
            strokeWidth={isBolt ? 3 : 2.5}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  listCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
