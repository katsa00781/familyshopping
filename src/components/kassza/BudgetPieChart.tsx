import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'

import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import { formatShare, type PieSlice } from '@/lib/pie'

const SIZE = 200
const R = SIZE / 2 - 2 // a szelet-elválasztó vonal ne lógjon ki
const CX = SIZE / 2
const CY = SIZE / 2
const DIMMED_OPACITY = 0.3

const AnimatedPath = Animated.createAnimatedComponent(Path)

interface BudgetPieChartProps {
  slices: PieSlice[]
  /** Az összesítő sor címkéje (pl. „Összesen”). */
  totalLabel: string
}

function polar(angle: number) {
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
}

/** Tortaszelet útvonala (12 órától, óramutató irányába). A teljes kör külön eset. */
function wedgePath(start: number, end: number): string {
  if (end - start >= 2 * Math.PI - 1e-6) {
    return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX} ${CY + R} A ${R} ${R} 0 1 1 ${CX} ${CY - R} Z`
  }
  const s = polar(start)
  const e = polar(end)
  const large = end - start > Math.PI ? 1 : 0
  return `M ${CX} ${CY} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`
}

interface WedgeProps {
  d: string
  color: string
  stroke: string
  dimmed: boolean
  onPress: () => void
}

function Wedge({ d, color, stroke, dimmed, onPress }: WedgeProps) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withSpring(dimmed ? DIMMED_OPACITY : 1, { damping: 18, stiffness: 220 })
  }, [dimmed, opacity])

  const animatedProps = useAnimatedProps(() => ({ fillOpacity: opacity.value }))

  return (
    <AnimatedPath
      d={d}
      fill={color}
      stroke={stroke}
      strokeWidth={2}
      animatedProps={animatedProps}
      onPress={onPress}
    />
  )
}

/**
 * Kassza tortadiagram jelmagyarázattal (összeg + arány). Egy szeletre vagy
 * jelmagyarázat-sorra koppintva az kiemelődik, a többi elhalványul; újabb koppintás
 * megszünteti a kiemelést.
 */
export function BudgetPieChart({ slices, totalLabel }: BudgetPieChartProps) {
  const { colorScheme } = useColorScheme()
  const separator = colorScheme === 'dark' ? colors.darkCard : colors.card
  const [selected, setSelected] = useState<string | null>(null)

  const total = slices.reduce((s, sl) => s + sl.amount, 0)
  const toggle = (name: string) => setSelected((cur) => (cur === name ? null : name))

  // Kezdőszög = a megelőző szeletek arányainak összege (12 órától indulva).
  const wedges = slices.map((slice, i) => {
    const before = slices.slice(0, i).reduce((s, sl) => s + sl.share, 0)
    const start = -Math.PI / 2 + before * 2 * Math.PI
    const end = start + slice.share * 2 * Math.PI
    return { slice, d: wedgePath(start, end) }
  })

  return (
    <View>
      <View className="items-center py-2">
        <Svg width={SIZE} height={SIZE}>
          {wedges.map(({ slice, d }) => (
            <Wedge
              key={slice.name}
              d={d}
              color={slice.color}
              stroke={separator}
              dimmed={selected != null && selected !== slice.name}
              onPress={() => toggle(slice.name)}
            />
          ))}
        </Svg>
      </View>

      <View className="mt-3">
        {slices.map((slice) => {
          const isSelected = selected === slice.name
          return (
            <Pressable
              key={slice.name}
              onPress={() => toggle(slice.name)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${slice.name}: ${formatHuf(slice.amount)}, ${formatShare(slice.share)}`}
            >
              <View
                className={`min-h-11 flex-row items-center gap-3 rounded-xl px-2 ${
                  isSelected ? 'bg-surface-sunken dark:bg-dark-border' : ''
                }`}
              >
                <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: slice.color }} />
                <Text
                  className={`flex-1 text-body-md text-foreground dark:text-dark-foreground ${
                    isSelected ? 'font-semibold' : ''
                  }`}
                  numberOfLines={1}
                >
                  {slice.name}
                </Text>
                <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
                  {formatHuf(slice.amount)}
                </Text>
                <Text className="w-14 text-right text-body-sm text-muted">{formatShare(slice.share)}</Text>
              </View>
            </Pressable>
          )
        })}

        <View className="mt-1 min-h-11 flex-row items-center gap-3 border-t border-border px-2 dark:border-dark-border">
          <View className="h-3 w-3" />
          <Text className="flex-1 text-body-md font-semibold text-foreground dark:text-dark-foreground">
            {totalLabel}
          </Text>
          <Text className="text-body-md font-bold text-foreground dark:text-dark-foreground">
            {formatHuf(total)}
          </Text>
          <View className="w-14" />
        </View>
      </View>
    </View>
  )
}
