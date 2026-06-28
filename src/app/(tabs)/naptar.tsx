import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'

import { MonthGrid } from '@/components/naptar/MonthGrid'
import { AgendaEvent } from '@/components/naptar/AgendaEvent'
import { EventSheet } from '@/components/naptar/EventSheet'
import { useCalendarStore } from '@/store/calendarStore'
import { useDeviceWorkoutStore, isDeviceWorkout } from '@/store/deviceWorkoutStore'
import { useMemberStore } from '@/store/memberStore'
import { agendaDayLabel, dayKey, eventDayKey, expandEvents, monthGridRange, monthTitle, type CalendarDay } from '@/lib/calendar'
import { colors } from '@/constants/colors'
import type { CalendarEvent, CalendarEventInput } from '@/types'

export default function NaptarScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const events = useCalendarStore((s) => s.events)
  const loadEvents = useCalendarStore((s) => s.loadEvents)
  const createEvent = useCalendarStore((s) => s.createEvent)
  const updateEvent = useCalendarStore((s) => s.updateEvent)
  const deleteEvent = useCalendarStore((s) => s.deleteEvent)

  const workouts = useDeviceWorkoutStore((s) => s.workouts)
  const loadWorkouts = useDeviceWorkoutStore((s) => s.loadWorkouts)

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Date>(today)

  const [sheetVisible, setSheetVisible] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    loadEvents()
    void loadWorkouts()
    void loadMembers()
  }, [loadEvents, loadWorkouts, loadMembers])

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.id, m.name)
    return map
  }, [members])

  // Az ismétlődő eseményeket a látható hónap-ablakra bontjuk ki (egyszeriek
  // változatlanul). A kettlebell edzések (device naptár, csak olvasás) már
  // konkrét előfordulásként jönnek, ezeket hozzáfűzzük.
  const expanded = useMemo(() => {
    const { start, end } = monthGridRange(viewYear, viewMonth)
    return [...expandEvents(events, start, end), ...workouts]
  }, [events, workouts, viewYear, viewMonth])

  // Napi pöttyök: kulcs → tagszínek (egyedi, max 3-at mutat a grid)
  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const ev of expanded) {
      const key = eventDayKey(ev)
      const arr = map.get(key) ?? []
      const c = ev.color ?? colors.primary
      if (!arr.includes(c)) arr.push(c)
      map.set(key, arr)
    }
    return map
  }, [expanded])

  const selectedKey = dayKey(selected)
  const dayEvents = useMemo(() => {
    return expanded
      .filter((e) => eventDayKey(e) === selectedKey)
      .sort((a, b) => {
        if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
        return a.starts_at.localeCompare(b.starts_at)
      })
  }, [expanded, selectedKey])

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function goToday() {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelected(now)
  }

  function handleSelectDay(d: CalendarDay) {
    setSelected(d.date)
    if (!d.inMonth) {
      setViewYear(d.date.getFullYear())
      setViewMonth(d.date.getMonth())
    }
  }

  function openCreate() {
    setEditing(null)
    setSheetVisible(true)
  }

  function openEdit(ev: CalendarEvent) {
    // A kettlebell edzések csak olvashatók – nem szerkeszthetők innen.
    if (isDeviceWorkout(ev.id)) return
    // Ismétlődő előfordulásnál a mester-eseményt szerkesztjük (eredeti kezdettel).
    const master = events.find((e) => e.id === ev.id) ?? ev
    setEditing(master)
    setSheetVisible(true)
  }

  function handleSave(input: CalendarEventInput, id: string | null) {
    if (id) void updateEvent(id, input)
    else void createEvent(input)
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {/* Fejléc: hónap-navigáció + Ma */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => shiftMonth(-1)} accessibilityLabel="Előző hónap" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color={dark ? colors.darkForeground : colors.foreground} strokeWidth={2.4} />
          </Pressable>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 }}>
            {monthTitle(viewYear, viewMonth)}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} accessibilityLabel="Következő hónap" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={18} color={dark ? colors.darkForeground : colors.foreground} strokeWidth={2.4} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => router.push('/muszak')}
            accessibilityLabel="Műszakbeosztás"
            hitSlop={8}
            className="bg-card dark:bg-dark-card"
            style={{ width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}
          >
            <CalendarClock size={19} color={dark ? colors.darkForeground : colors.foreground} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={goToday} accessibilityLabel="Ugrás a mai napra" style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: 'rgba(20,184,166,0.12)' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', letterSpacing: -0.1, color: colors.primary }}>Ma</Text>
          </Pressable>
        </View>
      </View>

      <MonthGrid
        year={viewYear}
        month={viewMonth}
        selectedKey={selectedKey}
        dotsByDay={dotsByDay}
        onSelectDay={handleSelectDay}
      />

      {/* Agenda */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
            {agendaDayLabel(selected)}
          </Text>
          <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700' }}>
            {dayEvents.length} esemény
          </Text>
        </View>

        {dayEvents.length > 0 ? (
          dayEvents.map((ev) => (
            <AgendaEvent
              key={ev.id}
              event={ev}
              memberName={
                isDeviceWorkout(ev.id)
                  ? 'Edzés'
                  : ev.member_id
                    ? memberNameById.get(ev.member_id) ?? null
                    : null
              }
              onPress={() => openEdit(ev)}
            />
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 30, gap: 6 }}>
            <View style={{ width: 64, height: 64, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.10)', marginBottom: 8 }}>
              <Calendar size={30} color={colors.primary} strokeWidth={1.75} />
            </View>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '800' }}>
              Nincs esemény ezen a napon
            </Text>
            <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '600', textAlign: 'center', maxWidth: 240 }}>
              Koppints a + gombra új esemény hozzáadásához.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={openCreate}
        accessibilityLabel="Új esemény"
        accessibilityRole="button"
        style={{ position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 8 }}
      >
        <Plus size={26} color={colors.primaryForeground} strokeWidth={2.6} />
      </Pressable>

      <EventSheet
        visible={sheetVisible}
        event={editing}
        defaultDate={selected}
        onClose={() => setSheetVisible(false)}
        onSave={handleSave}
        onDelete={(id) => void deleteEvent(id)}
      />
    </SafeAreaView>
  )
}
