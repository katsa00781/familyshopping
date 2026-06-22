import { useEffect, useState } from 'react'
import {
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
import { Plus, Trash2, X } from 'lucide-react-native'

import { useMemberStore } from '@/store/memberStore'
import { haptics } from '@/lib/haptics'
import { colors, memberColors } from '@/constants/colors'

interface MemberEditorSheetProps {
  visible: boolean
  onClose: () => void
}

export function MemberEditorSheet({ visible, onClose }: MemberEditorSheetProps) {
  const dark = useColorScheme() === 'dark'

  const members = useMemberStore((s) => s.members)
  const addMember = useMemberStore((s) => s.addMember)
  const updateMember = useMemberStore((s) => s.updateMember)
  const removeMember = useMemberStore((s) => s.removeMember)

  const [newName, setNewName] = useState('')

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
    if (visible) setNewName('')
  }, [visible, translateY])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground

  function cycleColor(id: string, current: string) {
    const idx = memberColors.indexOf(current as (typeof memberColors)[number])
    const next = memberColors[(idx + 1) % memberColors.length]!
    haptics.selection()
    updateMember(id, { color: next })
  }

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    haptics.light()
    addMember(name)
    setNewName('')
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ maxHeight: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>
              Családtagok
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>
          <Text className="text-muted" style={{ paddingHorizontal: 18, paddingBottom: 12, fontSize: 13, fontWeight: '600' }}>
            A tagokat az étrend tételeihez rendelheted. A színkörre koppintva válts színt.
          </Text>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8, gap: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {members.map((m) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 8, paddingRight: 8, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
                <Pressable
                  onPress={() => cycleColor(m.id, m.color)}
                  accessibilityLabel={`${m.name} színének váltása`}
                  hitSlop={6}
                  style={{ width: 34, height: 34, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: m.color }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </Pressable>
                <TextInput
                  value={m.name}
                  onChangeText={(t) => updateMember(m.id, { name: t })}
                  placeholder="Név"
                  placeholderTextColor="#C2C6C4"
                  style={{ flex: 1, color: fg, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2, paddingVertical: 6 }}
                />
                <Pressable
                  onPress={() => {
                    haptics.light()
                    removeMember(m.id)
                  }}
                  accessibilityLabel={`${m.name} eltávolítása`}
                  hitSlop={6}
                  style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBackground : '#F4F2ED' }}
                >
                  <Trash2 size={16} color={colors.muted} strokeWidth={2} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Új tag */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: fieldBorder, flexDirection: 'row', alignItems: 'center', gap: 10 }} className="bg-background dark:bg-dark-background">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleAdd}
              placeholder="Új tag neve…"
              placeholderTextColor="#C2C6C4"
              returnKeyType="done"
              style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg, color: fg, paddingHorizontal: 14, fontSize: 15.5, fontWeight: '700' }}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!newName.trim()}
              accessibilityLabel="Tag hozzáadása"
              style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }}
            >
              <Plus size={22} color={colors.primaryForeground} strokeWidth={2.6} />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
