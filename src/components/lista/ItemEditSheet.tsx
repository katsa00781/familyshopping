import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import type { ItemCategory, ShoppingItem } from '@/types'

const UNITS = ['db', 'kg', 'g', 'l', 'ml']
const CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

interface Props {
  visible: boolean
  item: ShoppingItem | null
  onClose: () => void
  onSave: (itemId: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => void
}

export default function ItemEditSheet({ visible, item, onClose, onSave }: Props) {
  const dark = useColorScheme() === 'dark'

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<string>('db')
  const [category, setCategory] = useState<ItemCategory>('Egyéb')
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(String(item.quantity))
      setUnit(item.unit)
      setCategory(item.category)
      setPrice(item.price !== null ? String(item.price) : '')
    }
  }, [item])

  const inputBg = dark ? '#0F172A' : '#F8FAFC'
  const inputBorder = dark ? '#334155' : '#E2E8F0'
  const textColor = dark ? '#F8FAFC' : '#0F172A'

  function handleSave() {
    if (!item) return
    const trimmed = name.trim()
    if (!trimmed) return

    onSave(item.id, {
      name: trimmed,
      quantity: parseFloat(quantity) || 1,
      unit,
      category,
      price: price ? parseInt(price, 10) : null,
    })
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tétel szerkesztése">
      <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Név */}
          <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
            Megnevezés *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="pl. Tej 2,8%"
            placeholderTextColor="#94A3B8"
            className="h-tap rounded-[10px] px-3 text-[17px] mb-4"
            style={[
              styles.input,
              { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
            ]}
            returnKeyType="next"
          />

          {/* Mennyiség + egység */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
                Mennyiség
              </Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                className="h-tap rounded-[10px] px-3 text-[17px]"
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
                ]}
              />
            </View>

            <View className="flex-1">
              <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
                Egység
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {UNITS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    className={`px-3 h-9 rounded-badge items-center justify-center ${
                      unit === u
                        ? 'bg-primary'
                        : 'bg-[#F1F5F9] dark:bg-[#1E293B]'
                    }`}
                  >
                    <Text
                      className={`text-body-sm font-medium ${
                        unit === u ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Kategória */}
          <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
            Kategória
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-3 h-9 rounded-badge items-center justify-center ${
                  category === cat
                    ? 'bg-primary'
                    : 'bg-[#F1F5F9] dark:bg-[#1E293B]'
                }`}
              >
                <Text
                  className={`text-body-sm font-medium ${
                    category === cat ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Ár */}
          <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
            Ár (Ft)
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="pl. 499"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            className="h-tap rounded-[10px] px-3 text-[17px] mb-6"
            style={[
              styles.input,
              { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
            ]}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!name.trim()}
            onPress={handleSave}
          >
            Mentés
          </Button>
        </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
  },
})
