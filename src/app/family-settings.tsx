import { router } from 'expo-router'
import {
  ChevronLeft,
  Copy,
  MoreVertical,
  Pencil,
  RefreshCw,
  Share2,
  UserX,
} from 'lucide-react-native'
import { useEffect, useState } from 'react'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFamilyStore } from '@/store/familyStore'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import type { FamilyMember, FamilyRole } from '@/types'

const ROLE_LABELS: Record<FamilyRole, string> = {
  admin: 'Admin',
  member: 'Tag',
  viewer: 'Néző',
}

const ROLE_COLORS: Record<FamilyRole, { bg: string; text: string }> = {
  admin: { bg: '#DBEAFE', text: '#1E40AF' },
  member: { bg: '#DCFCE7', text: '#166534' },
  viewer: { bg: '#FEF3C7', text: '#92400E' },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function avatarColor(id: string): string {
  const colors = ['#2563EB', '#7C3AED', '#DB2777', '#D97706', '#059669', '#DC2626']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return colors[Math.abs(hash) % colors.length] ?? '#2563EB'
}

export default function FamilySettingsScreen() {
  const insets = useSafeAreaInsets()
  const dark = useColorScheme() === 'dark'
  const { family, isLoading, loadFamily, renameFamily, regenerateInvite, changeRole, removeMember } =
    useFamilyStore()
  const session = useAuthStore((s) => s.session)
  const showToast = useToastStore((s) => s.showToast)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    void loadFamily()
  }, [])

  const bg = dark ? '#111827' : '#F2F2F7'
  const card = dark ? '#1C1C1E' : '#FFFFFF'
  const text = dark ? '#FFFFFF' : '#000000'
  const muted = dark ? '#8E8E93' : '#6C6C70'
  const border = dark ? '#38383A' : '#C6C6C8'

  async function handleCopyLink() {
    if (!family?.inviteLink) return
    await Clipboard.setStringAsync(family.inviteLink)
    showToast('Meghívó link másolva', 'success')
  }

  async function handleShareLink() {
    if (!family?.inviteLink) return
    await Share.share({ message: `Csatlakozz a Bevásárló családunkhoz: ${family.inviteLink}` })
  }

  function handleRegenerate() {
    Alert.alert(
      'Új meghívó',
      'A régi link érvénytelenné válik. Biztosan generálsz újat?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Generálás',
          onPress: () => {
            void regenerateInvite()
            showToast('Új meghívó link generálva', 'success')
          },
        },
      ]
    )
  }

  function handleRenameFamily() {
    if (!family) return
    setNameInput(family.name)
    setEditingName(true)
  }

  function handleSaveName() {
    if (!nameInput.trim()) return
    void renameFamily(nameInput.trim())
    setEditingName(false)
  }

  function handleMemberMenu(member: FamilyMember) {
    const myId = session?.user.id
    const isSelf = member.id === myId
    const adminCount = family?.members.filter((m) => m.role === 'admin').length ?? 0
    const cantRemoveSelf = isSelf && member.role === 'admin' && adminCount <= 1

    if (Platform.OS === 'ios') {
      const options: string[] = ['Admin', 'Tag', 'Néző', 'Eltávolítás', 'Mégse']
      const destructiveIndex = cantRemoveSelf ? undefined : 3
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: 4 },
        (idx) => {
          if (idx === 0) void changeRole(member.id, 'admin')
          else if (idx === 1) void changeRole(member.id, 'member')
          else if (idx === 2) void changeRole(member.id, 'viewer')
          else if (idx === 3) {
            if (cantRemoveSelf) {
              Alert.alert('Nem törölhető', 'Te vagy az egyetlen admin. Előbb adjon admin szerepet egy másik tagnak.')
              return
            }
            Alert.alert('Eltávolítás', `Biztosan eltávolítod: ${member.name}?`, [
              { text: 'Mégse', style: 'cancel' },
              {
                text: 'Eltávolítás',
                style: 'destructive',
                onPress: () => void removeMember(member.id),
              },
            ])
          }
        }
      )
    } else {
      Alert.alert(member.name, 'Szerepkör módosítása', [
        { text: 'Admin', onPress: () => void changeRole(member.id, 'admin') },
        { text: 'Tag', onPress: () => void changeRole(member.id, 'member') },
        { text: 'Néző', onPress: () => void changeRole(member.id, 'viewer') },
        {
          text: 'Eltávolítás',
          style: 'destructive',
          onPress: () => {
            if (cantRemoveSelf) {
              Alert.alert('Nem törölhető', 'Te vagy az egyetlen admin.')
              return
            }
            void removeMember(member.id)
          },
        },
        { text: 'Mégse', style: 'cancel' },
      ])
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: bg }]}>
        <ActivityIndicator color="#2563EB" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8} accessibilityLabel="Vissza">
          <ChevronLeft size={24} color="#2563EB" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Család</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {!family ? (
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.emptyText, { color: muted }]}>
              Még nem tartozsz családhoz. Hozz létre egyet a Profil oldalon.
            </Text>
          </View>
        ) : (
          <>
            {/* Family name card */}
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.cardRow}>
                {editingName ? (
                  <TextInput
                    style={[styles.nameInput, { color: text, borderColor: border }]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    onSubmitEditing={handleSaveName}
                    onBlur={handleSaveName}
                    returnKeyType="done"
                    accessibilityLabel="Csalaádnév"
                  />
                ) : (
                  <Text style={[styles.familyName, { color: text }]}>{family.name}</Text>
                )}
                <Pressable
                  style={styles.iconBtn}
                  onPress={handleRenameFamily}
                  hitSlop={8}
                  accessibilityLabel="Átnevezés"
                >
                  <Pencil size={18} color={muted} />
                </Pressable>
              </View>
            </View>

            {/* Invite card */}
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Meghívás</Text>
              <View style={[styles.linkField, { backgroundColor: dark ? '#111827' : '#F3F4F6', borderColor: border }]}>
                <Text style={[styles.linkText, { color: muted }]} numberOfLines={1}>
                  {family.inviteLink || '—'}
                </Text>
              </View>
              <View style={styles.linkActions}>
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: '#2563EB' }]}
                  onPress={handleCopyLink}
                  accessibilityLabel="Másolás"
                >
                  <Copy size={16} color="#fff" />
                  <Text style={styles.linkBtnPrimary}>Másolás</Text>
                </Pressable>
                <Pressable
                  style={[styles.linkBtn, { borderWidth: 1, borderColor: border }]}
                  onPress={handleShareLink}
                  accessibilityLabel="Megosztás"
                >
                  <Share2 size={16} color={text} />
                  <Text style={[styles.linkBtnSecondary, { color: text }]}>Megosztás</Text>
                </Pressable>
              </View>
              <Text style={[styles.ttlText, { color: muted }]}>A meghívó 7 napig érvényes.</Text>
              <Pressable
                style={styles.regenBtn}
                onPress={handleRegenerate}
                accessibilityLabel="Új meghívó generálása"
              >
                <RefreshCw size={15} color="#2563EB" />
                <Text style={styles.regenText}>Új meghívó</Text>
              </Pressable>
            </View>

            {/* Members */}
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>
                Tagok ({family.members.length})
              </Text>
              {family.members.map((member, i) => (
                <View key={member.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: border }]} />}
                  <MemberRow
                    member={member}
                    isSelf={member.id === session?.user.id}
                    dark={dark}
                    text={text}
                    muted={muted}
                    onMenu={() => handleMemberMenu(member)}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

interface MemberRowProps {
  member: FamilyMember
  isSelf: boolean
  dark: boolean
  text: string
  muted: string
  onMenu: () => void
}

function MemberRow({ member, isSelf, text, muted, onMenu }: MemberRowProps) {
  const roleColor = ROLE_COLORS[member.role]
  const initials = getInitials(member.name)
  const color = avatarColor(member.id)

  return (
    <View style={styles.memberRow}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: text }]}>
          {member.name}
          {isSelf ? ' (én)' : ''}
        </Text>
        <Text style={[styles.memberEmail, { color: muted }]} numberOfLines={1}>
          {member.email}
        </Text>
      </View>
      <View style={styles.memberRight}>
        <View style={[styles.roleBadge, { backgroundColor: roleColor?.bg ?? '#E5E7EB' }]}>
          <Text style={[styles.roleText, { color: roleColor?.text ?? '#374151' }]}>
            {ROLE_LABELS[member.role]}
          </Text>
        </View>
        <Pressable style={styles.menuBtn} onPress={onMenu} hitSlop={8} accessibilityLabel="Műveletek">
          <MoreVertical size={18} color={muted} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: { width: 44 },
  scroll: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  nameInput: {
    flex: 1,
    height: 40,
    fontSize: 17,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkField: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 13,
    fontFamily: 'Courier',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  linkBtnPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkBtnSecondary: {
    fontSize: 14,
    fontWeight: '500',
  },
  ttlText: {
    fontSize: 12,
    textAlign: 'center',
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  regenText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 64,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 12,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})
