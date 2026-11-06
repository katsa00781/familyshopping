import { useRef, useState } from 'react'
import { X } from 'lucide-react-native'
import {
  Keyboard,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from 'react-native'

import { StorePicker } from '@/components/lista/StorePicker'
import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Select } from '@/components/ui/Select'
import { colors } from '@/constants/colors'
import { resolveDataOwnerId } from '@/lib/dataOwner'
import { formatHuf, normalizeStoreName } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useProductStore } from '@/store/productStore'
import { haptics } from '@/lib/haptics'
import type { ItemCategory, Product, ShoppingItem } from '@/types'

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

// Egységenkénti léptetés és alapmennyiség (egységváltáskor erre áll vissza).
const UNIT_STEP: Record<Unit, { step: number; initial: number }> = {
  db: { step: 1, initial: 1 },
  kg: { step: 0.5, initial: 1 },
  g: { step: 50, initial: 100 },
  l: { step: 0.5, initial: 1 },
  ml: { step: 100, initial: 500 },
}

type OpenSelect = 'unit' | 'category' | 'store' | null

/** Léptetés a termék egységéhez (a listán kívüli egységnél – pl. „csomag” – darabos). */
function stepFor(unit: string): { step: number; initial: number } {
  return (UNITS as readonly string[]).includes(unit) ? UNIT_STEP[unit as Unit] : UNIT_STEP.db
}

function productLabel(product: Product): string {
  return product.brand ? `${product.name} ${product.brand}` : product.name
}

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
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<Unit>('db')
  const [category, setCategory] = useState<ItemCategory>('Egyéb')
  const [store, setStore] = useState<string | null>(null)
  const [openSelect, setOpenSelect] = useState<OpenSelect>(null)
  // A StorePicker belső („Új bolt…") állapotát újranyitáskor a key cseréje törli.
  const [formKey, setFormKey] = useState(0)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  // Keresőből kiválasztott termék: egység/kategória/bolt/ár ebből jön, csak a
  // mennyiség állítható, a „Hozzáadás” gomb teszi a listára.
  const [selected, setSelected] = useState<Product | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<ScrollViewInstance>(null)

  function handleNameChange(text: string) {
    setName(text)
    // A kiválasztott termék nevét átírva már új/másik terméket keres.
    if (selected && text !== productLabel(selected)) setSelected(null)

    if (searchTimer.current) clearTimeout(searchTimer.current)

    const trimmed = text.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    searchTimer.current = setTimeout(async () => {
      const sessionUserId = useAuthStore.getState().user?.id
      if (!sessionUserId) return
      const userId = await resolveDataOwnerId(sessionUserId)

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
          const existing = acc.find((p) => p.name.toLowerCase() === product.name.toLowerCase())
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

  // A találatra koppintva a termék KIVÁLASZTÓDIK (nem kerül azonnal a listára):
  // a mennyiség még léptethető, a „Hozzáadás” gomb teszi fel. Egység, kategória,
  // bolt és ár a termékből jön.
  function selectSuggestion(product: Product) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    Keyboard.dismiss()
    haptics.selection()
    setSelected(product)
    setName(productLabel(product))
    setSuggestions([])
    setOpenSelect(null)
    setQuantity(stepFor(product.unit).initial)
  }

  function clearSelection() {
    setSelected(null)
    setName('')
    setQuantity(1)
  }

  function addSelected(product: Product) {
    const validCat = CATEGORIES.includes(product.category as ItemCategory)
      ? (product.category as ItemCategory)
      : 'Egyéb'

    const item: ShoppingItem = {
      id: generateId(),
      name: productLabel(product),
      quantity,
      unit: product.unit,
      category: validCat,
      checked: false,
      price: product.last_price ?? product.price ?? null,
      product_id: product.id,
    }

    onAdd(item)
    haptics.light()
    reset()
    onClose()
  }

  // Kézzel beírt név = új termék: a katalógusba is felvesszük (ár nélkül – az első
  // vásárlás / blokk-beolvasás rögzíti), a választott bolttal. A productStore-on át
  // megy, hogy a lista bolt-csoportosítása azonnal lássa az új terméket.
  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return

    let productId: string | null = null
    let productPrice: number | null = null
    try {
      const product = await useProductStore.getState().upsertProduct({
        name: trimmed,
        brand: null,
        category,
        store_name: store,
        price: null,
        unit,
        barcode: null,
      })
      productId = product.id
    } catch (e) {
      // Ugyanez a termék (bolt + név + egység) már létezik → arra kötjük.
      if (e instanceof Error && e.message === 'DUPLICATE') {
        const storeKey = normalizeStoreName(store)
        const existing = useProductStore
          .getState()
          .products.find(
            (p) =>
              p.name.trim().toLowerCase() === trimmed.toLowerCase() &&
              p.unit === unit &&
              normalizeStoreName(p.store_name) === storeKey,
          )
        productId = existing?.id ?? null
        productPrice = existing ? (existing.last_price ?? existing.price) : null
      }
    }

    const item: ShoppingItem = {
      id: generateId(),
      name: trimmed,
      quantity,
      unit,
      category,
      checked: false,
      price: productPrice,
      product_id: productId,
    }
    onAdd(item)
    reset()
    onClose()
  }

  function handleUnitChange(next: Unit) {
    setUnit(next)
    setQuantity(UNIT_STEP[next].initial)
  }

  function handleOpenChange(which: Exclude<OpenSelect, null>, open: boolean) {
    if (open) Keyboard.dismiss()
    setOpenSelect(open ? which : null)
  }

  function reset() {
    setName('')
    setQuantity(1)
    setUnit('db')
    setCategory('Egyéb')
    setStore(null)
    setSelected(null)
    setFormKey((k) => k + 1)
    setOpenSelect(null)
    setSuggestions([])
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Tétel hozzáadása">
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Kinyitott select-lista legyen látható a fél-magas sheetben is.
          if (openSelect) scrollRef.current?.scrollToEnd({ animated: true })
        }}
      >
        {/* Név / kereső */}
        <Text className="text-body-sm font-medium text-muted mb-1.5">Megnevezés *</Text>
        <TextInput
          value={name}
          onChangeText={handleNameChange}
          onFocus={() => setOpenSelect(null)}
          placeholder="Keresés vagy új termék, pl. Tej 2,8%"
          placeholderTextColor={colors.muted}
          className={`h-tap rounded-[10px] px-3 text-[17px] border border-border dark:border-dark-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground ${
            suggestions.length > 0 ? 'mb-0' : 'mb-4'
          }`}
          accessibilityLabel="Megnevezés vagy termék keresése"
          autoFocus
          returnKeyType="done"
        />

        {/* Termék-találatok: koppintásra kiválasztódik (mennyiség után Hozzáadás) */}
        {suggestions.length > 0 && (
          <View className="mb-4 mt-1 rounded-[10px] overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
            {suggestions.map((product, index) => (
              <Pressable
                key={product.id}
                onPress={() => selectSuggestion(product)}
                accessibilityRole="button"
                accessibilityLabel={`${productLabel(product)} kiválasztása`}
              >
                {({ pressed }) => (
                  <View
                    className={`px-3 py-3 flex-row items-center ${
                      index > 0 ? 'border-t border-border dark:border-dark-border' : ''
                    }`}
                    style={{ opacity: pressed ? 0.7 : 1 }}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-body-md font-medium text-foreground dark:text-dark-foreground"
                        numberOfLines={1}
                      >
                        {product.name}
                        {product.brand ? ` ${product.brand}` : ''}
                      </Text>
                      <Text className="text-body-sm text-muted mt-0.5">
                        {[product.store_name, product.category, product.unit]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {(product.last_price ?? product.price) != null && (
                      <Text className="text-body-sm font-semibold text-primary ml-2">
                        {formatHuf(product.last_price ?? product.price ?? 0)}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {selected ? (
          <>
            {/* Kiválasztott termék: csak a mennyiség állítható */}
            <View className="mb-4 rounded-[10px] border border-primary bg-card dark:bg-dark-card px-3 py-3 flex-row items-center gap-3">
              <View className="flex-1">
                <Text
                  className="text-body-md font-semibold text-foreground dark:text-dark-foreground"
                  numberOfLines={1}
                >
                  {productLabel(selected)}
                </Text>
                <Text className="text-body-sm text-muted mt-0.5">
                  {[selected.store_name, selected.category, selected.unit]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {(selected.last_price ?? selected.price) != null && (
                <Text className="text-body-sm font-semibold text-primary">
                  {formatHuf(selected.last_price ?? selected.price ?? 0)}
                </Text>
              )}
              <Pressable
                onPress={clearSelection}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Kiválasztott termék törlése"
              >
                {({ pressed }) => (
                  <View style={{ opacity: pressed ? 0.6 : 1 }}>
                    <X size={20} color={colors.muted} strokeWidth={1.75} />
                  </View>
                )}
              </Pressable>
            </View>

            <View className="mb-6">
              <QuantityStepper
                label={`Mennyiség (${selected.unit})`}
                value={quantity}
                step={stepFor(selected.unit).step}
                onChange={setQuantity}
              />
            </View>
          </>
        ) : (
          <>
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

            {/* Kategória (select) */}
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

            {/* Bolt – az új (kézzel beírt) termékhez; a találatok boltja a termékből jön */}
            <View className="mb-6">
              <StorePicker
                key={formKey}
                value={store}
                onChange={setStore}
                open={openSelect === 'store'}
                onOpenChange={(open) => handleOpenChange('store', open)}
              />
            </View>
          </>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!name.trim()}
          onPress={() => (selected ? addSelected(selected) : void handleAdd())}
        >
          {selected
            ? 'Hozzáadás a listához'
            : name.trim()
              ? 'Új termékként hozzáadás'
              : 'Hozzáadás'}
        </Button>
      </ScrollView>
    </BottomSheet>
  )
}
