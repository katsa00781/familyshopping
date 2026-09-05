import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native'

import { dayKey, eventTimeLabel, minutesOfDay } from '@/lib/calendar'
import { colors } from '@/constants/colors'
import type { CalendarEvent } from '@/types'

interface DayTimelineProps {
  date: Date
  events: CalendarEvent[]
  memberNameFor: (event: CalendarEvent) => string | null
  onPressEvent: (event: CalendarEvent) => void
}

const HOUR_HEIGHT = 64
const GUTTER_WIDTH = 46
const MIN_BLOCK_HEIGHT = 32
const DEFAULT_SCROLL_MINUTES = 7 * 60 // 07:00, ha nincs se esemény, se „ma"

interface PositionedEvent {
  event: CalendarEvent
  startMin: number
  endMin: number
  col: number
  colCount: number
}

/** Átfedő időpontokat oszlopokba rendezi (egymás melletti sávok az ütközés jelzésére). */
function layoutTimedEvents(events: CalendarEvent[]): PositionedEvent[] {
  const items = events
    .map((event) => {
      const startMin = minutesOfDay(event.starts_at)
      const rawEnd = event.ends_at ? minutesOfDay(event.ends_at) : startMin + 30
      const endMin = rawEnd > startMin ? rawEnd : startMin + 30
      return { event, startMin, endMin }
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  const positioned: PositionedEvent[] = []
  let cluster: typeof items = []
  let clusterEnd = -1

  function flushCluster() {
    if (cluster.length === 0) return
    const columnEnds: number[] = []
    const assigned: { item: (typeof items)[number]; col: number }[] = []
    for (const item of cluster) {
      let placedCol = -1
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c]! <= item.startMin) {
          placedCol = c
          break
        }
      }
      if (placedCol === -1) {
        placedCol = columnEnds.length
        columnEnds.push(item.endMin)
      } else {
        columnEnds[placedCol] = item.endMin
      }
      assigned.push({ item, col: placedCol })
    }
    const colCount = columnEnds.length
    for (const a of assigned) {
      positioned.push({ event: a.item.event, startMin: a.item.startMin, endMin: a.item.endMin, col: a.col, colCount })
    }
    cluster = []
    clusterEnd = -1
  }

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flushCluster()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  flushCluster()

  return positioned
}

export function DayTimeline({ date, events, memberNameFor, onPressEvent }: DayTimelineProps) {
  const dark = useColorScheme() === 'dark'
  const fg = dark ? colors.darkForeground : colors.foreground
  const border = dark ? colors.darkBorder : colors.border
  const scrollRef = useRef<ScrollView>(null)

  const allDayEvents = useMemo(() => events.filter((e) => e.all_day), [events])
  const timedEvents = useMemo(() => events.filter((e) => !e.all_day), [events])
  const positioned = useMemo(() => layoutTimedEvents(timedEvents), [timedEvents])

  const isToday = dayKey(date) === dayKey(new Date())
  const [nowMin, setNowMin] = useState(() => minutesOfDay(new Date().toISOString()))

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNowMin(minutesOfDay(new Date().toISOString())), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  useEffect(() => {
    let target = DEFAULT_SCROLL_MINUTES
    if (isToday) {
      target = nowMin - 120
    } else if (positioned.length > 0) {
      target = Math.min(...positioned.map((p) => p.startMin)) - 60
    }
    target = Math.max(0, Math.min(target, 24 * 60 - 6 * 60))
    const y = (target / 60) * HOUR_HEIGHT
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey(date)])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <View style={{ flex: 1 }}>
      {allDayEvents.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 10 }}>
          {allDayEvents.map((ev) => (
            <Pressable
              key={ev.id}
              onPress={() => onPressEvent(ev)}
              accessibilityRole="button"
              accessibilityLabel={`${ev.title}, egész napos esemény`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: `${ev.color ?? colors.primary}1F`,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: ev.color ?? colors.primary }} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: fg }} numberOfLines={1}>
                {ev.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
          {/* Óra-oszlop */}
          <View style={{ width: GUTTER_WIDTH }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: -6 }}>
                  {String(h).padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Rács + esemény-sávok */}
          <View style={{ flex: 1, position: 'relative' }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: border }} />
            ))}

            {positioned.map(({ event, startMin, endMin, col, colCount }) => {
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT)
              const widthPct = 100 / colCount
              const barColor = event.color ?? colors.primary
              const memberName = memberNameFor(event)
              const compact = height < 40

              return (
                <Pressable
                  key={`${event.id}-${startMin}`}
                  onPress={() => onPressEvent(event)}
                  accessibilityRole="button"
                  accessibilityLabel={`${event.title} szerkesztése`}
                  style={{
                    position: 'absolute',
                    top,
                    height,
                    left: `${col * widthPct}%`,
                    width: `${widthPct}%`,
                    paddingLeft: 4,
                    paddingRight: colCount > 1 ? 3 : 0,
                  }}
                >
                  <View
                    className="bg-card dark:bg-dark-card"
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: compact ? 3 : 6,
                      overflow: 'hidden',
                      borderLeftWidth: 3,
                      borderLeftColor: barColor,
                      borderWidth: colCount > 1 ? 1 : 0,
                      borderColor: colCount > 1 ? colors.warning : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: compact ? 12 : 13, fontWeight: '800', color: fg, letterSpacing: -0.2 }} numberOfLines={compact ? 1 : 2}>
                      {event.title}
                    </Text>
                    {!compact ? (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 1 }} numberOfLines={1}>
                        {eventTimeLabel(event.starts_at)}
                        {event.ends_at ? `–${eventTimeLabel(event.ends_at)}` : ''}
                        {memberName ? ` · ${memberName}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )
            })}

            {isToday ? (
              <View style={{ position: 'absolute', top: (nowMin / 60) * HOUR_HEIGHT, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: colors.accent, marginLeft: -4 }} />
                <View style={{ flex: 1, height: 1.5, backgroundColor: colors.accent }} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
