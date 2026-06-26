import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'

import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

export default function ProfilSzerkesztesScreen() {
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.showToast)

  const initialName = (user?.user_metadata?.['full_name'] as string | undefined) ?? ''
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  const trimmed = name.trim()
  const changed = trimmed !== initialName && trimmed.length > 0

  async function handleSave() {
    if (!changed || saving) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
      if (error) throw error
      showToast('Profil mentve', 'success')
      router.back()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Hiba a mentés során.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsScaffold title="Profil szerkesztése">
      <View className="gap-4">
        <Input
          label="Teljes név"
          value={name}
          onChangeText={setName}
          placeholder="Pl. Kácsor Zsolt"
        />
        <Input label="Email-cím" value={user?.email ?? ''} disabled />
        <Button fullWidth onPress={handleSave} disabled={!changed} loading={saving}>
          Mentés
        </Button>
      </View>
    </SettingsScaffold>
  )
}
