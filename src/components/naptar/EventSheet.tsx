import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Check, Clock, Repeat, Trash2, Users, UsersRound, X } from 'lucide-react-native'

import { DateTimePickerModal } from './DateTimePickerModal'
import { MemberEditorSheet } from '@/components/etrend/MemberEditorSheet'
import {
  RECURRENCE_OPTIONS,
  RECURRENCE_UNITS,
  buildRRule,
  freqFromRRule,
  intervalFromRRule,
  recurrenceLabel,
  shortDateLabel,
  untilFromRRule,
  type RecurrenceFreq,
} from '@/lib/calendar'
import { useMemberStore } from '@/store/memberStore'
import { colors, memberColors } from '@/constants/colors'
import type { CalendarEvent, CalendarEventInput } from '@/types'

interface EventSheetProps {
  visible: boolean
  event: CalendarEvent | null // null = új esemény
  defaultDate: Date // a naptárban kijelölt nap (új eseményhez)
  onClose: () => void
  onSave: (input: CalendarEventInput, id: string | null) => void
  onDelete: (id: string) => void
}

function timeLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type PickerTarget = { field: 'start' | 'end' | 'until'; mode: 'date' | 'time' } | null

export function EventSheet({ visible, event, defaultDate, onClose, onSave, onDelete }: EventSheetProps) {
  const dark = useColorScheme() === 'dark'
  const isEdit = event !== null

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState(new Date())
  const [end, setEnd] = useState(new Date())
  const [memberId, setMemberId] = useState<string | null>(null)
  const [color, setColor] = useState<string>(memberColors[0])
  const [freq, setFreq] = useState<RecurrenceFreq>('none')
  const [customOpen, setCustomOpen] = useState(false)
  const [customInterval, setCustomInterval] = useState('6')
  const [until, setUntil] = useState<Date | null>(null)
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState<PickerTarget>(null)
  const [membersOpen, setMembersOpen] = useState(false)

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
    if (event) {
      setTitle(event.title)
      setAllDay(event.all_day)
      const s = new Date(event.starts_at)
      setStart(s)
      setEnd(event.ends_at ? new Date(event.ends_at) : new Date(s.getTime() + 60 * 60 * 1000))
      setMemberId(event.member_id)
      setColor(event.color ?? memberColors[0])
      const f = freqFromRRule(event.rrule)
      const iv = intervalFromRRule(event.rrule)
      setFreq(f)
      setCustomOpen(f !== 'none' && iv > 1)
      setCustomInterval(String(iv > 1 ? iv : 6))
      setUntil(untilFromRRule(event.rrule))
      setLocation(event.location ?? '')
      setNote(event.description ?? '')
    } else {
      const s = new Date(defaultDate)
      s.setHours(9, 0, 0, 0)
      const e = new Date(s.getTime() + 60 * 60 * 1000)
      setTitle('')
      setAllDay(false)
      setStart(s)
      setEnd(e)
      setMemberId(null)
      setColor(memberColors[0])
      setFreq('none')
      setCustomOpen(false)
      setCustomInterval('6')
      setUntil(null)
      setLocation('')
      setNote('')
    }
  }, [visible, event, defaultDate])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return
    // a vég sosem lehet a kezdet előtt
    const safeEnd = end.getTime() < start.getTime() ? new Date(start.getTime() + 60 * 60 * 1000) : end
    const input: CalendarEventInput = {
      title: trimmed,
      description: note.trim() || null,
      location: location.trim() || null,
      starts_at: start.toISOString(),
      ends_at: allDay ? null : safeEnd.toISOString(),
      all_day: allDay,
      member_id: memberId,
      color,
      rrule: buildRRule(freq, customOpen ? parseInterval(customInterval) : 1, freq === 'none' ? null : until),
    }
    onSave(input, event?.id ?? null)
    onClose()
  }

  function parseInterval(raw: string): number {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : 1
  }

  function selectPreset(key: RecurrenceFreq) {
    setFreq(key)
    setCustomOpen(false)
    if (key === 'none') setUntil(null)
  }

  function openCustom() {
    setCustomOpen(true)
    if (freq === 'none') setFreq('weekly') // alapértelmezett egység: hét (műszakciklus)
  }

  function selectMember(m: { id: string; color: string }) {
    setMemberId(m.id)
    setColor(m.color) // a tag színe lesz az alapszín (a színválasztó felülírhatja)
  }

  // Élő előnézet a custom rrule-ról („6 hetente"), ha érvényes.
  const customPreview =
    customOpen && freq !== 'none'
      ? recurrenceLabel(buildRRule(freq, parseInterval(customInterval), null))
      : null

  function handleDelete() {
    if (!event) return
    const recurringNote = event.rrule ? '\n\nEz egy ismétlődő esemény – minden előfordulás törlődik.' : ''
    Alert.alert('Esemény törlése', `Biztosan törlöd: „${event.title}"?${recurringNote}`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => { onDelete(event.id); onClose() } },
    ])
  }

  function applyPicked(value: Date) {
    if (!picker) return
    if (picker.field === 'start') {
      setStart(value)
      // a vég együtt csúszik, ha a kezdet mögé kerülne
      if (value.getTime() >= end.getTime()) setEnd(new Date(value.getTime() + 60 * 60 * 1000))
    } else if (picker.field === 'end') {
      setEnd(value)
    } else {
      setUntil(value)
    }
    setPicker(null)
  }

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          {/* Grab + fejléc */}
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>
              {isEdit ? 'Esemény szerkesztése' : 'Új esemény'}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Cím */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">CÍM</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Pl. Zongoraóra"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }]}
              />
            </View>

            {/* Kinek – családtag-hozzárendelés (tagszín lesz az esemény színe) */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">KINEK</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable
                  onPress={() => setMemberId(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: memberId === null }}
                  accessibilityLabel="Közös esemény"
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingLeft: 8, paddingRight: 14,
                    borderRadius: 99, borderWidth: 1.5,
                    borderColor: memberId === null ? colors.muted : fieldBorder,
                    backgroundColor: memberId === null ? `${colors.muted}1A` : fieldBg,
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}>
                    <Users size={12} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: memberId === null ? colors.muted : colors.muted }}>Közös</Text>
                </Pressable>

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

                <Pressable
                  onPress={() => setMembersOpen(true)}
                  accessibilityLabel="Tagok kezelése"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1.5, borderStyle: 'dashed', borderColor: fieldBorder }}
                >
                  <UsersRound size={15} color={colors.muted} strokeWidth={2} />
                  <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>Tagok</Text>
                </Pressable>
              </View>
            </View>

            {/* Egész napos */}
            <View style={{ marginBottom: 18 }}>
              <View style={[styles.rowCard, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.12)' }}>
                    <Clock size={20} color={colors.primary} strokeWidth={1.9} />
                  </View>
                  <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
                    Egész napos
                  </Text>
                </View>
                <Switch
                  value={allDay}
                  onValueChange={setAllDay}
                  trackColor={{ true: colors.primary, false: '#D8D4CB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Időpont */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">IDŐPONT</Text>
              <View style={[styles.whenCard, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                <View style={styles.whenRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: color }} />
                    <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                      {allDay ? 'Dátum' : 'Kezdet'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => setPicker({ field: 'start', mode: 'date' })} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                      <Text style={[styles.pillText, { color: fg }]}>{shortDateLabel(start)}</Text>
                    </Pressable>
                    {!allDay ? (
                      <Pressable onPress={() => setPicker({ field: 'start', mode: 'time' })} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                        <Text style={[styles.pillText, { color }]}>{timeLabel(start)}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {!allDay ? (
                  <View style={[styles.whenRow, { borderTopWidth: 1.5, borderTopColor: fieldBorder }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: '#D8D4CB' }} />
                      <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                        Vége
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setPicker({ field: 'end', mode: 'date' })} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                        <Text style={[styles.pillText, { color: fg }]}>{shortDateLabel(end)}</Text>
                      </Pressable>
                      <Pressable onPress={() => setPicker({ field: 'end', mode: 'time' })} style={[styles.pill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                        <Text style={[styles.pillText, { color }]}>{timeLabel(end)}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Szín (v1: a tag helyett közvetlen színválasztás – single-user) */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">SZÍN</Text>
              <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 2 }}>
                {memberColors.map((c) => {
                  const sel = c === color
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      accessibilityLabel={`Szín kiválasztása`}
                      style={{ width: 44, height: 44, borderRadius: 99, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: sel ? c : 'transparent' }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
                        {sel ? <Check size={16} color="#FFFFFF" strokeWidth={3.4} /> : null}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Ismétlődés */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">ISMÉTLŐDÉS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {RECURRENCE_OPTIONS.map((opt) => {
                  const active = !customOpen && freq === opt.key
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => selectPreset(opt.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Ismétlődés: ${opt.label}`}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
                        borderRadius: 99, borderWidth: 1.5,
                        borderColor: active ? colors.primary : fieldBorder,
                        backgroundColor: active ? 'rgba(20,184,166,0.12)' : fieldBg,
                      }}
                    >
                      {opt.key !== 'none' ? (
                        <Repeat size={14} color={active ? colors.primary : colors.muted} strokeWidth={2.2} />
                      ) : null}
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: active ? colors.primary : colors.muted }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}

                {/* Egyéni intervallum (pl. 6 hetes műszakciklus) */}
                <Pressable
                  onPress={openCustom}
                  accessibilityRole="button"
                  accessibilityState={{ selected: customOpen }}
                  accessibilityLabel="Egyéni ismétlődés"
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
                    borderRadius: 99, borderWidth: 1.5,
                    borderColor: customOpen ? colors.primary : fieldBorder,
                    backgroundColor: customOpen ? 'rgba(20,184,166,0.12)' : fieldBg,
                  }}
                >
                  <Repeat size={14} color={customOpen ? colors.primary : colors.muted} strokeWidth={2.2} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: customOpen ? colors.primary : colors.muted }}>
                    Egyéni
                  </Text>
                </Pressable>
              </View>

              {/* Egyéni szerkesztő: „minden N nap/hét/hónap/év" */}
              {customOpen ? (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 14.5, fontWeight: '700' }}>
                      Minden
                    </Text>
                    <TextInput
                      value={customInterval}
                      onChangeText={(t) => setCustomInterval(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                      accessibilityLabel="Ismétlődés intervalluma"
                      style={{ width: 64, textAlign: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, fontSize: 16, fontWeight: '800', backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }}
                    />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {RECURRENCE_UNITS.map((u) => {
                        const active = freq === u.key
                        return (
                          <Pressable
                            key={u.key}
                            onPress={() => setFreq(u.key)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`Egység: ${u.label}`}
                            style={{
                              height: 38, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                              borderWidth: 1.5,
                              borderColor: active ? colors.primary : fieldBorder,
                              backgroundColor: active ? 'rgba(20,184,166,0.12)' : fieldBg,
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '800', color: active ? colors.primary : colors.muted }}>{u.label}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                  {customPreview ? (
                    <Text className="text-muted" style={{ marginTop: 8, fontSize: 12.5, fontWeight: '700' }}>
                      Ismétlődik: {customPreview} · a kezdő dátumtól
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {freq !== 'none' ? (
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 14.5, fontWeight: '700' }}>
                    Ismétlődés vége
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => setUntil(null)}
                      accessibilityLabel="Soha nem ér véget"
                      style={[styles.pill, { backgroundColor: until === null ? 'rgba(20,184,166,0.12)' : dark ? colors.darkBackground : '#F4F2ED' }]}
                    >
                      <Text style={[styles.pillText, { color: until === null ? colors.primary : fg }]}>Soha</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPicker({ field: 'until', mode: 'date' })}
                      accessibilityLabel="Ismétlődés vég-dátuma"
                      style={[styles.pill, { backgroundColor: until !== null ? 'rgba(20,184,166,0.12)' : dark ? colors.darkBackground : '#F4F2ED' }]}
                    >
                      <Text style={[styles.pillText, { color: until !== null ? colors.primary : fg }]}>
                        {until ? shortDateLabel(until) : 'Dátum'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Hely */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">HELY · opcionális</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Hol lesz?"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
              />
            </View>

            {/* Jegyzet */}
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label} className="text-muted">JEGYZET · opcionális</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Megjegyzés, emlékeztető…"
                placeholderTextColor="#C2C6C4"
                multiline
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, minHeight: 88, fontSize: 15.5, fontWeight: '600', textAlignVertical: 'top' }]}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: fieldBorder, gap: 10 }} className="bg-background dark:bg-dark-background">
            {isEdit ? (
              <Pressable onPress={handleDelete} accessibilityLabel="Esemény törlése" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 9 }}>
                <Trash2 size={17} color={colors.destructive} strokeWidth={2} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.destructive, letterSpacing: -0.2 }}>Esemény törlése</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSave}
              disabled={!title.trim()}
              accessibilityLabel="Mentés"
              style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: colors.primary, opacity: title.trim() ? 1 : 0.5 }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>Mentés</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        visible={picker !== null}
        mode={picker?.mode ?? 'date'}
        value={picker?.field === 'end' ? end : picker?.field === 'until' ? (until ?? end) : start}
        accent={color}
        onConfirm={applyPicked}
        onClose={() => setPicker(null)}
      />

      <MemberEditorSheet visible={membersOpen} onClose={() => setMembersOpen(false)} />
    </Modal>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginLeft: 2, marginBottom: 7 },
  input: { width: '100%', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  rowCard: { borderWidth: 1.5, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  whenCard: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden' },
  whenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  pill: { borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8 },
  pillText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
})
