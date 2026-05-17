import { useEffect, useRef, useState } from 'react'
import { StyleSheet, useColorScheme, View } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

type SkeletonVariant = 'card' | 'listRow'

interface SkeletonProps {
  variant: SkeletonVariant
  isLoading: boolean
}

function SkeletonBar({
  width = '100%',
  height = 14,
  borderRadius = 6,
  shimmer,
  dark,
}: {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  shimmer: SharedValue<number>
  dark: boolean
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      dark ? ['#1E293B', '#334155'] : ['#E2E8F0', '#F8FAFC'],
    ),
  }))

  return (
    <Animated.View
      style={[animatedStyle, { width, height, borderRadius }]}
    />
  )
}

function CardSkeleton({
  shimmer,
  dark,
}: {
  shimmer: SharedValue<number>
  dark: boolean
}) {
  return (
    <View
      className="bg-card dark:bg-dark-card rounded-card p-4"
      style={styles.cardShadow}
    >
      <SkeletonBar width="60%" height={16} borderRadius={6} shimmer={shimmer} dark={dark} />
      <View className="h-3" />
      <SkeletonBar width="100%" height={12} borderRadius={4} shimmer={shimmer} dark={dark} />
      <View className="h-2" />
      <SkeletonBar width="80%" height={12} borderRadius={4} shimmer={shimmer} dark={dark} />
    </View>
  )
}

function ListRowSkeleton({
  shimmer,
  dark,
}: {
  shimmer: SharedValue<number>
  dark: boolean
}) {
  return (
    <View className="flex-row items-center gap-3 px-4" style={{ height: 56 }}>
      <SkeletonBar width={40} height={40} borderRadius={20} shimmer={shimmer} dark={dark} />
      <View className="flex-1 gap-2">
        <SkeletonBar width="55%" height={14} shimmer={shimmer} dark={dark} />
        <SkeletonBar width="35%" height={11} borderRadius={4} shimmer={shimmer} dark={dark} />
      </View>
    </View>
  )
}

export default function Skeleton({ variant, isLoading }: SkeletonProps) {
  const dark = useColorScheme() === 'dark'
  const shimmer = useSharedValue(0)
  const mountedAt = useRef(Date.now())
  const [show, setShow] = useState(isLoading)

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    )
    return () => {
      shimmer.value = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoading) {
      mountedAt.current = Date.now()
      setShow(true)
    } else {
      const elapsed = Date.now() - mountedAt.current
      const delay = Math.max(0, 200 - elapsed)
      const timer = setTimeout(() => setShow(false), delay)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (!show) return null

  return variant === 'card' ? (
    <CardSkeleton shimmer={shimmer} dark={dark} />
  ) : (
    <ListRowSkeleton shimmer={shimmer} dark={dark} />
  )
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})
