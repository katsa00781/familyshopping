import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Plus, Tag, Trash2, X } from 'lucide-react-native'

import { ProductPickerSheet } from './ProductPickerSheet'
import { useProductStore } from '@/store/productStore'
import { haptics } from '@/lib/haptics'
import { formatHuf } from '@/lib/format'
import { colors } from '@/constants/colors'
import type {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeInput,
} from '@/types'

interface IngredientRow {
  name: string
  quantity: string
  unit: string
  productId: string | null
}

interface RecipeEditorSheetProps {
  visible: boolean
  recipe: Recipe | null // null = új recept
  ingredients: RecipeIngredient[] // a szerkesztett recept meglévő hozzávalói
  onClose: () => void
  onSave: (input: RecipeInput, ingredients: RecipeIngredientInput[], id: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const EMPTY_ROW: IngredientRow = { name: '', quantity: '', unit: '', productId: null }

function parseQuantity(raw: string): number {
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function RecipeEditorSheet({
  visible,
  recipe,
  ingredients,
  onClose,
  onSave,
  onDelete,
}: RecipeEditorSheetProps) {
  const dark = useColorScheme() === 'dark'
  const isEdit = recipe !== null

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const productsById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const [name, setName] = useState('')
  const [servings, setServings] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [rows, setRows] = useState<IngredientRow[]>([{ ...EMPTY_ROW }])
  const [saving, setSaving] = useState(false)
  const [pickerRow, setPickerRow] = useState<number | null>(null) // melyik sorhoz választunk terméket

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
  }, [visible, translateY])

  // Termékek betöltése (a hozzávaló ↔ termék összekötéshez)
  useEffect(() => {
    if (visible) void loadProducts()
  }, [visible, loadProducts])

  // Mezők feltöltése nyitáskor
  useEffect(() => {
    if (!visible) return
    if (recipe) {
      setName(recipe.name)
      setServings(recipe.servings != null ? String(recipe.servings) : '')
      setPrepTime(recipe.prep_time != null ? String(recipe.prep_time) : '')
      setDescription(recipe.description ?? '')
      setInstructions(recipe.instructions ?? '')
      const existing = ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity ? String(i.quantity) : '',
        unit: i.unit,
        productId: i.product_id,
      }))
      setRows(existing.length > 0 ? existing : [{ ...EMPTY_ROW }])
    } else {
      setName('')
      setServings('')
      setPrepTime('')
      setDescription('')
      setInstructions('')
      setRows([{ ...EMPTY_ROW }])
    }
    setSaving(false)
  }, [visible, recipe, ingredients])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground
  const sunken = dark ? colors.darkBackground : '#F4F2ED'

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function addRow() {
    haptics.selection()
    setRows((prev) => [...prev, { ...EMPTY_ROW }])
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, i) => i !== index)))
  }

  function handlePickProduct(product: Product) {
    if (pickerRow === null) return
    haptics.selection()
    setRows((prev) =>
      prev.map((r, i) =>
        i === pickerRow
          ? {
              ...r,
              productId: product.id,
              name: r.name.trim() || product.name,
              unit: r.unit.trim() || product.unit,
            }
          : r,
      ),
    )
    setPickerRow(null)
  }

  function unlinkRow(index: number) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, productId: null } : r)))
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName || saving) return

    const input: RecipeInput = {
      name: trimmedName,
      description: description.trim() || null,
      prep_time: parseQuantity(prepTime) || null,
      servings: parseQuantity(servings) || null,
      instructions: instructions.trim() || null,
    }
    // Csak a kitöltött (név + pozitív mennyiség + egység) sorokat mentjük.
    const ingredientInputs: RecipeIngredientInput[] = rows
      .map((r) => ({
        name: r.name.trim(),
        quantity: parseQuantity(r.quantity),
        unit: r.unit.trim(),
        product_id: r.productId,
      }))
      .filter((r) => r.name.length > 0 && r.quantity > 0 && r.unit.length > 0)

    setSaving(true)
    try {
      await onSave(input, ingredientInputs, recipe?.id ?? null)
      haptics.success()
      onClose()
    } catch {
      setSaving(false)
      haptics.warning()
      Alert.alert('Mentés sikertelen', 'A recept mentése nem sikerült. Próbáld újra.')
    }
  }

  function handleDelete() {
    if (!recipe) return
    Alert.alert(
      'Recept törlése',
      `Biztosan törlöd: „${recipe.name}"? A hozzá tartozó hozzávalók és étrend-bejegyzések is törlődnek.`,
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: () => {
            void onDelete(recipe.id)
              .then(() => {
                haptics.success()
                onClose()
              })
              .catch(() => {
                haptics.warning()
                Alert.alert('Törlés sikertelen', 'A recept törlése nem sikerült. Próbáld újra.')
              })
          },
        },
      ],
    )
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          {/* Grab + fejléc */}
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3 }}>
              {isEdit ? 'Recept szerkesztése' : 'Új recept'}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Név */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">NÉV</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Pl. Bolognai spagetti"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }]}
              />
            </View>

            {/* Adag + idő */}
            <View style={{ marginBottom: 18, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label} className="text-muted">ADAG</Text>
                <TextInput
                  value={servings}
                  onChangeText={setServings}
                  placeholder="4"
                  placeholderTextColor="#C2C6C4"
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label} className="text-muted">IDŐ · perc</Text>
                <TextInput
                  value={prepTime}
                  onChangeText={setPrepTime}
                  placeholder="30"
                  placeholderTextColor="#C2C6C4"
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                />
              </View>
            </View>

            {/* Hozzávalók */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">HOZZÁVALÓK</Text>
              <View style={{ gap: 10 }}>
                {rows.map((row, i) => {
                  const linked = row.productId ? productsById.get(row.productId) ?? null : null
                  return (
                    <View key={i} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          value={row.name}
                          onChangeText={(t) => updateRow(i, { name: t })}
                          placeholder="Hozzávaló"
                          placeholderTextColor="#C2C6C4"
                          style={[styles.ingInput, { flex: 1, backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                        />
                        <TextInput
                          value={row.quantity}
                          onChangeText={(t) => updateRow(i, { quantity: t })}
                          placeholder="0"
                          placeholderTextColor="#C2C6C4"
                          keyboardType="decimal-pad"
                          style={[styles.ingInput, { width: 50, textAlign: 'center', backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                        />
                        <TextInput
                          value={row.unit}
                          onChangeText={(t) => updateRow(i, { unit: t })}
                          placeholder="db"
                          placeholderTextColor="#C2C6C4"
                          style={[styles.ingInput, { width: 54, textAlign: 'center', backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                        />
                        <Pressable
                          onPress={() => setPickerRow(i)}
                          accessibilityLabel="Termékhez kötés"
                          hitSlop={6}
                          style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: linked ? colors.primary : sunken }}
                        >
                          <Tag size={16} color={linked ? colors.primaryForeground : colors.muted} strokeWidth={2} />
                        </Pressable>
                        <Pressable
                          onPress={() => removeRow(i)}
                          accessibilityLabel="Hozzávaló eltávolítása"
                          hitSlop={6}
                          style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: sunken }}
                        >
                          <Trash2 size={16} color={colors.muted} strokeWidth={2} />
                        </Pressable>
                      </View>

                      {/* Termék-link chip (ár forrása a bevásárlólistához) */}
                      {linked ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingLeft: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 9, paddingRight: 6, height: 26, borderRadius: 99, backgroundColor: 'rgba(20,184,166,0.10)' }}>
                            <Tag size={12} color={colors.primary} strokeWidth={2.4} />
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.primary }} numberOfLines={1}>
                              {linked.name}
                              {linked.price != null ? ` · ${formatHuf(linked.price)}` : ''}
                            </Text>
                            <Pressable
                              onPress={() => unlinkRow(i)}
                              accessibilityLabel="Termék-kötés törlése"
                              hitSlop={8}
                              style={{ width: 18, height: 18, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.18)' }}
                            >
                              <X size={11} color={colors.primary} strokeWidth={3} />
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )
                })}
              </View>
              <Pressable
                onPress={addRow}
                accessibilityLabel="Hozzávaló hozzáadása"
                style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.3)', borderStyle: 'dashed' }}
              >
                <Plus size={17} color={colors.primary} strokeWidth={2.4} />
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.primary, letterSpacing: -0.2 }}>Hozzávaló</Text>
              </Pressable>
            </View>

            {/* Leírás */}
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label} className="text-muted">LEÍRÁS · opcionális</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Rövid leírás…"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, fontSize: 15.5, fontWeight: '600' }]}
              />
            </View>

            {/* Elkészítés */}
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label} className="text-muted">ELKÉSZÍTÉS · opcionális</Text>
              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Lépésről lépésre…"
                placeholderTextColor="#C2C6C4"
                multiline
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg, minHeight: 100, fontSize: 15.5, fontWeight: '600', textAlignVertical: 'top' }]}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: fieldBorder, gap: 10 }} className="bg-background dark:bg-dark-background">
            {isEdit ? (
              <Pressable onPress={handleDelete} accessibilityLabel="Recept törlése" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 9 }}>
                <Trash2 size={17} color={colors.destructive} strokeWidth={2} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.destructive, letterSpacing: -0.2 }}>Recept törlése</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSave}
              disabled={!name.trim() || saving}
              accessibilityLabel="Recept mentése"
              style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', backgroundColor: colors.primary, opacity: name.trim() && !saving ? 1 : 0.5 }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>
                {saving ? 'Mentés…' : 'Mentés'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <ProductPickerSheet
        visible={pickerRow !== null}
        products={products}
        title="Hozzávaló terméke"
        onClose={() => setPickerRow(null)}
        onPick={handlePickProduct}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1, marginLeft: 2, marginBottom: 7 },
  input: { width: '100%', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  ingInput: { borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
})
