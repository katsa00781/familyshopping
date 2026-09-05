import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Info, Trash2, X } from 'lucide-react-native'

import { DateTimePickerModal } from './DateTimePickerModal'
import { expandEvents, rangesOverlap, shortDateLabel } from '@/lib/calendar'
import { useMemberStore } from '@/store/memberStore'
import { useCalendarStore } from '@/store/calendarStore'
import { colors, memberColors } from '@/constants/colors'
import type { CalendarEvent, CalendarEventInput } from '@/types'

interface AppointmentSheetProps {
  visible: boolean
  appointment: CalendarEvent | null // null = új időpont
  defaultDate: Date // az Időpontok képernyőn kijelölt nap (új időponthoz)
  onClose: () => void
  onSave: (input: CalendarEventInput, id: string | null) => void
  onDelete: (id: string) => void
}

const DURATION_OPTIONS = [30, 60, 90, 120] as const

function timeLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type PickerTarget = 'startDate' | 'startTime' | 'endTime' | null

export function AppointmentSheet({ visible, appointment, defaultDate, onClose, onSave, onDelete }: AppointmentSheetProps) {
  const dark = useColorScheme() === 'dark'
  const isEdit = appointment !== null

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)
  const events = useCalendarStore((s) => s.events)

  const [clientName, setClientName] = useState('')
  const [start, setStart] = useState(new Date())
  const [end, setEnd] = useState(new Date())
  const [memberId, setMemberId] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerTarget>(null)

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
  }, [visible, translateY])

  // Mezők feltöltése nyitáskor
  useEffect(() => {
    if (!visible) return
    if (appointment) {
      setClientName(appointment.title)
      const s = new Date(appointment.starts_at)
      setStart(s)
      setEnd(appointment.ends_at ? new Date(appointment.ends_at) : new Date(s.getTime() + 60 * 60 * 1000))
      setMemberId(appointment.member_id)
    } else {
      const s = new Date(defaultDate)
      s.setHours(9, 0, 0, 0)
      setClientName('')
      setStart(s)
      setEnd(new Date(s.getTime() + 60 * 60 * 1000))
      // Alapból a "Anya" nevű tag, ha van, különben az első tag.
      setMemberId(members.find((m) => m.name === 'Anya')?.id ?? members[0]?.id ?? null)
    }
  }, [visible, appointment, defaultDate, members])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000)

  // Elérhetőség-jelzés: van-e átfedő műszak a kiválasztott napon/időszakban.
  const overlappingShift = useMemo(() => {
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const dayEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
    const dayEvents = expandEvents(events, dayStart, dayEnd)
    return dayEvents.find(
      (e) => e.event_type === 'shift' && rangesOverlap(start, end, new Date(e.starts_at), new Date(e.ends_at ?? e.starts_at)),
    )
  }, [events, start, end])

  const overlappingShiftMemberName = overlappingShift?.member_id
    ? members.find((m) => m.id === overlappingShift.member_id)?.name ?? null
    : null

  function handleSave() {
    const trimmed = clientName.trim()
    if (!trimmed) return
    const safeEnd = end.getTime() <= start.getTime() ? new Date(start.getTime() + 30 * 60 * 1000) : end
    const member = members.find((m) => m.id === memberId) ?? null
    const input: CalendarEventInput = {
      title: trimmed,
      description: null,
      location: null,
      starts_at: start.toISOString(),
      ends_at: safeEnd.toISOString(),
      all_day: false,
      member_id: memberId,
      color: member?.color ?? memberColors[0],
      rrule: null,
      event_type: 'appointment',
    }
    onSave(input, appointment?.id ?? null)
    onClose()
  }

  function handleDelete() {
    if (!appointment) return
    Alert.alert('Időpont törlése', `Biztosan törlöd: „${appointment.title}"?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => { onDelete(appointment.id); onClose() } },
    ])
  }

  function applyPicked(value: Date) {
    if (!picker) return
    const durationMs = end.getTime() - start.getTime()
    if (picker === 'startDate' || picker === 'startTime') {
      setStart(value)
      setEnd(new Date(value.getTime() + durationMs))
    } else {
      setEnd(value.getTime() > start.getTime() ? value : new Date(start.getTime() + 30 * 60 * 1000))
    }
    setPicker(null)
  }

  function selectMember(m: { id: string }) {
    setMemberId(m.id)
  }

  function selectDuration(minutes: number) {
    setEnd(new Date(start.getTime() + minutes * 60 * 1000))
  }

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground
  const accent = members.find((m) => m.id === memberId)?.color ?? colors.primary

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '68%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          {/* Grab + fejléc */}
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>
              {isEdit ? 'Időpont szerkesztése' : 'Új időpont'}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Ügyfél neve */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">ÜGYFÉL NEVE</Text>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="Pl. Kovács Anna"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }]}
              />
            </View>

            {/* Nap + idő */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">IDŐPONT</Text>
              <View style={[styles.whenCard, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                <View style={styles.whenRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: accent }} />
                    <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                      Kezdet
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => setPicker('startDate')} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                      <Text style={[styles.pillText, { color: fg }]}>{shortDateLabel(start)}</Text>
                    </Pressable>
                    <Pressable onPress={() => setPicker('startTime')} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                      <Text style={[styles.pillText, { color: accent }]}>{timeLabel(start)}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.whenRow, { borderTopWidth: 1.5, borderTopColor: fieldBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: '#D8D4CB' }} />
                    <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                      Vége
                    </Text>
                  </View>
                  <Pressable onPress={() => setPicker('endTime')} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                    <Text style={[styles.pillText, { color: fg }]}>{timeLabel(end)}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Időtartam gyorsgombok */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">IDŐTARTAM</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DURATION_OPTIONS.map((minutes) => {
                  const active = durationMinutes === minutes
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => selectDuration(minutes)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${minutes} perc`}
                      style={{
                        height: 38, paddingHorizontal: 16, borderRadius: 99, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : fieldBorder,
                        backgroundColor: active ? 'rgba(20,184,166,0.12)' : fieldBg,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: active ? colors.primary : colors.muted }}>
                        {minutes} perc
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Kinek – melyik családtag ügyfele */}
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label} className="text-muted">KINEK</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {members.map((m) => {
                  const active = memberId === m.id
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => selectMember(m)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${m.name} kiválasztása`}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingLeft: 8, paddingRight: 14,
                        borderRadius: 99, borderWidth: 1.5,
                        borderColor: active ? m.color : fieldBorder,
                        backgroundColor: active ? `${m.color}1A` : fieldBg,
                      }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: m.color }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{m.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: active ? m.color : colors.muted }}>{m.name}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Elérhetőség-jelzés (nem blokkoló) */}
            {overlappingShift ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 4 }}>
                <Info size={15} color={colors.warning} strokeWidth={2.2} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.warning }}>
                  Ekkor műszakban van: {overlappingShiftMemberName ?? overlappingShift.title}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: fieldBorder, gap: 10 }} className="bg-background dark:bg-dark-background">
            {isEdit ? (
              <Pressable onPress={handleDelete} accessibilityLabel="Időpont törlése" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 9 }}>
                <Trash2 size={17} color={colors.destructive} strokeWidth={2} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.destructive, letterSpacing: -0.2 }}>Időpont törlése</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSave}
              disabled={!clientName.trim()}
              accessibilityLabel="Mentés"
              style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: colors.primary, opacity: clientName.trim() ? 1 : 0.5 }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>Mentés</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        visible={picker !== null}
        mode={picker === 'startDate' ? 'date' : 'time'}
        value={picker === 'endTime' ? end : start}
        accent={accent}
        onConfirm={applyPicked}
        onClose={() => setPicker(null)}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginLeft: 2, marginBottom: 7 },
  input: { width: '100%', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  whenCard: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden' },
  whenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  pill: { borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8 },
  pillText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
})
