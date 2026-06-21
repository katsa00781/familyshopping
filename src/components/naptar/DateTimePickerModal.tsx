import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

import { buildMonthMatrix, monthTitle, weekdayHeaders } from '@/lib/calendar'
import { colors } from '@/constants/colors'

interface DateTimePickerModalProps {
  visible: boolean
  mode: 'date' | 'time'
  value: Date
  accent: string
  onConfirm: (value: Date) => void
  onClose: () => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 00,05,…,55

export function DateTimePickerModal({
  visible,
  mode,
  value,
  accent,
  onConfirm,
  onClose,
}: DateTimePickerModalProps) {
  const dark = useColorScheme() === 'dark'
  const fg = dark ? colors.darkForeground : colors.foreground

  // Dátum-mód: épp megjelenített hónap
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())
  // Idő-mód: kiválasztott óra/perc
  const [hour, setHour] = useState(value.getHours())
  const [minute, setMinute] = useState(Math.round(value.getMinutes() / 5) * 5 % 60)

  useEffect(() => {
    if (!visible) return
    setViewYear(value.getFullYear())
    setViewMonth(value.getMonth())
    setHour(value.getHours())
    setMinute((Math.round(value.getMinutes() / 5) * 5) % 60)
  }, [visible, value])

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function confirmTime() {
    const d = new Date(value)
    d.setHours(hour, minute, 0, 0)
    onConfirm(d)
  }

  const selectedKey = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} className="bg-black/40">
        <Pressable
          onPress={() => {}}
          className="bg-card dark:bg-dark-card"
          style={{ width: 320, borderRadius: 24, padding: 18 }}
        >
          {mode === 'date' ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Előző hónap">
                  <ChevronLeft size={22} color={fg} strokeWidth={2.4} />
                </Pressable>
                <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 17, fontWeight: '800' }}>
                  {monthTitle(viewYear, viewMonth)}
                </Text>
                <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Következő hónap">
                  <ChevronRight size={22} color={fg} strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {weekdayHeaders.map((w, i) => (
                  <View key={w} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800' }} className={i === 6 ? 'text-accent' : 'text-muted'}>
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {buildMonthMatrix(viewYear, viewMonth).map((d) => {
                  const selected = d.key === selectedKey
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => onConfirm(new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate(), value.getHours(), value.getMinutes()))}
                      style={{ width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 99,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? accent : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14.5,
                            fontWeight: selected ? '800' : '700',
                            color: selected ? '#FFFFFF' : !d.inMonth ? '#C7CAC8' : fg,
                          }}
                        >
                          {d.day}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-muted" style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 }}>
                Óra
              </Text>
              <ScrollView style={{ maxHeight: 132 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {HOURS.map((h) => {
                    const sel = h === hour
                    return (
                      <Pressable key={h} onPress={() => setHour(h)} style={{ width: `${100 / 6}%`, padding: 4 }}>
                        <View style={{ borderRadius: 11, paddingVertical: 8, alignItems: 'center', backgroundColor: sel ? accent : dark ? colors.darkBorder : '#F4F2ED' }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], color: sel ? '#FFFFFF' : fg }}>
                            {String(h).padStart(2, '0')}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              </ScrollView>

              <Text className="text-muted" style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>
                Perc
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {MINUTES.map((m) => {
                  const sel = m === minute
                  return (
                    <Pressable key={m} onPress={() => setMinute(m)} style={{ width: `${100 / 6}%`, padding: 4 }}>
                      <View style={{ borderRadius: 11, paddingVertical: 8, alignItems: 'center', backgroundColor: sel ? accent : dark ? colors.darkBorder : '#F4F2ED' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], color: sel ? '#FFFFFF' : fg }}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>

              <Pressable
                onPress={confirmTime}
                accessibilityLabel="Időpont megerősítése"
                style={{ marginTop: 16, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primaryForeground }}>Kész</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
