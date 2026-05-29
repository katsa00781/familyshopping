import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import { catBg, colors } from '@/constants/colors'
import type { InflationByCategory, ItemCategory } from '@/types'

const SIZE = 120
const STROKE = 14
const R = SIZE / 2 - STROKE / 2  // 53 – radius to stroke centre
const CX = SIZE / 2              // 60
const CY = SIZE / 2              // 60
const GAP = 8                    // arc-length gap between segments

interface Props {
  data: InflationByCategory[]
  period: number
  selectedCategory: ItemCategory | null
  onSelectCategory: (cat: ItemCategory | null) => void
}

function polarXY(r: number, angle: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function arcPath(r: number, startAngle: number, endAngle: number): string {
  const s = polarXY(r, startAngle)
  const e = polarXY(r, endAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

export default function DonutChart({ data, period, selectedCategory, onSelectCategory }: Props) {
  // Only render segments with meaningful share
  const active = data.filter((d) => d.share > 0.005)
  const n = active.length

  // Empty state: full grey track
  if (n === 0) {
    return (
      <View style={styles.wrapper}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={CX} cy={CY} r={R} stroke={colors.background} strokeWidth={STROKE} fill="none" />
        </Svg>
      </View>
    )
  }

  const gapAngle = GAP / R                         // radians
  const usable = 2 * Math.PI - n * gapAngle

  let angle = -Math.PI / 2  // start at 12 o'clock
  const segments = active.map((item) => {
    const segAngle = Math.max(item.share * usable, 0.01)
    const start = angle
    const end = angle + segAngle
    angle = end + gapAngle
    return {
      category: item.category,
      change_pct: item.change_pct,
      color: catBg[item.category] ?? catBg['Egyéb'],
      path: arcPath(R, start, end),
    }
  })

  // Centre display: selected segment or weighted average
  const selSeg = selectedCategory ? segments.find((s) => s.category === selectedCategory) : null
  const displayPct = selSeg
    ? selSeg.change_pct
    : data.reduce((sum, d) => sum + d.change_pct * d.share, 0)
  const sign = displayPct > 0 ? '+' : ''

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle cx={CX} cy={CY} r={R} stroke="#F1F5F9" strokeWidth={STROKE} fill="none" />
        {/* Segments */}
        {segments.map((seg) => {
          const isHighlighted = selectedCategory === null || selectedCategory === seg.category
          return (
            <G key={seg.category}>
              {/* Visual arc */}
              <Path
                d={seg.path}
                stroke={isHighlighted ? seg.color : colors.border}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                fill="none"
              />
              {/* Wider transparent hit area */}
              <Path
                d={seg.path}
                stroke="transparent"
                strokeWidth={STROKE + 16}
                fill="none"
                onPress={() =>
                  onSelectCategory(selectedCategory === seg.category ? null : seg.category)
                }
              />
            </G>
          )
        })}
      </Svg>
      {/* Centre text */}
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.pct}>
          {sign}{Math.round(displayPct)}%
        </Text>
        <Text style={styles.label}>{period} nap</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.44,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    color: colors.muted,
    letterSpacing: 0.44,
  },
})
