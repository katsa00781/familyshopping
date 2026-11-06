import { useEffect, useRef, useState } from 'react'
import { Keyboard, ScrollView, type ScrollViewInstance, Text, TextInput, View } from 'react-native'

import { StorePicker } from '@/components/lista/StorePicker'
import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Select } from '@/components/ui/Select'
import { colors } from '@/constants/colors'
import { normalizeStoreName } from '@/lib/format'
import { useProductStore } from '@/store/productStore'
import type { ItemCategory, ShoppingItem } from '@/types'

const UNITS = ['db', 'kg', 'g', 'l', 'ml'] as const
type Unit = (typeof UNITS)[number]

const CATEGORIES: readonly ItemCategory[] = [
  'Zöldség',
  'Gyümölcs',
  'Tejtermék',
  'Hús',
  'Pékáru',
  'Vegán',
  'Ital',
  'Édesség',
  'Egyéb',
]

// Egységenkénti léptetés és alapmennyiség – azonos az ItemAddSheet-tel.
const UNIT_STEP: Record<Unit, { step: number; initial: number }> = {
  db: { step: 1, initial: 1 },
  kg: { step: 0.5, initial: 1 },
  g: { step: 50, initial: 100 },
  l: { step: 0.5, initial: 1 },
  ml: { step: 100, initial: 500 },
}

function toUnit(value: string): Unit {
  return (UNITS as readonly string[]).includes(value) ? (value as Unit) : 'db'
}

type OpenSelect = 'unit' | 'category' | 'store' | null

export type ItemEditPatch = Partial<Omit<ShoppingItem, 'id'>>

interface Props {
  visible: boolean
  item: ShoppingItem | null
  onClose: () => void
  /** `store`: csak bolt nélküli tételnél, ha a felhasználó boltot választott. */
  onSave: (itemId: string, patch: ItemEditPatch, store: string | null) => void
}

export default function ItemEditSheet({ visible, item, onClose, onSave }: Props) {
  const products = useProductStore((s) => s.products)

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<Unit>('db')
  const [category, setCategory] = useState<ItemCategory>('Egyéb')
  const [price, setPrice] = useState('')
  const [store, setStore] = useState<string | null>(null)
  const [openSelect, setOpenSelect] = useState<OpenSelect>(null)
  const scrollRef = useRef<ScrollViewInstance>(null)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity)
      setUnit(toUnit(item.unit))
      setCategory(item.category)
      setPrice(item.price !== null ? String(item.price) : '')
      setStore(null)
      setOpenSelect(null)
    }
  }, [item])

  // Bolt választó csak ott, ahol a tétel termékének nincs boltja (vagy nincs terméke).
  const product = item?.product_id ? products.find((p) => p.id === item.product_id) : undefined
  const hasStore = normalizeStoreName(product?.store_name) !== null

  function handleUnitChange(next: Unit) {
    setUnit(next)
    // Egységváltásnál a mennyiség marad, ha az új léptetéssel is értelmes.
    if (quantity < UNIT_STEP[next].step) setQuantity(UNIT_STEP[next].initial)
  }

  function handleOpenChange(which: Exclude<OpenSelect, null>, open: boolean) {
    if (open) Keyboard.dismiss()
    setOpenSelect(open ? which : null)
  }

  function handleSave() {
    if (!item) return
    const trimmed = name.trim()
    if (!trimmed) return

    onSave(
      item.id,
      {
        name: trimmed,
        quantity,
        unit,
        category,
        price: price ? parseInt(price, 10) : null,
      },
      hasStore ? null : store,
    )
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tétel szerkesztése" variant="full">
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (openSelect) scrollRef.current?.scrollToEnd({ animated: true })
        }}
      >
        {/* Név */}
        <Text className="text-body-sm font-medium text-muted mb-1.5">Megnevezés *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onFocus={() => setOpenSelect(null)}
          placeholder="pl. Tej 2,8%"
          placeholderTextColor={colors.muted}
          className="h-tap rounded-[10px] px-3 text-[17px] mb-4 border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground"
          accessibilityLabel="Megnevezés"
          returnKeyType="done"
        />

        {/* Mennyiség (léptető) + egység (select) */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <QuantityStepper
              label="Mennyiség"
              value={quantity}
              step={UNIT_STEP[unit].step}
              onChange={setQuantity}
            />
          </View>
          <View className="flex-1">
            <Select
              label="Egység"
              value={unit}
              options={UNITS}
              open={openSelect === 'unit'}
              onOpenChange={(open) => handleOpenChange('unit', open)}
              onChange={handleUnitChange}
            />
          </View>
        </View>

        {/* Kategória */}
        <View className="mb-4">
          <Select
            label="Kategória"
            value={category}
            options={CATEGORIES}
            open={openSelect === 'category'}
            onOpenChange={(open) => handleOpenChange('category', open)}
            onChange={setCategory}
          />
        </View>

        {/* Bolt – csak bolt nélküli tételnél */}
        {!hasStore && (
          <View className="mb-4">
            <StorePicker
              key={item?.id ?? 'none'}
              value={store}
              onChange={setStore}
              open={openSelect === 'store'}
              onOpenChange={(open) => handleOpenChange('store', open)}
            />
          </View>
        )}

        {/* Ár */}
        <Text className="text-body-sm font-medium text-muted mb-1.5">Ár (Ft)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          onFocus={() => setOpenSelect(null)}
          placeholder="pl. 499"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          className="h-tap rounded-[10px] px-3 text-[17px] mb-6 border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground"
          accessibilityLabel="Ár forintban"
        />

        <Button variant="primary" size="lg" fullWidth disabled={!name.trim()} onPress={handleSave}>
          Mentés
        </Button>
      </ScrollView>
    </BottomSheet>
  )
}
