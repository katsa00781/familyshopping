import { useEffect } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

type SkeletonVariant = 'rect' | 'text' | 'circle'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  variant?: SkeletonVariant
}

export default function Skeleton({
  width,
  height = 16,
  borderRadius,
  variant = 'rect',
}: SkeletonProps) {
  const dark = useColorScheme() === 'dark'

  const isDark = useSharedValue(dark ? 1 : 0)
  const shimmer = useSharedValue(0)

  useEffect(() => {
    isDark.value = dark ? 1 : 0
  }, [dark, isDark])

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    )
  }, [shimmer])

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      isDark.value === 1
        ? ['#1E293B', '#334155']
        : ['#E2E8F0', '#F1F5F9'],
    ),
  }))

  const isCircle = variant === 'circle'
  const resolvedSize = isCircle ? ((width as number) ?? height) : undefined
  const resolvedBorderRadius = isCircle
    ? (resolvedSize ?? 0) / 2
    : borderRadius ?? (variant === 'text' ? 4 : 6)

  return (
    <Animated.View
      style={[
        styles.base,
        animatedStyle,
        {
          width: isCircle ? resolvedSize : (width ?? '100%'),
          height: isCircle ? resolvedSize : height,
          borderRadius: resolvedBorderRadius,
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  base: {},
})
