import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'

import { AgendaEvent } from '@/components/naptar/AgendaEvent'
import { AppointmentSheet } from '@/components/naptar/AppointmentSheet'
import { useCalendarStore } from '@/store/calendarStore'
import { useMemberStore } from '@/store/memberStore'
import { agendaDayLabel, dayKey, eventDayKey, expandEvents, shortDateLabel } from '@/lib/calendar'
import { weekRange } from '@/lib/shifts'
import { colors } from '@/constants/colors'
import type { CalendarEvent, CalendarEventInput } from '@/types'

function weekLabel(start: Date, end: Date): string {
  return `${shortDateLabel(start)} – ${shortDateLabel(end)}`
}

export default function IdopontokScreen() {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const fg = dark ? colors.darkForeground : colors.foreground

  const events = useCalendarStore((s) => s.events)
  const loadEvents = useCalendarStore((s) => s.loadEvents)
  const createEvent = useCalendarStore((s) => s.createEvent)
  const updateEvent = useCalendarStore((s) => s.updateEvent)
  const deleteEvent = useCalendarStore((s) => s.deleteEvent)

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(today)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    loadEvents()
    void loadMembers()
  }, [loadEvents, loadMembers])

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.id, m.name)
    return map
  }, [members])

  const { start: weekStart, end: weekEnd } = useMemo(() => weekRange(viewDate), [viewDate])

  // Csak az ügyfél-időpontok (event_type === 'appointment'), a látható hétre kibontva.
  const appointments = useMemo(() => {
    return expandEvents(events, weekStart, weekEnd)
      .filter((e) => e.event_type === 'appointment')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [events, weekStart, weekEnd])

  const days = useMemo(() => {
    const out: { key: string; date: Date; items: CalendarEvent[] }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
      const key = dayKey(date)
      out.push({ key, date, items: appointments.filter((e) => eventDayKey(e) === key) })
    }
    return out
  }, [weekStart, appointments])

  const todayKey = dayKey(today)
  const defaultCreateDate = days.find((d) => d.key === todayKey)?.date ?? weekStart

  function shiftWeek(delta: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 7 * delta))
  }

  function goToday() {
    setViewDate(new Date())
  }

  function openCreate() {
    setEditing(null)
    setSheetVisible(true)
  }

  function openEdit(ev: CalendarEvent) {
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
      {/* Fejléc */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Vissza" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={22} color={fg} strokeWidth={2.4} />
        </Pressable>
        <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
          Időpontok
        </Text>
      </View>

      {/* Hét-navigáció */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => shiftWeek(-1)} accessibilityLabel="Előző hét" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color={fg} strokeWidth={2.4} />
          </Pressable>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>
            {weekLabel(weekStart, weekEnd)}
          </Text>
          <Pressable onPress={() => shiftWeek(1)} accessibilityLabel="Következő hét" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={18} color={fg} strokeWidth={2.4} />
          </Pressable>
        </View>
        <Pressable onPress={goToday} accessibilityLabel="Ugrás a mai hétre" style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: 'rgba(20,184,166,0.12)' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', letterSpacing: -0.1, color: colors.primary }}>Ma</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {appointments.length > 0 ? (
          days.map((d) =>
            d.items.length > 0 ? (
              <View key={d.key} style={{ marginBottom: 18 }}>
                <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800', marginBottom: 8, paddingHorizontal: 2 }}>
                  {agendaDayLabel(d.date)}
                </Text>
                {d.items.map((ev) => (
                  <AgendaEvent
                    key={ev.id}
                    event={ev}
                    memberName={ev.member_id ? memberNameById.get(ev.member_id) ?? null : null}
                    onPress={() => openEdit(ev)}
                  />
                ))}
              </View>
            ) : null,
          )
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 30, gap: 6 }}>
            <View style={{ width: 64, height: 64, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.10)', marginBottom: 8 }}>
              <CalendarCheck size={30} color={colors.primary} strokeWidth={1.75} />
            </View>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '800' }}>
              Nincs időpont ezen a héten
            </Text>
            <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '600', textAlign: 'center', maxWidth: 240 }}>
              Koppints a + gombra új időpont hozzáadásához.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={openCreate}
        accessibilityLabel="Új időpont"
        accessibilityRole="button"
        style={{ position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 8 }}
      >
        <Plus size={26} color={colors.primaryForeground} strokeWidth={2.6} />
      </Pressable>

      <AppointmentSheet
        visible={sheetVisible}
        appointment={editing}
        defaultDate={defaultCreateDate}
        onClose={() => setSheetVisible(false)}
        onSave={handleSave}
        onDelete={(id) => void deleteEvent(id)}
      />
    </SafeAreaView>
  )
}
