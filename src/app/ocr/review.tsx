import { router } from 'expo-router'
import {
  AlertTriangle,
  ChevronLeft,
  HelpCircle,
  Link2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { supabase, getSessionSafe } from '@/lib/supabase'
import { formatHuf } from '@/lib/format'
import { searchProducts } from '@/lib/productMatcher'
import { inferCategory } from '@/lib/categories'
import { useOcrStore } from '@/store/ocrStore'
import { useProductStore } from '@/store/productStore'
import { usePriceStore } from '@/store/priceStore'
import type { Product, ReviewItem, ProductPriceHistory, ShoppingStatistic } from '@/types'

const LOW_CONF = 0.78

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

// A felhasználó kézi javításait visszatöltjük a tanuló glosszáriumba (ocr_corrections).
// Csak ott rögzítünk, ahol volt eredeti OCR-név és a végleges név érdemben eltér tőle.
async function recordCorrections(items: ReviewItem[]): Promise<void> {
  const corrections = items.filter(
    (item) =>
      item.rawName.trim().length > 0 &&
      item.name.trim().length > 0 &&
      item.rawName.trim().toLowerCase() !== item.name.trim().toLowerCase()
  )
  if (corrections.length === 0) return

  await Promise.all(
    corrections.map((item) =>
      supabase.rpc('record_ocr_correction', {
        p_raw: item.rawName,
        p_corrected: item.name,
        p_unit: item.unit,
      })
    )
  )
}

export default function OCRReviewScreen() {
  const insets = useSafeAreaInsets()
  const { reviewItems, ocrResponse, updateReviewItem, toggleSkip } = useOcrStore()
  const upsertProduct = useProductStore((s) => s.upsertProduct)
  const products = useProductStore((s) => s.products)

  const [saving, setSaving] = useState(false)
  const [pickerItemId, setPickerItemId] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  // Biztosítsuk, hogy a katalógus be van töltve a kézi termékkereséshez és a
  // duplikátum-jelzéshez — kézi bevitelnél a feldolgozó képernyő (ami egyébként
  // betölti) kimaradhat, és az OCR flow magától nem tölti a termékeket.
  useEffect(() => {
    if (useProductStore.getState().products.length === 0) {
      void useProductStore.getState().loadProducts()
    }
  }, [])

  const activeItems = reviewItems.filter((i) => !i.skip)
  const total = activeItems.reduce((sum, i) => sum + i.price * i.qty, 0)

  function handlePickProduct(product: Product) {
    if (!pickerItemId) return
    updateReviewItem(pickerItemId, {
      name: product.name,
      existingProductId: product.id,
      matchedProductName: product.name,
      isDuplicate: true,
    })
    setPickerItemId(null)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await doSave()
    } catch (e) {
      setSaving(false)
      Alert.alert('Hiba', e instanceof Error ? e.message : 'Mentés sikertelen.')
    }
  }

  async function doSave() {
    const session = await getSessionSafe()
    if (!session) throw new Error('Nincs aktív munkamenet.')

    const userId = session.user.id
    const store = ocrResponse?.store ?? null
    const priceDate = ocrResponse?.date ?? new Date().toISOString().split('T')[0]!

    let newProductCount = 0
    const priceHistoryRows: Array<Omit<ProductPriceHistory, 'id' | 'created_at'>> = []
    const statisticRows: Array<Omit<ShoppingStatistic, 'id' | 'created_at'>> = []

    for (const item of activeItems) {
      let productId = item.existingProductId
      // Katalógus-párnál örököljük a meglévő termék kategóriáját; új terméknél
      // névből következtetünk (kulcsszó-heurisztika, fallback 'Egyéb'). Így az OCR
      // tételek a megfelelő kategória-chip alá kerülnek, nem mind az 'Egyéb'-be.
      let category: string

      if (!productId) {
        category = inferCategory(item.name)
        await upsertProduct({
          name: item.name,
          brand: null,
          category,
          store_name: store,
          price: item.price,
          unit: item.unit ?? 'db',
          barcode: null,
        })
        const created = useProductStore.getState().products.find((p) => p.name === item.name)
        productId = created?.id ?? null
        newProductCount++
      } else {
        const existing = useProductStore.getState().products.find((p) => p.id === productId)
        category = existing?.category ?? 'Egyéb'
        if (existing) {
          await upsertProduct({
            id: productId,
            name: existing.name,
            brand: existing.brand,
            category: existing.category,
            store_name: store ?? existing.store_name,
            price: item.price,
            unit: existing.unit,
            barcode: existing.barcode,
          })
        }
      }

      priceHistoryRows.push({
        user_id: userId,
        product_id: productId,
        product_name: item.name,
        product_category: category,
        store_name: store,
        unit: item.unit ?? 'db',
        unit_price: item.price,
        quantity: item.qty,
        total_price: item.price * item.qty,
        price_date: priceDate,
        source: 'ocr',
      })

      statisticRows.push({
        user_id: userId,
        shopping_list_id: null,
        product_name: item.name,
        product_category: category,
        store_name: store,
        unit: item.unit ?? 'db',
        unit_price: item.price,
        quantity: item.qty,
        total_price: item.price * item.qty,
        shopping_date: priceDate,
        source: 'ocr',
      })
    }

    if (priceHistoryRows.length > 0) {
      const { error } = await supabase.from('product_price_history').insert(priceHistoryRows)
      if (error) throw new Error(error.message)
    }

    if (statisticRows.length > 0) {
      const { error } = await supabase.from('shopping_statistics').insert(statisticRows)
      if (error) throw new Error(error.message)
    }

    // Tanuló réteg: ahol a felhasználó javította az OCR által kiolvasott nevet,
    // rögzítjük a (nyers → javított) párt. Fire-and-forget — sosem blokkolja a mentést.
    void recordCorrections(activeItems).catch(() => {})

    // Frissítsük a globális store-okat a friss DB-adatokkal, hogy az Árak és a
    // Termékek képernyő azonnal lássa az új tételeket (ki-/bejelentkezés nélkül).
    void useProductStore.getState().loadProducts()
    void usePriceStore.getState().loadPriceData()

    router.push({
      pathname: '/ocr/confirm',
      params: {
        itemCount: String(activeItems.length),
        newProductCount: String(newProductCount),
        storeName: store ?? '',
      },
    })
  }

  function handleAddRow() {
    const newItem: ReviewItem = {
      id: generateId(),
      name: '',
      rawName: '',
      qty: 1,
      unit: 'db',
      price: 0,
      matchedProductName: null,
      conf: 1,
      isDuplicate: false,
      existingProductId: null,
      skip: false,
    }
    useOcrStore.setState({
      reviewItems: [...useOcrStore.getState().reviewItems, newItem],
    })
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Vissza"
          >
            <ChevronLeft size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Tételek ellenőrzése</Text>
          <Pressable
            style={styles.headerBtn}
            onPress={() =>
              Alert.alert(
                'Tételek ellenőrzése',
                'Amber jelzés: az OCR bizonytalanul ismerte fel a tételt. Szerkeszd a nevet, mennyiséget vagy árat. A kihagyott tételek nem kerülnek az árelőzménybe.\n\nA kereső ikonnal meglévő katalógusterméket kapcsolhatsz a sorhoz.'
              )
            }
            hitSlop={8}
            accessibilityLabel="Súgó"
          >
            <HelpCircle size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {reviewItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nincs tétel. Adj hozzá manuálisan.</Text>
            </View>
          ) : (
            reviewItems.map((item) => (
              <ReviewRow
                key={item.id}
                item={item}
                onUpdate={(patch) => updateReviewItem(item.id, patch)}
                onSkip={() => toggleSkip(item.id)}
                onSearchProduct={() => setPickerItemId(item.id)}
              />
            ))
          )}

          <Pressable
            style={styles.addRow}
            onPress={handleAddRow}
            accessibilityLabel="Tétel hozzáadása"
          >
            <Plus size={18} color="#2563EB" />
            <Text style={styles.addRowText}>Tétel hozzáadása</Text>
          </Pressable>
        </ScrollView>

        {/* Total card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{activeItems.length} tétel összesen</Text>
          <Text style={styles.totalValue}>{formatHuf(total)}</Text>
        </View>

        {/* CTA */}
        <View style={[styles.ctaRow, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Mentés a listába"
          >
            <Text style={styles.saveBtnText}>{saving ? 'Mentés...' : 'Árak rögzítése'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ProductPickerSheet
        visible={pickerItemId !== null}
        initialQuery={reviewItems.find((i) => i.id === pickerItemId)?.name ?? ''}
        products={products}
        onSelect={handlePickProduct}
        onClose={() => setPickerItemId(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// ReviewRow
// ---------------------------------------------------------------------------

interface ReviewRowProps {
  item: ReviewItem
  onUpdate: (patch: Partial<ReviewItem>) => void
  onSkip: () => void
  onSearchProduct: () => void
}

function ReviewRow({ item, onUpdate, onSkip, onSearchProduct }: ReviewRowProps) {
  const isLowConf = item.conf < LOW_CONF && !item.skip

  return (
    <View
      style={[styles.row, item.skip && styles.rowSkipped, isLowConf && styles.rowLowConf]}
    >
      {isLowConf && (
        <View style={styles.lowConfBadge}>
          <AlertTriangle size={12} color="#F59E0B" />
          <Text style={styles.lowConfText}>bizonytalan felismerés</Text>
        </View>
      )}

      {item.isDuplicate && !item.skip && (
        <View style={styles.duplicateBadge}>
          <Link2 size={10} color="#60A5FA" />
          <Text style={styles.duplicateText}>
            {item.matchedProductName && item.matchedProductName !== item.name
              ? `katalógus: "${item.matchedProductName}"`
              : 'katalógusban van'}
          </Text>
        </View>
      )}

      <View style={styles.rowBody}>
        {/* Name — teljes szélességű saját sor, hogy a hosszú magyar terméknevek elférjenek */}
        <TextInput
          style={[styles.nameInput, item.skip && styles.inputSkipped]}
          value={item.name}
          onChangeText={(t) => {
            const patch: Partial<ReviewItem> = { name: t }
            if (item.matchedProductName !== null) {
              patch.matchedProductName = null
              patch.isDuplicate = false
              patch.existingProductId = null
            }
            onUpdate(patch)
          }}
          editable={!item.skip}
          placeholder="Terméknév"
          placeholderTextColor="#4B5563"
          accessibilityLabel="Terméknév"
        />

        {/* Vezérlők sora: mennyiség + egység balra, ár + műveletek jobbra */}
        <View style={styles.controlsRow}>
          <View style={styles.qtyBlock}>
            <TextInput
              style={[styles.qtyInput, item.skip && styles.inputSkipped]}
              value={String(item.qty)}
              onChangeText={(t) => onUpdate({ qty: parseFloat(t) || 0 })}
              keyboardType="decimal-pad"
              editable={!item.skip}
              accessibilityLabel="Mennyiség"
            />
            <TextInput
              style={[styles.unitInput, item.skip && styles.inputSkipped]}
              value={item.unit ?? 'db'}
              onChangeText={(t) => onUpdate({ unit: t })}
              editable={!item.skip}
              accessibilityLabel="Egység"
            />
          </View>

          <View style={styles.rightBlock}>
            <TextInput
              style={[styles.priceInput, item.skip && styles.inputSkipped]}
              value={String(item.price)}
              onChangeText={(t) => onUpdate({ price: parseInt(t, 10) || 0 })}
              keyboardType="number-pad"
              editable={!item.skip}
              accessibilityLabel="Ár"
            />
            {!item.skip && (
              <Pressable
                style={styles.searchBtn}
                onPress={onSearchProduct}
                hitSlop={8}
                accessibilityLabel="Katalógustermék keresése"
              >
                <Search size={16} color="#60A5FA" />
              </Pressable>
            )}
            <Pressable
              style={styles.skipBtn}
              onPress={onSkip}
              hitSlop={8}
              accessibilityLabel={item.skip ? 'Visszaállítás' : 'Kihagyás'}
            >
              <Trash2 size={18} color={item.skip ? '#6B7280' : '#EF4444'} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// ProductPickerSheet
// ---------------------------------------------------------------------------

interface ProductPickerSheetProps {
  visible: boolean
  initialQuery: string
  products: Product[]
  onSelect: (product: Product) => void
  onClose: () => void
}

function ProductPickerSheet({
  visible,
  initialQuery,
  products,
  onSelect,
  onClose,
}: ProductPickerSheetProps) {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  // Nyitáskor előtöltjük a tétel nevével, hogy a blokkból kiolvasott névhez
  // azonnal megjelenjenek a releváns katalógustermékek.
  useEffect(() => {
    if (visible) setQuery(initialQuery)
  }, [visible, initialQuery])

  const filtered = searchProducts(query, products)

  function handleClose() {
    setQuery('')
    onClose()
  }

  function handleSelect(product: Product) {
    setQuery('')
    onSelect(product)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[pickerStyles.container, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={[pickerStyles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={pickerStyles.title}>Katalógustermék keresése</Text>
          <Pressable
            style={pickerStyles.closeBtn}
            onPress={handleClose}
            hitSlop={8}
            accessibilityLabel="Bezárás"
          >
            <X size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Search input */}
        <View style={pickerStyles.searchRow}>
          <Search size={16} color="#6B7280" style={pickerStyles.searchIcon} />
          <TextInput
            style={pickerStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Terméknév keresése..."
            placeholderTextColor="#4B5563"
            autoFocus
            clearButtonMode="while-editing"
            accessibilityLabel="Terméknév keresése"
          />
        </View>

        {filtered.length === 0 ? (
          <View style={pickerStyles.empty}>
            <Text style={pickerStyles.emptyText}>Nincs találat</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={pickerStyles.list}
            ItemSeparatorComponent={() => <View style={pickerStyles.separator} />}
            renderItem={({ item: product }) => (
              <Pressable
                style={({ pressed }) => [
                  pickerStyles.productRow,
                  pressed && pickerStyles.productRowPressed,
                ]}
                onPress={() => handleSelect(product)}
                accessibilityLabel={`Kiválaszt: ${product.name}`}
              >
                <View style={pickerStyles.productInfo}>
                  <Text style={pickerStyles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  {product.brand ? (
                    <Text style={pickerStyles.productBrand} numberOfLines={1}>
                      {product.brand}
                    </Text>
                  ) : null}
                </View>
                {product.price != null && product.price > 0 ? (
                  <Text style={pickerStyles.productPrice}>{formatHuf(product.price)}</Text>
                ) : null}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 24 },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
  row: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSkipped: {
    opacity: 0.4,
  },
  rowLowConf: {
    borderColor: '#F59E0B',
  },
  lowConfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  lowConfText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '500',
  },
  duplicateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37,99,235,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  duplicateText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '500',
  },
  rowBody: {
    gap: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  qtyBlock: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  qtyInput: {
    width: 44,
    height: 40,
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  unitInput: {
    width: 36,
    height: 40,
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  nameInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  rightBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceInput: {
    width: 68,
    height: 40,
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    textAlign: 'right',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSkipped: {
    color: '#4B5563',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addRowText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  totalLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  totalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaRow: {
    paddingHorizontal: 16,
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#1F2937',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  productRowPressed: {
    opacity: 0.6,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  productBrand: {
    color: '#6B7280',
    fontSize: 13,
  },
  productPrice: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
})
