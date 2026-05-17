import { useState } from 'react'
import { StyleSheet, Text, TextInput, useColorScheme } from 'react-native'

import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'

interface Props {
  visible: boolean
  onClose: () => void
  onCreate: (name: string, date: string) => void
}

export default function ListCreateSheet({ visible, onClose, onCreate }: Props) {
  const dark = useColorScheme() === 'dark'
  const [name, setName] = useState('')

  const inputBg = dark ? '#0F172A' : '#F8FAFC'
  const inputBorder = dark ? '#334155' : '#E2E8F0'
  const textColor = dark ? '#F8FAFC' : '#0F172A'

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    const date = new Date().toISOString().split('T')[0]
    onCreate(trimmed, date)
    setName('')
    onClose()
  }

  function handleClose() {
    setName('')
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Új bevásárlólista">
      <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
        Lista neve *
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="pl. Heti bevásárlás"
        placeholderTextColor="#94A3B8"
        className="h-tap rounded-[10px] px-3 text-[17px] mb-6"
        style={[
          styles.input,
          { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
        ]}
        autoFocus
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
