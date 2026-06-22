import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { CalendarClock, ChevronLeft, Minus, Plus, Trash2, Users } from 'lucide-react-native'

import { DateTimePickerModal } from '@/components/naptar/DateTimePickerModal'
import { useShiftStore } from '@/store/shiftStore'
import { useMemberStore } from '@/store/memberStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useToastStore } from '@/store/toastStore'
import { dayKey, shortDateLabel, weekdayHeaders } from '@/lib/calendar'
import {
  buildShiftEvents,
  dateToMinutes,
  minutesToLabel,
  mondayOf,
  parseLocalDate,
  resizeDays,
} from '@/lib/shifts'
import { haptics } from '@/lib/haptics'
import { colors } from '@/constants/colors'
import type { ShiftSchedule, ShiftType } from '@/types'

type Picker =
  | { kind: 'time'; typeId: string; field: 'start' | 'end' }
  | { kind: 'anchor' }
  | null

export default function MuszakScreen() {
  const dark = useColorScheme() === 'dark'

  const shiftTypes = useShiftStore((s) => s.shiftTypes)
  const schedule = useShiftStore((s) => s.schedule)
  const loadShifts = useShiftStore((s) => s.loadShifts)
  const setSchedule = useShiftStore((s) => s.setSchedule)
  const addShiftType = useShiftStore((s) => s.addShiftType)
  const updateShiftType = useShiftStore((s) => s.updateShiftType)
  const removeShiftType = useShiftStore((s) => s.removeShiftType)

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const createEventsWithIds = useCalendarStore((s) => s.createEventsWithIds)
  const deleteEvents = useCalendarStore((s) => s.deleteEvents)
  const showToast = useToastStore((s) => s.showToast)

  // null = még nincs kiválasztott ecset (induláskor az első műszaktípusra állítjuk);
  // 'erase' = a felhasználó tudatos „Pihenő" választása (NEM írható felül automatikusan).
  const [brush, setBrush] = useState<string | 'erase' | null>(null)
  const [picker, setPicker] = useState<Picker>(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    void loadShifts()
    void loadMembers()
  }, [loadShifts, loadMembers])

  // Csak az induló ecsetet állítjuk be egyszer (amikor még nincs kiválasztva).
  // A 'erase' (Pihenő) tudatos választást NEM írjuk felül.
  useEffect(() => {
    if (brush === null && shiftTypes.length > 0) setBrush(shiftTypes[0]!.id)
  }, [shiftTypes, brush])

  const typeById = useMemo(() => new Map(shiftTypes.map((t) => [t.id, t])), [shiftTypes])

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground

  if (!schedule) {
    return <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']} />
  }

  const assignedCount = schedule.days.filter((d) => d !== null).length
  const hasGenerated = schedule.generatedEventIds.length > 0

  function patchSchedule(patch: Partial<ShiftSchedule>) {
    setSchedule({ ...schedule!, ...patch })
  }

  function setCycleWeeks(delta: number) {
    const next = Math.min(12, Math.max(1, schedule!.cycleWeeks + delta))
    if (next === schedule!.cycleWeeks) return
    haptics.selection()
    patchSchedule({ cycleWeeks: next, days: resizeDays(schedule!.days, next) })
  }

  function paintCell(index: number) {
    haptics.selection()
    const next = [...schedule!.days]
    next[index] = brush === 'erase' || brush === null ? null : brush
    patchSchedule({ days: next })
  }

  function applyPicked(value: Date) {
    if (!picker) return
    if (picker.kind === 'anchor') {
      patchSchedule({ anchorDate: dayKey(mondayOf(value)) })
    } else {
      const minutes = dateToMinutes(value)
      updateShiftType(picker.typeId, picker.field === 'start' ? { startMinutes: minutes } : { endMinutes: minutes })
    }
    setPicker(null)
  }

  function handleAddType() {
    const name = newTypeName.trim()
    if (!name) return
    haptics.light()
    addShiftType(name)
    setNewTypeName('')
  }

  function confirmRemoveType(t: ShiftType) {
    Alert.alert('Műszaktípus törlése', `Biztosan törlöd: „${t.name}"? A beosztásból is kikerül.`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => { haptics.light(); removeShiftType(t.id) } },
    ])
  }

  async function generate() {
    if (assignedCount === 0) {
      showToast('Oszts ki legalább egy műszakot a beosztásban.', 'error')
      return
    }
    setGenerating(true)
    try {
      if (schedule!.generatedEventIds.length > 0) {
        await deleteEvents(schedule!.generatedEventIds)
      }
      const inputs = buildShiftEvents(schedule!, shiftTypes)
      const ids = await createEventsWithIds(inputs)
      patchSchedule({ generatedEventIds: ids })
      haptics.success()
      showToast(`Beosztás létrehozva · ${ids.length} műszak`, 'success')
    } catch {
      haptics.error()
      showToast('A beosztás generálása nem sikerült.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  function confirmDeleteSchedule() {
    Alert.alert('Beosztás törlése', 'Biztosan törlöd a generált műszakeseményeket a naptárból? A sablon megmarad.', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          await deleteEvents(schedule!.generatedEventIds)
          patchSchedule({ generatedEventIds: [] })
          haptics.warning()
          showToast('Generált műszakok törölve.', 'info')
        },
      },
    ])
  }

  const anchorDate = parseLocalDate(schedule.anchorDate)

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {/* Fejléc */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Vissza" hitSlop={8} className="bg-card dark:bg-dark-card" style={{ width: 38, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={22} color={fg} strokeWidth={2.4} />
        </Pressable>
        <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
          Műszakbeosztás
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Műszaktípusok */}
        <SectionLabel>MŰSZAKTÍPUSOK</SectionLabel>
        <View style={{ gap: 8 }}>
          {shiftTypes.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 10, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
              <Pressable
                onPress={() => { haptics.selection(); updateShiftType(t.id, { color: nextColor(t.color) }) }}
                accessibilityLabel={`${t.name} színének váltása`}
                hitSlop={6}
                style={{ width: 30, height: 30, borderRadius: 99, backgroundColor: t.color }}
              />
              <TextInput
                value={t.name}
                onChangeText={(v) => updateShiftType(t.id, { name: v })}
                placeholder="Műszak neve"
                placeholderTextColor="#C2C6C4"
                style={{ flex: 1, color: fg, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2, paddingVertical: 4 }}
              />
              <Pressable onPress={() => setPicker({ kind: 'time', typeId: t.id, field: 'start' })} style={[timePill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                <Text style={[timePillText, { color: fg }]}>{minutesToLabel(t.startMinutes)}</Text>
              </Pressable>
              <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>–</Text>
              <Pressable onPress={() => setPicker({ kind: 'time', typeId: t.id, field: 'end' })} style={[timePill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }]}>
                <Text style={[timePillText, { color: fg }]}>{minutesToLabel(t.endMinutes)}</Text>
              </Pressable>
              <Pressable onPress={() => confirmRemoveType(t)} accessibilityLabel={`${t.name} törlése`} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} color={colors.muted} strokeWidth={2} />
              </Pressable>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <TextInput
              value={newTypeName}
              onChangeText={setNewTypeName}
              onSubmitEditing={handleAddType}
              placeholder="Új műszaktípus…"
              placeholderTextColor="#C2C6C4"
              returnKeyType="done"
              style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg, color: fg, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' }}
            />
            <Pressable onPress={handleAddType} disabled={!newTypeName.trim()} accessibilityLabel="Műszaktípus hozzáadása" style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: newTypeName.trim() ? 1 : 0.5 }}>
              <Plus size={22} color={colors.primaryForeground} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        {/* Ciklus beállítások */}
        <SectionLabel>CIKLUS</SectionLabel>
        <View style={{ gap: 12, borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 15, fontWeight: '700' }}>Ciklus hossza</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable onPress={() => setCycleWeeks(-1)} accessibilityLabel="Kevesebb hét" style={stepBtn(dark)}>
                <Minus size={18} color={fg} strokeWidth={2.6} />
              </Pressable>
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 17, fontWeight: '800', minWidth: 56, textAlign: 'center' }}>
                {schedule.cycleWeeks} hét
              </Text>
              <Pressable onPress={() => setCycleWeeks(1)} accessibilityLabel="Több hét" style={stepBtn(dark)}>
                <Plus size={18} color={fg} strokeWidth={2.6} />
              </Pressable>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: fieldBorder }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 15, fontWeight: '700' }}>Ciklus kezdete (hétfő)</Text>
            <Pressable onPress={() => setPicker({ kind: 'anchor' })} style={[timePill, { backgroundColor: dark ? colors.darkBackground : '#F4F2ED', paddingHorizontal: 14 }]}>
              <Text style={[timePillText, { color: colors.primary }]}>{shortDateLabel(anchorDate)}</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: fieldBorder }} />

          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 15, fontWeight: '700' }}>Kihez tartozik</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MemberChip label="Közös" color={colors.muted} active={schedule.memberId === null} icon onPress={() => patchSchedule({ memberId: null })} dark={dark} />
            {members.map((m) => (
              <MemberChip key={m.id} label={m.name} color={m.color} active={schedule.memberId === m.id} onPress={() => patchSchedule({ memberId: m.id })} dark={dark} />
            ))}
          </View>
        </View>

        {/* Beosztás rács */}
        <SectionLabel>BEOSZTÁS</SectionLabel>
        <Text className="text-muted" style={{ fontSize: 12.5, fontWeight: '600', marginBottom: 10, marginTop: -4 }}>
          Válassz egy műszakot, majd koppints a napokra. A „Pihenő” törli a kiosztást.
        </Text>

        {/* Ecset-választó (legenda) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {shiftTypes.map((t) => {
            const active = brush === t.id
            return (
              <Pressable
                key={t.id}
                onPress={() => setBrush(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Ecset: ${t.name}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 8, paddingRight: 13, borderRadius: 99, borderWidth: 1.5, borderColor: active ? t.color : fieldBorder, backgroundColor: active ? `${t.color}1A` : fieldBg }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: t.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>{startHour(t)}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: active ? t.color : colors.muted }}>{t.name}</Text>
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => setBrush('erase')}
            accessibilityRole="button"
            accessibilityState={{ selected: brush === 'erase' }}
            accessibilityLabel="Ecset: Pihenő"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1.5, borderStyle: 'dashed', borderColor: brush === 'erase' ? colors.foreground : fieldBorder, backgroundColor: fieldBg }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: brush === 'erase' ? fg : colors.muted }}>Pihenő</Text>
          </Pressable>
        </View>

        {/* Hét fejléc */}
        <View style={{ flexDirection: 'row', marginBottom: 6, paddingLeft: 34 }}>
          {weekdayHeaders.map((w, i) => (
            <View key={w} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '800' }} className={i === 6 ? 'text-accent' : 'text-muted'}>{w}</Text>
            </View>
          ))}
        </View>

        {/* Rács sorai */}
        {Array.from({ length: schedule.cycleWeeks }, (_, w) => (
          <View key={w} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text className="text-muted" style={{ width: 34, fontSize: 11, fontWeight: '800' }}>{w + 1}.</Text>
            {Array.from({ length: 7 }, (_, d) => {
              const index = w * 7 + d
              const typeId = schedule.days[index]
              const t = typeId ? typeById.get(typeId) : null
              return (
                <Pressable
                  key={d}
                  onPress={() => paintCell(index)}
                  accessibilityLabel={`${w + 1}. hét ${weekdayHeaders[d]} ${t ? t.name : 'pihenő'}`}
                  style={{ flex: 1, aspectRatio: 1, padding: 3 }}
                >
                  <View
                    style={{
                      flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: t ? t.color : fieldBg,
                      borderWidth: t ? 0 : 1.5,
                      borderColor: fieldBorder,
                    }}
                  >
                    {t ? (
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{startHour(t)}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: fieldBorder, gap: 10 }} className="bg-background dark:bg-dark-background">
        {hasGenerated ? (
          <Pressable onPress={confirmDeleteSchedule} accessibilityLabel="Generált műszakok törlése" style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.destructive }}>Generált műszakok törlése</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={generate}
          disabled={generating}
          accessibilityLabel={hasGenerated ? 'Beosztás frissítése' : 'Beosztás generálása'}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 18, paddingVertical: 17, backgroundColor: colors.primary, opacity: generating ? 0.6 : 1 }}
        >
          <CalendarClock size={20} color={colors.primaryForeground} strokeWidth={2.2} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>
            {generating ? 'Generálás…' : hasGenerated ? `Beosztás frissítése (${assignedCount})` : `Beosztás generálása (${assignedCount})`}
          </Text>
        </Pressable>
      </View>

      <DateTimePickerModal
        visible={picker !== null}
        mode={picker?.kind === 'anchor' ? 'date' : 'time'}
        value={pickerValue(picker, typeById, anchorDate)}
        accent={colors.primary}
        onConfirm={applyPicked}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  )
}

// ─── Segédek ──────────────────────────────────────────────────────────────────
function startHour(t: ShiftType): string {
  return String(Math.floor(t.startMinutes / 60)).padStart(2, '0')
}

function nextColor(current: string): string {
  const palette = ['#14B8A6', '#FB7185', '#A78BFA', '#F59E0B', '#38BDF8', '#34D399']
  const idx = palette.indexOf(current)
  return palette[(idx + 1) % palette.length]!
}

function pickerValue(picker: Picker, typeById: Map<string, ShiftType>, anchorDate: Date): Date {
  const base = new Date()
  if (!picker) return base
  if (picker.kind === 'anchor') return anchorDate
  const t = typeById.get(picker.typeId)
  const minutes = t ? (picker.field === 'start' ? t.startMinutes : t.endMinutes) : 0
  base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return base
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-muted" style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginTop: 22, marginBottom: 10 }}>
      {children}
    </Text>
  )
}

function stepBtn(dark: boolean) {
  return {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: dark ? colors.darkBackground : '#F4F2ED',
  }
}

function MemberChip({ label, color, active, onPress, dark, icon }: { label: string; color: string; active: boolean; onPress: () => void; dark: boolean; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} kiválasztása`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 8, paddingRight: 13, borderRadius: 99, borderWidth: 1.5, borderColor: active ? color : dark ? colors.darkBorder : colors.border, backgroundColor: active ? `${color}1A` : dark ? colors.darkCard : colors.card }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
        {icon ? <Users size={11} color="#FFFFFF" strokeWidth={2.4} /> : <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{label.charAt(0).toUpperCase()}</Text>}
      </View>
      <Text style={{ fontSize: 13, fontWeight: '800', color: active ? color : colors.muted }}>{label}</Text>
    </Pressable>
  )
}

const timePill: ViewStyle = { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }
const timePillText: TextStyle = { fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 }
