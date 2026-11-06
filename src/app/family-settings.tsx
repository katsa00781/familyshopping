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

import Button from '@/components/ui/Button'
import { colors } from '@/constants/colors'
import { formatHuDate } from '@/lib/format'
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

function inviteValidText(expiresAt: string): string {
  if (!expiresAt) return 'A meghívókód 7 napig érvényes.'
  const expires = new Date(expiresAt)
  if (expires.getTime() < Date.now()) return 'A meghívókód lejárt – generálj újat.'
  return `A meghívókód érvényes: ${formatHuDate(expiresAt)}`
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
  const {
    family,
    isLoading,
    loadFamily,
    createFamily,
    joinFamily,
    leaveFamily,
    renameFamily,
    regenerateInvite,
    changeRole,
    removeMember,
  } = useFamilyStore()
  const session = useAuthStore((s) => s.session)
  const showToast = useToastStore((s) => s.showToast)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)

  const myId = session?.user.id
  const me = family?.members.find((m) => m.userId === myId)
  const isAdmin = me?.role === 'admin'
  const isOwner = !!family && family.ownerId === myId

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
    showToast('Meghívókód másolva', 'success')
  }

  async function handleShareLink() {
    if (!family?.inviteLink) return
    await Share.share({
      message: `Csatlakozz a családunkhoz a FamilyHub appban (Profil → Család → Csatlakozás kóddal). Meghívókód: ${family.inviteLink}`,
    })
  }

  function handleRegenerate() {
    Alert.alert(
      'Új meghívó',
      'A régi kód érvénytelenné válik. Biztosan generálsz újat?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Generálás',
          onPress: () => {
            void regenerateInvite()
            showToast('Új meghívókód generálva', 'success')
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

  async function handleCreate() {
    setBusy(true)
    const error = await createFamily(newFamilyName)
    setBusy(false)
    if (error) Alert.alert('Hiba', error)
    else showToast('Család létrehozva', 'success')
  }

  async function handleJoin() {
    if (joinCode.trim().length < 6) return
    setBusy(true)
    const error = await joinFamily(joinCode)
    setBusy(false)
    if (error) Alert.alert('Hiba', error)
    else showToast('Csatlakoztál a családhoz', 'success')
  }

  function handleLeave() {
    Alert.alert(
      'Kilépés a családból',
      'Kilépés után nem látod a család közös listáit és termékeit.',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Kilépés',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const error = await leaveFamily()
              if (error) Alert.alert('Hiba', error)
            })()
          },
        },
      ],
    )
  }

  function confirmRemove(member: FamilyMember) {
    Alert.alert('Eltávolítás', `Biztosan eltávolítod: ${member.name}?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Eltávolítás',
        style: 'destructive',
        onPress: () => void removeMember(member.id),
      },
    ])
  }

  function handleMemberMenu(member: FamilyMember) {
    const isSelf = member.userId === myId
    const isFamilyOwner = member.userId === family?.ownerId

    // Nem admin: csak a saját során léphet ki.
    if (!isAdmin) {
      if (isSelf && !isFamilyOwner) handleLeave()
      return
    }

    // A tulajdonos nem távolítható el (a közös adatok az ő fiókjához tartoznak).
    const canRemove = !isFamilyOwner
    const removeLabel = isSelf ? 'Kilépés' : 'Eltávolítás'
    const onRemove = () => (isSelf ? handleLeave() : confirmRemove(member))

    if (Platform.OS === 'ios') {
      const options = ['Admin', 'Tag', 'Néző', ...(canRemove ? [removeLabel] : []), 'Mégse']
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: canRemove ? 3 : undefined,
          cancelButtonIndex: options.length - 1,
        },
        (idx) => {
          if (idx === 0) void changeRole(member.id, 'admin')
          else if (idx === 1) void changeRole(member.id, 'member')
          else if (idx === 2) void changeRole(member.id, 'viewer')
          else if (idx === 3 && canRemove) onRemove()
        },
      )
    } else {
      Alert.alert(member.name, 'Szerepkör módosítása', [
        { text: 'Admin', onPress: () => void changeRole(member.id, 'admin') },
        { text: 'Tag', onPress: () => void changeRole(member.id, 'member') },
        { text: 'Néző', onPress: () => void changeRole(member.id, 'viewer') },
        ...(canRemove
          ? [{ text: removeLabel, style: 'destructive' as const, onPress: onRemove }]
          : []),
        { text: 'Mégse', style: 'cancel' as const },
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
          <>
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Új család létrehozása</Text>
              <Text style={[styles.hintText, { color: muted }]}>
                A listáid és termékeid közösek lesznek a családtagokkal. Utána meghívókóddal
                hívhatod meg őket.
              </Text>
              <TextInput
                className="h-tap rounded-[10px] px-3 text-[17px] border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground"
                value={newFamilyName}
                onChangeText={setNewFamilyName}
                placeholder="Család neve, pl. Kovács család"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Család neve"
                returnKeyType="done"
              />
              <Button variant="primary" size="lg" fullWidth loading={busy} onPress={() => void handleCreate()}>
                Család létrehozása
              </Button>
            </View>

            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Csatlakozás kóddal</Text>
              <Text style={[styles.hintText, { color: muted }]}>
                Írd be a családtagodtól kapott 6 karakteres meghívókódot.
              </Text>
              <TextInput
                className="h-tap rounded-[10px] px-3 text-[20px] tracking-[4px] text-center border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground"
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Meghívókód"
                returnKeyType="done"
                onSubmitEditing={() => void handleJoin()}
              />
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                disabled={joinCode.length < 6}
                loading={busy}
                onPress={() => void handleJoin()}
              >
                Csatlakozás
              </Button>
            </View>
          </>
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
              <Text style={[styles.ttlText, { color: muted }]}>
                {inviteValidText(family.inviteExpiresAt)}
              </Text>
              {isAdmin && (
                <Pressable
                  style={styles.regenBtn}
                  onPress={handleRegenerate}
                  accessibilityLabel="Új meghívókód generálása"
                >
                  <RefreshCw size={15} color="#2563EB" />
                  <Text style={styles.regenText}>Új meghívókód</Text>
                </Pressable>
              )}
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
                    isSelf={member.userId === myId}
                    isOwner={member.userId === family.ownerId}
                    dark={dark}
                    text={text}
                    muted={muted}
                    onMenu={() => handleMemberMenu(member)}
                  />
                </View>
              ))}
            </View>

            {!isOwner && (
              <Button variant="ghost" size="md" fullWidth onPress={handleLeave}>
                Kilépés a családból
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

interface MemberRowProps {
  member: FamilyMember
  isSelf: boolean
  isOwner: boolean
  dark: boolean
  text: string
  muted: string
  onMenu: () => void
}

function MemberRow({ member, isSelf, isOwner, text, muted, onMenu }: MemberRowProps) {
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
          {isOwner ? ' · tulajdonos' : ''}
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
  hintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})
