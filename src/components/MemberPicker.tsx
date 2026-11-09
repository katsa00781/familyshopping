import { useState } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'
import { Users, UsersRound } from 'lucide-react-native'

import { MemberEditorSheet } from '@/components/etrend/MemberEditorSheet'
import { useMemberStore } from '@/store/memberStore'
import { colors } from '@/constants/colors'
import type { FamilyMemberLocal } from '@/types'

interface MemberPickerProps {
  /** Kiválasztott tag id-ja; null = „Közös". */
  value: string | null
  onSelect: (member: FamilyMemberLocal | null) => void
  /** A „Közös" pill akadálymentes címkéje (pl. „Közös esemény"). */
  commonAccessibilityLabel: string
}

/**
 * KINEK – családtag-választó pill-sor: „Közös" + a háztartás tagjai (tagszínnel) +
 * „Tagok" (taglista szerkesztése). A naptár-esemény és a feladat szerkesztő közös eleme.
 */
export function MemberPicker({ value, onSelect, commonAccessibilityLabel }: MemberPickerProps) {
  const dark = useColorScheme() === 'dark'
  const members = useMemberStore((s) => s.members)
  const [membersOpen, setMembersOpen] = useState(false)

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        accessibilityLabel={commonAccessibilityLabel}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingLeft: 8, paddingRight: 14,
          borderRadius: 99, borderWidth: 1.5,
          borderColor: value === null ? colors.muted : fieldBorder,
          backgroundColor: value === null ? `${colors.muted}1A` : fieldBg,
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}>
          <Users size={12} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.muted }}>Közös</Text>
      </Pressable>

      {members.map((m) => {
        const active = value === m.id
        return (
          <Pressable
            key={m.id}
            onPress={() => onSelect(m)}
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

      <MemberEditorSheet visible={membersOpen} onClose={() => setMembersOpen(false)} />
    </View>
  )
}
