import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronRight, Copy } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { router } from 'expo-router'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAppearance, type AppearanceMode } from '@/lib/theme'
import { colors } from '@/constants/colors'

// Uid-alapú avatar háttérszín – runtime számolt, nem design token
const AVATAR_PALETTE = [
  '#2563EB', '#7C3AED', '#0891B2',
  '#059669', '#D97706', '#DC2626',
] as const

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]![0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

function getAvatarColor(uid: string): string {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = ((h * 31) + (uid.codePointAt(i) ?? 0)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length] ?? '#2563EB'
}

const APPEARANCE_OPTS: { value: AppearanceMode; label: string }[] = [
  { value: 'light', label: '☀' },
  { value: 'system', label: '◐' },
  { value: 'dark', label: '☾' },
]

function Separator() {
  return <View className="h-px bg-border dark:bg-dark-border ml-4" />
}

type RowProps = {
  label: string
  value?: string
  onPress?: () => void
  destructive?: boolean
  disabled?: boolean
  trailing?: ReactNode
}

function Row({ label, value, onPress, destructive, disabled, trailing }: RowProps) {
  const interactive = !!onPress && !disabled
  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      className="flex-row items-center min-h-[48px] px-4 py-3 gap-2"
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      <Text
        className={`flex-1 text-body-lg ${
          destructive
            ? 'text-destructive'
            : 'text-foreground dark:text-dark-foreground'
        }`}
      >
        {label}
      </Text>
      {value !== undefined && <Text className="text-body-md text-muted">{value}</Text>}
      {trailing}
      {interactive && !destructive && !trailing && (
        <ChevronRight size={18} color={colors.muted} />
      )}
    </Pressable>
  )
}

type GroupProps = { title?: string; children: ReactNode }

function Group({ title, children }: GroupProps) {
  return (
    <View className="gap-2">
      {title !== undefined && (
        <Text className="text-caption font-semibold text-muted uppercase ml-1">
          {title}
        </Text>
      )}
      <View className="rounded-card bg-card dark:bg-dark-card overflow-hidden">
        {children}
      </View>
    </View>
  )
}

export default function ProfilScreen() {
  const user = useAuthStore((s) => s.user)
  const { appearance, setAppearance } = useAppearance()
  const [signingOut, setSigningOut] = useState(false)

  const name = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'Felhasználó'
  const email = user?.email ?? ''
  const avatarBg = user?.id ? getAvatarColor(user.id) : '#2563EB'

  function notImplemented() {
    Alert.alert('Hamarosan', 'Ez a funkció hamarosan elérhető.')
  }

  function confirmSignOut() {
    Alert.alert('Kijelentkezés', 'Biztosan ki szeretnél jelentkezni?', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Kijelentkezés',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await supabase.auth.signOut()
          setSigningOut(false)
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {/* Large title header */}
      <View
        className="px-screen-x border-b border-border dark:border-dark-border bg-background dark:bg-dark-background"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Profil
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-screen-x pt-6 pb-8 gap-6">

          {/* Avatar block */}
          <View className="items-center gap-3 pt-2 pb-2">
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 80, height: 80, backgroundColor: avatarBg }}
            >
              <Text className="text-white font-bold" style={{ fontSize: 28, lineHeight: 34 }}>
                {getInitials(name)}
              </Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
                {name}
              </Text>
              <Text className="text-body-sm text-muted">{email}</Text>
            </View>
            <View className="flex-row gap-2">
              <View className="rounded-badge bg-primary px-2 py-1">
                <Text className="text-caption font-semibold text-white">Admin</Text>
              </View>
              <View className="rounded-badge bg-border dark:bg-dark-border px-2 py-1">
                <Text className="text-caption text-muted">Kácsor család · 3 tag</Text>
              </View>
            </View>
          </View>

          {/* Családi beállítások */}
          <Group title="Családi beállítások">
            <Row
              label="Csatlakozási link"
              value="bvr.so/kac…7d"
              trailing={
                <Pressable
                  onPress={notImplemented}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  accessibilityLabel="Link másolása"
                >
                  <Copy size={18} color={colors.muted} />
                </Pressable>
              }
            />
            <Separator />
            <Row label="Tagok kezelése" value="3 tag" onPress={() => router.push('/family-settings')} />
          </Group>

          {/* App beállítások */}
          <Group title="App beállítások">
            <Row
              label="Megjelenés"
              trailing={
                <View className="flex-row rounded-badge overflow-hidden border border-border dark:border-dark-border">
                  {APPEARANCE_OPTS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => void setAppearance(opt.value)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                      className={`px-3 py-1 ${
                        appearance === opt.value
                          ? 'bg-primary'
                          : 'bg-card dark:bg-dark-card'
                      }`}
                      accessibilityLabel={`Megjelenés: ${opt.label}`}
                      accessibilityRole="button"
                    >
                      <Text
                        className={`text-body-sm ${
                          appearance === opt.value
                            ? 'text-white'
                            : 'text-foreground dark:text-dark-foreground'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              }
            />
            <Separator />
            <Row label="Valuta" value="HUF (Ft)" onPress={notImplemented} />
            <Separator />
            <Row label="Alapértelmezett bolt" value="–" onPress={notImplemented} />
            <Separator />
            <Row label="Értesítések" value="Be" onPress={notImplemented} />
          </Group>

          {/* Fiók */}
          <Group title="Fiók">
            <Row label="Profil szerkesztése" onPress={notImplemented} />
            <Separator />
            <Row label="Jelszó módosítása" onPress={notImplemented} />
            <Separator />
            <Row
              label={signingOut ? 'Kijelentkezés…' : 'Kijelentkezés'}
              destructive
              onPress={confirmSignOut}
              disabled={signingOut}
            />
          </Group>

          {/* Rólunk */}
          <Group title="Rólunk">
            <Row label="App verzió" value="v0.1.0" disabled />
            <Separator />
            <Row label="Adatvédelem" onPress={notImplemented} />
            <Separator />
            <Row label="Felhasználási feltételek" onPress={notImplemented} />
          </Group>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
