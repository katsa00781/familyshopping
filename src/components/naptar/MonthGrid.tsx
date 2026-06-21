import { useEffect } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { buildMonthMatrix, weekdayHeaders, type CalendarDay } from '@/lib/calendar'
import { colors } from '@/constants/colors'

interface MonthGridProps {
  year: number
  month: number // 0–11
  selectedKey: string
  /** napi kulcs → tagszínek (max 3 pötty jelenik meg) */
  dotsByDay: Map<string, string[]>
  onSelectDay: (day: CalendarDay) => void
}

export function MonthGrid({ year, month, selectedKey, dotsByDay, onSelectDay }: MonthGridProps) {
  const dark = useColorScheme() === 'dark'
  const fg = dark ? colors.darkForeground : colors.foreground
  const matrix = buildMonthMatrix(year, month)

  // Halk fade a hónapváltáskor (reanimated, nincs react-native-calendars).
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.value = 0.35
    opacity.value = withTiming(1, { duration: 220 })
  }, [year, month, opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View
      className="bg-card dark:bg-dark-card"
      style={{
        marginHorizontal: 16,
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingTop: 16,
        paddingBottom: 18,
        shadowColor: '#1C2B2A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* Hét napjai */}
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {weekdayHeaders.map((w, i) => (
          <View key={w} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
            <Text
              style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.2 }}
              className={i === 6 ? 'text-accent' : 'text-muted'}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* Napok */}
      <Animated.View style={[{ flexDirection: 'row', flexWrap: 'wrap' }, animStyle]}>
        {matrix.map((d) => {
          const dots = dotsByDay.get(d.key) ?? []
          const selected = d.key === selectedKey
          return (
            <Pressable
              key={d.key}
              onPress={() => onSelectDay(d)}
              accessibilityRole="button"
              accessibilityLabel={`${d.day}. nap`}
              style={{
                width: `${100 / 7}%`,
                height: 46,
                alignItems: 'center',
                paddingTop: 3,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 99,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d.isToday
                    ? colors.primary
                    : selected
                      ? 'rgba(20,184,166,0.12)'
                      : 'transparent',
                  shadowColor: d.isToday ? colors.primary : 'transparent',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: d.isToday ? 0.4 : 0,
                  shadowRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 15.5,
                    fontWeight: d.isToday ? '800' : d.inMonth ? '700' : '600',
                    letterSpacing: -0.3,
                    color: d.isToday
                      ? colors.primaryForeground
                      : !d.inMonth
                        ? '#C7CAC8'
                        : d.isSunday
                          ? colors.accent
                          : fg,
                  }}
                >
                  {d.day}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 3, height: 8, marginTop: 2, alignItems: 'center' }}>
                {dots.slice(0, 3).map((c, i) => (
                  <View
                    key={i}
                    style={{ width: 5, height: 5, borderRadius: 99, backgroundColor: c }}
                  />
                ))}
              </View>
            </Pressable>
          )
        })}
      </Animated.View>
    </View>
  )
}
