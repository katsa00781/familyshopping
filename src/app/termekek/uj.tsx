import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AlertTriangle, X } from 'lucide-react-native'

import { useProductStore } from '@/store/productStore'
import { useToastStore } from '@/store/toastStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { ItemCategory } from '@/types'

const CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']
const UNITS = ['db', 'kg', 'g', 'l', 'ml']

type FormState = {
  name: string
  brand: string
  category: ItemCategory | ''
  unit: string
  store_name: string
  price: string
  barcode: string
}

type FormErrors = {
  name?: string
  category?: string
  unit?: string
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card p-4 mb-4">
      <Text className="text-body-sm font-semibold text-muted uppercase tracking-widest mb-4">
        {title}
      </Text>
      <View className="gap-4">{children}</View>
    </View>
  )
}

function ChipSelector({
  options,
  value,
  onSelect,
  error,
}: {
  options: string[]
  value: string
  onSelect: (v: string) => void
  error?: string
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              className={`h-8 px-4 rounded-fab items-center justify-center ${
                selected
                  ? 'bg-primary'
                  : 'bg-background dark:bg-dark-background border border-border dark:border-dark-border'
              }`}
              style={({ pressed }) => (pressed ? { opacity: 0.75 } : undefined)}
            >
              <Text
                className={`text-body-sm font-semibold ${
                  selected ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                }`}
              >
                {opt}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error && <Text className="text-[12px] leading-4 text-destructive">{error}</Text>}
    </View>
  )
}

export default function ProductAddScreen() {
  const router = useRouter()
  const dark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const { id: editId } = useLocalSearchParams<{ id?: string }>()

  const products = useProductStore((s) => s.products)
  const upsertProduct = useProductStore((s) => s.upsertProduct)
  const showToast = useToastStore((s) => s.showToast)

  const isEdit = !!editId
  const existingProduct = isEdit ? products.find((p) => p.id === editId) : null

  const [form, setFormState] = useState<FormState>({
    name: existingProduct?.name ?? '',
    brand: existingProduct?.brand ?? '',
    category: (existingProduct?.category as ItemCategory) ?? '',
    unit: existingProduct?.unit ?? '',
    store_name: existingProduct?.store_name ?? '',
    price: existingProduct?.price != null ? String(existingProduct.price) : '',
    barcode: existingProduct?.barcode ?? '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }))
    if (isDuplicate) setIsDuplicate(false)
  }

  function validateAll(): boolean {
    const nameOk = form.name.trim().length > 0
    const catOk = form.category.length > 0
    const unitOk = form.unit.length > 0
    setErrors({
      name: nameOk ? undefined : 'A termék neve kötelező',
      category: catOk ? undefined : 'A kategória megadása kötelező',
      unit: unitOk ? undefined : 'Az egység megadása kötelező',
    })
    return nameOk && catOk && unitOk
  }

  async function handleSave() {
    if (!validateAll()) return
    setIsSaving(true)
    setIsDuplicate(false)

    const parsedPrice = form.price.trim() ? parseFloat(form.price.replace(',', '.')) : null

    try {
      await upsertProduct({
        id: editId,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        unit: form.unit,
        store_name: form.store_name.trim() || null,
        price: parsedPrice != null && !isNaN(parsedPrice) ? parsedPrice : null,
        barcode: form.barcode.trim() || null,
      })
      showToast(isEdit ? 'Termék frissítve' : 'Termék hozzáadva', 'success')
      router.back()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'DUPLICATE') {
        setIsDuplicate(true)
      } else {
        showToast(msg || 'Mentés sikertelen', 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Nav bar */}
      <View
        className="flex-row items-center px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 56 }}
      >
        <Pressable
          className="w-tap h-tap items-center justify-center -ml-2"
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          onPress={() => router.back()}
        >
          <X size={22} color={dark ? '#F8FAFC' : '#0F172A'} />
        </Pressable>

        <Text className="flex-1 text-body-lg font-semibold text-foreground dark:text-dark-foreground text-center">
          {isEdit ? 'Termék szerkesztése' : 'Új termék'}
        </Text>

        {/* Spacer keeps title centered */}
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Duplicate warning banner */}
          {isDuplicate && (
            <View
              className="flex-row items-start gap-3 rounded-card p-3 mb-4 border border-amber-300"
              style={{ backgroundColor: '#FFFBEB' }}
            >
              <AlertTriangle size={18} color="#D97706" />
              <Text className="flex-1 text-body-sm" style={{ color: '#92400E' }}>
                Már létezik ilyen nevű termék ebben a kategóriában. Ellenőrizd a nevet és a márkát!
              </Text>
            </View>
          )}

          {/* 1. Alapadatok */}
          <GroupCard title="Alapadatok">
            <Input
              label="Termék neve *"
              value={form.name}
              onChangeText={(v) => {
                setField('name', v)
                if (errors.name && v.trim()) setErrors((p) => ({ ...p, name: undefined }))
              }}
              placeholder="pl. Tej"
              error={errors.name}
            />

            <Input
              label="Márka"
              value={form.brand}
              onChangeText={(v) => setField('brand', v)}
              placeholder="pl. Mizo"
            />

            <View className="gap-1.5">
              <Text className="text-[13px] leading-[18px] font-medium text-[#475569] dark:text-muted">
                Kategória *
              </Text>
              <ChipSelector
                options={CATEGORIES}
                value={form.category}
                onSelect={(v) => {
                  setField('category', v as ItemCategory)
                  setErrors((p) => ({ ...p, category: undefined }))
                }}
                error={errors.category}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[13px] leading-[18px] font-medium text-[#475569] dark:text-muted">
                Egység *
              </Text>
              <ChipSelector
                options={UNITS}
                value={form.unit}
                onSelect={(v) => {
                  setField('unit', v)
                  setErrors((p) => ({ ...p, unit: undefined }))
                }}
                error={errors.unit}
              />
            </View>
          </GroupCard>

          {/* 2. Bolt + ár */}
          <GroupCard title="Bolt és ár">
            <Input
              label="Bolt neve"
              value={form.store_name}
              onChangeText={(v) => setField('store_name', v)}
              placeholder="pl. Tesco"
            />
            <Input
              label="Ár (Ft)"
              value={form.price}
              onChangeText={(v) => setField('price', v)}
              placeholder="pl. 389"
              type="number"
              suffix="Ft"
            />
          </GroupCard>

          {/* 3. Azonosítók */}
          <GroupCard title="Azonosítók">
            <Input
              label="Vonalkód"
              value={form.barcode}
              onChangeText={(v) => setField('barcode', v)}
              placeholder="pl. 5999887612345"
              type="number"
            />
          </GroupCard>

          {/* 4. Kép – v1-ben nincs */}
          <GroupCard title="Kép">
            <View className="h-20 rounded-card border-2 border-dashed border-border dark:border-dark-border items-center justify-center">
              <Text className="text-body-sm text-muted">Kép feltöltés hamarosan</Text>
            </View>
          </GroupCard>
        </ScrollView>

        {/* Sticky Mentés CTA */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-background dark:bg-dark-background border-t border-border dark:border-dark-border px-screen-x pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Button variant="primary" size="lg" fullWidth loading={isSaving} onPress={handleSave}>
            {isEdit ? 'Mentés' : 'Termék hozzáadása'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F5F9' },
  pressed: { opacity: 0.75 },
})
