import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'

import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/store/toastStore'

const MIN_LENGTH = 6

export default function JelszoModositasScreen() {
  const showToast = useToastStore((s) => s.showToast)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError(null)
    if (password.length < MIN_LENGTH) {
      setError(`A jelszó legalább ${MIN_LENGTH} karakter legyen.`)
      return
    }
    if (password !== confirm) {
      setError('A két jelszó nem egyezik.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      showToast('Jelszó módosítva', 'success')
      router.back()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Hiba a módosítás során.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsScaffold title="Jelszó módosítása">
      <View className="gap-4">
        <Input
          label="Új jelszó"
          value={password}
          onChangeText={(v) => {
            setPassword(v)
            if (error) setError(null)
          }}
          placeholder="Legalább 6 karakter"
          type="password"
        />
        <Input
          label="Új jelszó megerősítése"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v)
            if (error) setError(null)
          }}
          placeholder="Írd be újra"
          type="password"
          error={error ?? undefined}
        />
        <Button
          fullWidth
          onPress={handleSave}
          disabled={!password || !confirm}
          loading={saving}
        >
          Jelszó mentése
        </Button>
      </View>
    </SettingsScaffold>
  )
}
