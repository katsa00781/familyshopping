import { useRef, useState } from 'react'
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatHuf } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import type { ItemCategory, Product, ShoppingItem } from '@/types'

const UNITS = ['db', 'kg', 'g', 'l', 'ml']
const CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface Props {
  visible: boolean
  onClose: () => void
  onAdd: (item: ShoppingItem) => void
}

export default function ItemAddSheet({ visible, onClose, onAdd }: Props) {
  const dark = useColorScheme() === 'dark'

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<string>('db')
  const [category, setCategory] = useState<ItemCategory>('Egyéb')
  const [price, setPrice] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inputBg = dark ? '#0F172A' : '#F8FAFC'
  const inputBorder = dark ? '#334155' : '#E2E8F0'
  const textColor = dark ? '#F8FAFC' : '#0F172A'

  function handleNameChange(text: string) {
    setName(text)
    setProductId(null)

    if (searchTimer.current) clearTimeout(searchTimer.current)

    const trimmed = text.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    searchTimer.current = setTimeout(async () => {
      const userId = useAuthStore.getState().user?.id
      if (!userId) return

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${trimmed}%`)
        .eq('available', true)
        .order('name')
        .limit(20)

      const deduped = ((data as Product[]) ?? [])
        .reduce<Product[]>((acc, product) => {
          const existing = acc.find(
            (p) => p.name.toLowerCase() === product.name.toLowerCase(),
          )
          if (!existing) {
            acc.push(product)
          } else {
            const existingPrice = existing.last_price ?? existing.price ?? 0
            const currentPrice = product.last_price ?? product.price ?? 0
            if (currentPrice > existingPrice) {
              acc[acc.indexOf(existing)] = product
            }
          }
          return acc
        }, [])
        .slice(0, 5)

      setSuggestions(deduped)
    }, 300)
  }

  // A legördülő javaslatra koppintva a termék azonnal bekerül a listába –
  // nem kell külön "Hozzáadás" gombot keresni.
  function selectSuggestion(product: Product) {
    const validCat = CATEGORIES.includes(product.category as ItemCategory)
      ? (product.category as ItemCategory)
      : 'Egyéb'
    const resolvedPrice = product.last_price ?? product.price

    const item: ShoppingItem = {
      id: generateId(),
      name: product.brand ? `${product.name} ${product.brand}` : product.name,
      quantity: parseFloat(quantity) || 1,
      unit: product.unit,
      category: validCat,
      checked: false,
      price: resolvedPrice ?? null,
      product_id: product.id,
    }

    onAdd(item)
    haptics.light()
    reset()
    onClose()
  }

  async function handleAdd(createProduct: boolean) {
    const trimmed = name.trim()
    if (!trimmed) return

    let resolvedProductId = productId

    if (createProduct && !resolvedProductId) {
      const userId = useAuthStore.getState().user?.id
      if (userId) {
        const { data } = await supabase
          .from('products')
          .upsert({
            user_id: userId,
            name: trimmed,
            category,
            unit,
            price: price ? parseInt(price, 10) : null,
            last_price: price ? parseInt(price, 10) : null,
            available: true,
            price_history: [],
            brand: null,
            barcode: null,
            store_name: null,
          })
          .select('id')
          .single()
        resolvedProductId = (data as { id: string } | null)?.id ?? null
      }
    }

    const item: ShoppingItem = {
      id: generateId(),
      name: trimmed,
      quantity: parseFloat(quantity) || 1,
      unit,
      category,
      checked: false,
      price: price ? parseInt(price, 10) : null,
      product_id: resolvedProductId,
    }
    onAdd(item)
    reset()
    onClose()
  }

  function reset() {
    setName('')
    setQuantity('1')
    setUnit('db')
    setCategory('Egyéb')
    setPrice('')
    setProductId(null)
    setSuggestions([])
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }

  function handleClose() {
    reset()
    onClose()
  }

  const isNewProduct = !productId && name.trim().length > 0
  const ctaLabel = isNewProduct ? 'Új termékként hozzáadás' : 'Hozzáadás'

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Tétel hozzáadása">
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
            onChangeText={handleNameChange}
            placeholder="pl. Tej 2,8%"
            placeholderTextColor="#94A3B8"
            className={`h-tap rounded-[10px] px-3 text-[17px] ${suggestions.length > 0 ? 'mb-0' : 'mb-4'}`}
            style={[
              styles.input,
              { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
            ]}
            autoFocus
            returnKeyType="next"
          />

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <View
              className="mb-4 mt-1 rounded-[10px] overflow-hidden"
              style={[styles.suggestions, { backgroundColor: inputBg, borderColor: inputBorder }]}
            >
              {suggestions.map((product, index) => (
                <Pressable
                  key={product.id}
                  onPress={() => selectSuggestion(product)}
                  style={({ pressed }) => [
                    { opacity: pressed ? 0.7 : 1 },
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: inputBorder },
                  ]}
                  className="px-3 py-3 flex-row items-center"
                >
                  <View className="flex-1">
                    <Text
                      className="text-body-md font-medium text-foreground dark:text-dark-foreground"
                      numberOfLines={1}
                    >
                      {product.name}{product.brand ? ` ${product.brand}` : ''}
                    </Text>
                    <Text className="text-body-sm text-muted mt-0.5">
                      {product.category} · {product.unit}
                    </Text>
                  </View>
                  {(product.last_price ?? product.price) != null && (
                    <Text className="text-body-sm font-semibold text-primary ml-2">
                      {formatHuf((product.last_price ?? product.price) ?? 0)}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}

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

          {/* Ár (opcionális) */}
          <Text className="text-body-sm font-medium text-[#475569] dark:text-muted mb-1.5">
            Ár (Ft) – nem kötelező
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
            onPress={() => handleAdd(isNewProduct)}
          >
            {ctaLabel}
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
  suggestions: {
    borderWidth: 1,
    borderRadius: 10,
  },
})
