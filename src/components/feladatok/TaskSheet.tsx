import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import * as ImagePicker from 'expo-image-picker'
import { CalendarClock, Camera, ImagePlus, Repeat, Trash2, X } from 'lucide-react-native'

import { DateTimePickerModal } from '@/components/naptar/DateTimePickerModal'
import { MemberPicker } from '@/components/MemberPicker'
import { TaskPhoto } from './TaskPhoto'
import {
  RECURRENCE_OPTIONS,
  RECURRENCE_UNITS,
  buildRRule,
  combineDateTime,
  freqFromRRule,
  intervalFromRRule,
  minutesOfDay,
  recurrenceLabel,
  shortDateLabel,
  type RecurrenceFreq,
} from '@/lib/calendar'
import { useToastStore } from '@/store/toastStore'
import type { TaskPhotoChange } from '@/store/taskStore'
import { colors } from '@/constants/colors'
import type { FamilyTask, FamilyTaskInput } from '@/types'

export type TaskSheetInput = Omit<FamilyTaskInput, 'photo_path'>

interface TaskSheetProps {
  visible: boolean
  task: FamilyTask | null // null = új feladat
  /** Feltöltés alatt álló helyi fotó a szerkesztett feladathoz. */
  pendingPhotoUri: string | null
  onClose: () => void
  onSave: (input: TaskSheetInput, photo: TaskPhotoChange, id: string | null) => void
  onDelete: (id: string) => void
}

/** A fotó szerkesztés közbeni állapota: marad / nincs / új helyi kép. */
type PhotoState = { kind: 'keep' } | { kind: 'none' } | { kind: 'new'; uri: string }

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  allowsEditing: false,
}

function timeLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parseInterval(raw: string): number {
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function defaultDueTime(): Date {
  const d = new Date()
  d.setHours(18, 0, 0, 0)
  return d
}

export function TaskSheet({ visible, task, pendingPhotoUri, onClose, onSave, onDelete }: TaskSheetProps) {
  const dark = useColorScheme() === 'dark'
  const isEdit = task !== null
  const showToast = useToastStore((s) => s.showToast)

  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [hasDue, setHasDue] = useState(false)
  const [dueDate, setDueDate] = useState(new Date())
  const [hasTime, setHasTime] = useState(false)
  const [dueTime, setDueTime] = useState(defaultDueTime())
  const [freq, setFreq] = useState<RecurrenceFreq>('none')
  const [customOpen, setCustomOpen] = useState(false)
  const [customInterval, setCustomInterval] = useState('2')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<PhotoState>({ kind: 'none' })
  const [picker, setPicker] = useState<'date' | 'time' | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
  }, [visible, translateY])
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  // Mezők feltöltése nyitáskor
  useEffect(() => {
    if (!visible) return
    if (task) {
      setTitle(task.title)
      setAssigneeId(task.assignee_id)
      setHasDue(task.due_at !== null)
      const due = task.due_at ? new Date(task.due_at) : new Date()
      setDueDate(due)
      setHasTime(task.due_has_time)
      setDueTime(task.due_has_time ? due : defaultDueTime())
      const f = freqFromRRule(task.rrule)
      const iv = intervalFromRRule(task.rrule)
      setFreq(f)
      setCustomOpen(f !== 'none' && iv > 1)
      setCustomInterval(String(iv > 1 ? iv : 2))
      setNotes(task.notes ?? '')
      setPhoto(task.photo_path || pendingPhotoUri ? { kind: 'keep' } : { kind: 'none' })
    } else {
      setTitle('')
      setAssigneeId(null)
      setHasDue(false)
      setDueDate(new Date())
      setHasTime(false)
      setDueTime(defaultDueTime())
      setFreq('none')
      setCustomOpen(false)
      setCustomInterval('2')
      setNotes('')
      setPhoto({ kind: 'none' })
    }
    setViewerOpen(false)
    // A pendingPhotoUri változása (feltöltés vége) ne írja felül a szerkesztett mezőket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, task?.id])

  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return
    const input: TaskSheetInput = {
      title: trimmed,
      notes: notes.trim() || null,
      assignee_id: assigneeId,
      due_at: hasDue ? combineDateTime(dueDate, hasTime ? minutesOfDay(dueTime.toISOString()) : 0) : null,
      due_has_time: hasDue && hasTime,
      // Ismétlődés csak határidővel értelmes (a következő alkalom a határidőből lép).
      rrule: hasDue ? buildRRule(freq, customOpen ? parseInterval(customInterval) : 1, null) : null,
    }
    const photoChange: TaskPhotoChange =
      photo.kind === 'new' ? photo.uri : photo.kind === 'none' && task?.photo_path ? null : undefined
    onSave(input, photoChange, task?.id ?? null)
    onClose()
  }

  function handleDelete() {
    if (!task) return
    Alert.alert('Feladat törlése', `Biztosan törlöd: „${task.title}"?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => { onDelete(task.id); onClose() } },
    ])
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Kamera-hozzáférés szükséges', 'A fotó készítéséhez engedélyezd a kamerát a Beállításokban.', [
        { text: 'Mégse', style: 'cancel' },
        { text: 'Beállítások', onPress: () => void Linking.openSettings() },
      ])
      return
    }
    try {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      const asset = result.canceled ? null : result.assets[0]
      if (asset) setPhoto({ kind: 'new', uri: asset.uri })
    } catch {
      showToast('A kamera nem érhető el', 'error')
    }
  }

  async function pickFromLibrary() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
      const asset = result.canceled ? null : result.assets[0]
      if (asset) setPhoto({ kind: 'new', uri: asset.uri })
    } catch {
      showToast('A galéria nem érhető el', 'error')
    }
  }

  function selectPreset(key: RecurrenceFreq) {
    setFreq(key)
    setCustomOpen(false)
  }

  function openCustom() {
    setCustomOpen(true)
    if (freq === 'none') setFreq('weekly')
  }

  // Élő előnézet az egyéni ismétlődésről („3 hetente").
  const customPreview =
    customOpen && freq !== 'none' ? recurrenceLabel(buildRRule(freq, parseInterval(customInterval), null)) : null

  function applyPicked(value: Date) {
    if (picker === 'date') setDueDate(value)
    else {
      setDueTime(value)
      setHasTime(true)
    }
    setPicker(null)
  }

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground
  const pillBg = dark ? colors.darkBackground : '#F4F2ED'

  const photoLocalUri = photo.kind === 'new' ? photo.uri : photo.kind === 'keep' ? pendingPhotoUri : null
  const photoPath = photo.kind === 'keep' ? (task?.photo_path ?? null) : null
  const showPhoto = photo.kind !== 'none'

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} accessibilityLabel="Bezárás" />

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
              {isEdit ? 'Feladat szerkesztése' : 'Új feladat'}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mit kell csinálni */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">MIT KELL CSINÁLNI</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Pl. Szemetet levinni"
                placeholderTextColor="#C2C6C4"
                accessibilityLabel="Feladat"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }]}
              />
            </View>

            {/* Kinek a dolga */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">KINEK A DOLGA</Text>
              <MemberPicker
                value={assigneeId}
                onSelect={(m) => setAssigneeId(m?.id ?? null)}
                commonAccessibilityLabel="Közös feladat"
              />
            </View>

            {/* Határidő */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">HATÁRIDŐ · opcionális</Text>
              <View style={[styles.whenCard, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                <View style={styles.whenRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.12)' }}>
                      <CalendarClock size={20} color={colors.primary} strokeWidth={1.9} />
                    </View>
                    <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
                      Van határidő
                    </Text>
                  </View>
                  <Switch
                    value={hasDue}
                    onValueChange={setHasDue}
                    accessibilityLabel="Határidő megadása"
                    trackColor={{ true: colors.primary, false: '#D8D4CB' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {hasDue ? (
                  <>
                    <View style={[styles.whenRow, { borderTopWidth: 1.5, borderTopColor: fieldBorder }]}>
                      <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                        Dátum
                      </Text>
                      <Pressable onPress={() => setPicker('date')} accessibilityLabel="Határidő dátuma" style={[styles.pill, { backgroundColor: pillBg }]}>
                        <Text style={[styles.pillText, { color: fg }]}>{shortDateLabel(dueDate)}</Text>
                      </Pressable>
                    </View>
                    <View style={[styles.whenRow, { borderTopWidth: 1.5, borderTopColor: fieldBorder }]}>
                      <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '700' }}>
                        Időpont
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setHasTime(false)}
                          accessibilityLabel="Időpont nélkül"
                          accessibilityState={{ selected: !hasTime }}
                          style={[styles.pill, { backgroundColor: !hasTime ? 'rgba(20,184,166,0.12)' : pillBg }]}
                        >
                          <Text style={[styles.pillText, { color: !hasTime ? colors.primary : fg }]}>Nincs</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setPicker('time')}
                          accessibilityLabel="Határidő időpontja"
                          accessibilityState={{ selected: hasTime }}
                          style={[styles.pill, { backgroundColor: hasTime ? 'rgba(20,184,166,0.12)' : pillBg }]}
                        >
                          <Text style={[styles.pillText, { color: hasTime ? colors.primary : fg }]}>
                            {hasTime ? timeLabel(dueTime) : 'Idő'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
              {hasDue ? (
                <Text className="text-muted" style={{ marginTop: 7, marginLeft: 2, fontSize: 12.5, fontWeight: '700' }}>
                  {hasTime ? 'Emlékeztető a határidő időpontjában.' : 'Emlékeztető aznap 8:00-kor.'}
                </Text>
              ) : null}
            </View>

            {/* Ismétlődés – csak határidővel (kipipáláskor a határidő a következő alkalomra lép) */}
            {hasDue ? (
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
                        style={[styles.choice, { borderColor: active ? colors.primary : fieldBorder, backgroundColor: active ? 'rgba(20,184,166,0.12)' : fieldBg }]}
                      >
                        {opt.key !== 'none' ? <Repeat size={14} color={active ? colors.primary : colors.muted} strokeWidth={2.2} /> : null}
                        <Text style={[styles.choiceText, { color: active ? colors.primary : colors.muted }]}>{opt.label}</Text>
                      </Pressable>
                    )
                  })}
                  <Pressable
                    onPress={openCustom}
                    accessibilityRole="button"
                    accessibilityState={{ selected: customOpen }}
                    accessibilityLabel="Egyéni ismétlődés"
                    style={[styles.choice, { borderColor: customOpen ? colors.primary : fieldBorder, backgroundColor: customOpen ? 'rgba(20,184,166,0.12)' : fieldBg }]}
                  >
                    <Repeat size={14} color={customOpen ? colors.primary : colors.muted} strokeWidth={2.2} />
                    <Text style={[styles.choiceText, { color: customOpen ? colors.primary : colors.muted }]}>Egyéni</Text>
                  </Pressable>
                </View>

                {/* Egyéni: „minden N nap/hét/hónap/év" */}
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
                                height: 38, paddingHorizontal: 13, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
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
                  </View>
                ) : null}

                {freq !== 'none' ? (
                  <Text className="text-muted" style={{ marginTop: 8, marginLeft: 2, fontSize: 12.5, fontWeight: '700' }}>
                    {customPreview ? `Ismétlődik: ${customPreview}. ` : ''}Kipipáláskor a határidő a következő alkalomra lép.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Fotó */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">FOTÓ · opcionális</Text>
              {showPhoto ? (
                <View style={{ gap: 10 }}>
                  <Pressable onPress={() => setViewerOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Fotó megnyitása teljes méretben">
                    <View style={{ height: 200, flexDirection: 'row' }}>
                      <TaskPhoto path={photoPath} localUri={photoLocalUri} size="fill" radius={16} />
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <PhotoButton label="Csere" icon="library" onPress={() => void pickFromLibrary()} bg={fieldBg} border={fieldBorder} fg={fg} />
                    <PhotoButton label="Eltávolítás" icon="remove" onPress={() => setPhoto({ kind: 'none' })} bg={fieldBg} border={fieldBorder} fg={colors.destructive} />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <PhotoButton label="Fotó készítése" icon="camera" onPress={() => void takePhoto()} bg={fieldBg} border={fieldBorder} fg={fg} />
                  <PhotoButton label="Galéria" icon="library" onPress={() => void pickFromLibrary()} bg={fieldBg} border={fieldBorder} fg={fg} />
                </View>
              )}
            </View>

            {/* Megjegyzés */}
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label} className="text-muted">MEGJEGYZÉS · opcionális</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Részletek, teendők…"
                placeholderTextColor="#C2C6C4"
                multiline
                accessibilityLabel="Megjegyzés"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, minHeight: 88, fontSize: 15.5, fontWeight: '600', textAlignVertical: 'top' }]}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: fieldBorder, gap: 10 }} className="bg-background dark:bg-dark-background">
            {isEdit ? (
              <Pressable onPress={handleDelete} accessibilityLabel="Feladat törlése" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 9 }}>
                <Trash2 size={17} color={colors.destructive} strokeWidth={2} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.destructive, letterSpacing: -0.2 }}>Feladat törlése</Text>
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
        mode={picker ?? 'date'}
        value={picker === 'time' ? dueTime : dueDate}
        accent={colors.primary}
        onConfirm={applyPicked}
        onClose={() => setPicker(null)}
      />

      {/* Teljes méretű fotó-nézet */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.boltBg, paddingTop: 64, paddingBottom: 40, paddingHorizontal: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <TaskPhoto path={photoPath} localUri={photoLocalUri} size="fill" radius={12} contentFit="contain" />
          </View>
          <Pressable
            onPress={() => setViewerOpen(false)}
            accessibilityLabel="Fotó bezárása"
            hitSlop={8}
            style={{ position: 'absolute', top: 56, right: 18, width: 40, height: 40, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.boltBorder }}
          >
            <X size={20} color={colors.darkForeground} strokeWidth={2.6} />
          </Pressable>
        </View>
      </Modal>
    </Modal>
  )
}

interface PhotoButtonProps {
  label: string
  icon: 'camera' | 'library' | 'remove'
  onPress: () => void
  bg: string
  border: string
  fg: string
}

function PhotoButton({ label, icon, onPress, bg, border, fg }: PhotoButtonProps) {
  const Icon = icon === 'camera' ? Camera : icon === 'library' ? ImagePlus : Trash2
  return (
    // Statikus style a Pressable-ön (a függvény-style `flex: 1`-e NativeWind alatt eldobódhat).
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: bg, borderColor: border }}>
        <Icon size={18} color={fg} strokeWidth={1.75} />
        <Text style={{ flexShrink: 1, fontSize: 15, fontWeight: '800', color: fg, letterSpacing: -0.2 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginLeft: 2, marginBottom: 7 },
  input: { width: '100%', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  whenCard: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden' },
  whenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 10, minHeight: 60 },
  pill: { borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5 },
  choiceText: { fontSize: 13.5, fontWeight: '800' },
  pillText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
})
