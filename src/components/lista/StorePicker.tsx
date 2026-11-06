import { useState } from 'react'
import { TextInput, View } from 'react-native'

import { Select } from '@/components/ui/Select'
import { colors } from '@/constants/colors'
import { orderedStoreNames } from '@/lib/sortByStore'
import { useProductStore } from '@/store/productStore'
import { useStoreOrderStore } from '@/store/storeOrderStore'

const NONE = 'Nincs megadva'
const NEW_STORE = 'Új bolt…'

interface StorePickerProps {
  value: string | null
  onChange: (store: string | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Bolt választó bolt nélküli termékhez/tételhez: a katalógus boltjai a beállított
 * boltsorrendben, plusz „Új bolt…" szabad szöveges megadáshoz.
 */
export function StorePicker({ value, onChange, open, onOpenChange }: StorePickerProps) {
  const products = useProductStore((s) => s.products)
  const order = useStoreOrderStore((s) => s.order)
  const stores = orderedStoreNames(products, order)

  const [custom, setCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  const options = [NONE, ...stores, NEW_STORE]
  const selected = custom ? NEW_STORE : value && stores.includes(value) ? value : NONE

  function handleSelect(option: string) {
    if (option === NEW_STORE) {
      setCustom(true)
      onChange(customName.trim() || null)
      return
    }
    setCustom(false)
    onChange(option === NONE ? null : option)
  }

  return (
    <View>
      <Select
        label="Bolt"
        value={selected}
        options={options}
        open={open}
        onOpenChange={onOpenChange}
        onChange={handleSelect}
      />
      {custom && (
        <TextInput
          value={customName}
          onChangeText={(text) => {
            setCustomName(text)
            onChange(text.trim() || null)
          }}
          onFocus={() => onOpenChange(false)}
          placeholder="Bolt neve, pl. Spar"
          placeholderTextColor={colors.muted}
          className="h-tap mt-2 rounded-[10px] px-3 text-[17px] border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground"
          accessibilityLabel="Új bolt neve"
          autoFocus
          returnKeyType="done"
        />
      )}
    </View>
  )
}
