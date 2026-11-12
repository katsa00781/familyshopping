import { useState } from 'react'
import { StyleSheet, Text, TextInput, useColorScheme } from 'react-native'

import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import { dayKey } from '@/lib/calendar'
import { formatHuDate } from '@/lib/format'

interface Props {
  visible: boolean
  onClose: () => void
  onCreate: (name: string, date: string) => void
}

export default function ListCreateSheet({ visible, onClose, onCreate }: Props) {
  const dark = useColorScheme() === 'dark'
  // null = még nem szerkesztett → az alapértelmezett név az aznapi dátum (pl. „2026.11.12.").
  const [edited, setEdited] = useState<string | null>(null)
  const name = edited ?? formatHuDate(dayKey(new Date()))

  const inputBg = dark ? '#0F172A' : '#F8FAFC'
  const inputBorder = dark ? '#334155' : '#E2E8F0'
  const textColor = dark ? '#F8FAFC' : '#0F172A'

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    // Helyi naptári nap (a toISOString UTC-je éjfél körül az előző napot adná).
    const date = dayKey(new Date())
    onCreate(trimmed, date)
    setEdited(null)
    onClose()
  }

  function handleClose() {
    setEdited(null)
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Új bevásárlólista">
      <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
        Lista neve *
      </Text>
      <TextInput
        value={name}
        onChangeText={setEdited}
        placeholder="pl. Heti bevásárlás"
        placeholderTextColor="#94A3B8"
        className="h-tap rounded-[10px] px-3 text-[17px] mb-6"
        style={[
          styles.input,
          { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
        ]}
        autoFocus
        selectTextOnFocus
        clearButtonMode="while-editing"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!name.trim()}
        onPress={handleCreate}
      >
        Létrehozás
      </Button>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
  },
})
