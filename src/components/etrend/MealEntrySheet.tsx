import { useEffect, useState } from 'react'
import {
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
import { Check, Clock, Plus, Tag, Users, UsersRound, UtensilsCrossed, X } from 'lucide-react-native'

import { ProductPickerSheet } from './ProductPickerSheet'
import { MEAL_TYPES } from '@/lib/recipes'
import { formatHuf } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { colors } from '@/constants/colors'
import type { FamilyMemberLocal, MealType, Product, Recipe } from '@/types'

export interface MealEntryTarget {
  date: string
  mealType: MealType
  weekdayLabel: string
}

interface ProductDraft {
  item_name: string
  product_id: string | null
  quantity: number
  unit: string
}

interface MealEntrySheetProps {
  visible: boolean
  target: MealEntryTarget | null
  members: FamilyMemberLocal[]
  recipes: Recipe[]
  products: Product[]
  onClose: () => void
  onAddRecipe: (memberId: string | null, recipeId: string, servings: number) => void
  onAddProduct: (memberId: string | null, item: ProductDraft) => void
  onManageMembers: () => void
  onNewRecipe: () => void
}

type Mode = 'recept' | 'termék'

export function MealEntrySheet({
  visible,
  target,
  members,
  recipes,
  products,
  onClose,
  onAddRecipe,
  onAddProduct,
  onManageMembers,
  onNewRecipe,
}: MealEntrySheetProps) {
  const dark = useColorScheme() === 'dark'

  const [memberId, setMemberId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('recept')
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [pName, setPName] = useState('')
  const [pProductId, setPProductId] = useState<string | null>(null)
  const [pQty, setPQty] = useState('1')
  const [pUnit, setPUnit] = useState('db')
  const [flash, setFlash] = useState(false) // „Hozzáadva" visszajelzés

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
    if (visible) {
      setMode('recept')
      setMemberId(null)
      setPName('')
      setPProductId(null)
      setPQty('1')
      setPUnit('db')
      setFlash(false)
    }
  }, [visible, translateY])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground
  const sunken = dark ? colors.darkBackground : colors.surfaceSunken

  const mealLabel = target ? MEAL_TYPES.find((m) => m.key === target.mealType)?.label : ''
  const title = target ? `${target.weekdayLabel} · ${mealLabel}` : ''

  function showFlash() {
    setFlash(true)
    setTimeout(() => setFlash(false), 1100)
  }

  function pickRecipe(r: Recipe) {
    if (!target) return
    haptics.light()
    onAddRecipe(memberId, r.id, r.servings && r.servings > 0 ? r.servings : 4)
    showFlash()
  }

  function handlePickProduct(p: Product) {
    setPName(p.name)
    setPProductId(p.id)
    setPUnit(p.unit || 'db')
    setProductPickerOpen(false)
    haptics.selection()
  }

  function parseQty(raw: string): number {
    const n = Number(raw.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : 1
  }

  function addProduct() {
    if (!target) return
    const name = pName.trim()
    if (!name) return
    haptics.light()
    onAddProduct(memberId, {
      item_name: name,
      product_id: pProductId,
      quantity: parseQty(pQty),
      unit: pUnit.trim() || 'db',
    })
    setPName('')
    setPProductId(null)
    setPQty('1')
    setPUnit('db')
    showFlash()
  }

  const linkedProduct = pProductId ? products.find((p) => p.id === pProductId) ?? null : null

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3, flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            {flash ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8 }}>
                <Check size={15} color={colors.success} strokeWidth={3} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.success }}>Hozzáadva</Text>
              </View>
            ) : null}
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Tag-választó */}
          <View style={{ paddingLeft: 18, paddingBottom: 4 }}>
            <Text className="text-muted" style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 }}>
              KINEK
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 14 }}>
            <MemberChip
              label="Közös"
              color={colors.muted}
              active={memberId === null}
              onPress={() => setMemberId(null)}
              icon
              dark={dark}
            />
            {members.map((m) => (
              <MemberChip
                key={m.id}
                label={m.name}
                color={m.color}
                active={memberId === m.id}
                onPress={() => setMemberId(m.id)}
                dark={dark}
              />
            ))}
            <Pressable
              onPress={onManageMembers}
              accessibilityLabel="Tagok kezelése"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1.5, borderStyle: 'dashed', borderColor: fieldBorder }}
            >
              <UsersRound size={15} color={colors.muted} strokeWidth={2} />
              <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>Tagok</Text>
            </Pressable>
          </ScrollView>

          {/* Mód-váltó */}
          <View style={{ marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', gap: 6, padding: 4, borderRadius: 14, backgroundColor: sunken }}>
            <ModeTab label="Recept" active={mode === 'recept'} onPress={() => setMode('recept')} dark={dark} />
            <ModeTab label="Termék" active={mode === 'termék'} onPress={() => setMode('termék')} dark={dark} />
          </View>

          {mode === 'recept' ? (
            <RecipeList
              recipes={recipes}
              fieldBg={fieldBg}
              fieldBorder={fieldBorder}
              onPick={pickRecipe}
              onNewRecipe={onNewRecipe}
            />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Termék a katalógusból */}
              <Pressable
                onPress={() => setProductPickerOpen(true)}
                accessibilityLabel="Termék választása a katalógusból"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.3)', backgroundColor: 'rgba(20,184,166,0.06)', marginBottom: 14 }}
              >
                <Tag size={18} color={colors.primary} strokeWidth={2.2} />
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '800', color: colors.primary }} numberOfLines={1}>
                  {linkedProduct ? linkedProduct.name : 'Termék a katalógusból (ár)'}
                </Text>
                {linkedProduct?.price != null ? (
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.primary }}>
                    {formatHuf(linkedProduct.price)}
                  </Text>
                ) : null}
              </Pressable>

              <Text style={styles.label} className="text-muted">MEGNEVEZÉS</Text>
              <TextInput
                value={pName}
                onChangeText={(t) => {
                  setPName(t)
                  if (pProductId) setPProductId(null) // kézi szerkesztés → kötés bontása
                }}
                placeholder="Pl. burgonyás pogácsa"
                placeholderTextColor="#C2C6C4"
                style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                <View style={{ width: 110 }}>
                  <Text style={styles.label} className="text-muted">MENNYISÉG</Text>
                  <TextInput
                    value={pQty}
                    onChangeText={setPQty}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#C2C6C4"
                    style={[styles.input, { textAlign: 'center', backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label} className="text-muted">EGYSÉG</Text>
                  <TextInput
                    value={pUnit}
                    onChangeText={setPUnit}
                    placeholder="db / g / dkg"
                    placeholderTextColor="#C2C6C4"
                    style={[styles.input, { backgroundColor: fieldBg, borderColor: fieldBorder, color: fg }]}
                  />
                </View>
              </View>

              <Pressable
                onPress={addProduct}
                disabled={!pName.trim()}
                accessibilityLabel="Termék hozzáadása az étkezéshez"
                style={{ marginTop: 18, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.primary, opacity: pName.trim() ? 1 : 0.5 }}
              >
                <Plus size={20} color={colors.primaryForeground} strokeWidth={2.6} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>
                  Hozzáadás
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      <ProductPickerSheet
        visible={productPickerOpen}
        products={products}
        title="Termék kiválasztása"
        onClose={() => setProductPickerOpen(false)}
        onPick={handlePickProduct}
      />
    </Modal>
  )
}

// ─── Segéd-komponensek ────────────────────────────────────────────────────────
function MemberChip({
  label,
  color,
  active,
  onPress,
  dark,
  icon,
}: {
  label: string
  color: string
  active: boolean
  onPress: () => void
  dark: boolean
  icon?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} kiválasztása`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        height: 38,
        paddingLeft: 8,
        paddingRight: 14,
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: active ? color : dark ? colors.darkBorder : colors.border,
        backgroundColor: active ? `${color}1A` : dark ? colors.darkCard : colors.card,
      }}
    >
      {icon ? (
        <View style={{ width: 22, height: 22, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
          <Users size={12} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      ) : (
        <View style={{ width: 22, height: 22, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{label.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={{ fontSize: 13.5, fontWeight: '800', color: active ? color : colors.muted }}>{label}</Text>
    </Pressable>
  )
}

function ModeTab({ label, active, onPress, dark }: { label: string; active: boolean; onPress: () => void; dark: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={{ flex: 1 }}>
      <View
        className={active ? 'bg-card dark:bg-dark-card' : undefined}
        style={[
          { height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
          active
            ? { shadowColor: '#1C2B2A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
            : null,
        ]}
      >
        <Text style={{ fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, color: active ? (dark ? colors.darkForeground : colors.foreground) : colors.muted }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

function RecipeList({
  recipes,
  fieldBg,
  fieldBorder,
  onPick,
  onNewRecipe,
}: {
  recipes: Recipe[]
  fieldBg: string
  fieldBorder: string
  onPick: (r: Recipe) => void
  onNewRecipe: () => void
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 10 }} showsVerticalScrollIndicator={false}>
      <Pressable
        onPress={onNewRecipe}
        accessibilityLabel="Új recept létrehozása"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(20,184,166,0.35)' }}
      >
        <Plus size={18} color={colors.primary} strokeWidth={2.4} />
        <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.primary, letterSpacing: -0.2 }}>Új recept</Text>
      </Pressable>

      {recipes.length === 0 ? (
        <Text className="text-muted" style={{ textAlign: 'center', marginTop: 24, fontSize: 13.5, fontWeight: '600', paddingHorizontal: 24 }}>
          Még nincs recepted. Hozz létre egyet a fenti gombbal, vagy adj hozzá terméket a „Termék” fülön.
        </Text>
      ) : (
        recipes.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onPick(r)}
            accessibilityRole="button"
            accessibilityLabel={`${r.name} hozzáadása`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg }}>
              <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.12)' }}>
                <UtensilsCrossed size={23} color={colors.primary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="text-foreground dark:text-dark-foreground" numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>
                  {r.name}
                </Text>
                <View style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {r.servings != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Users size={13} color={colors.muted} strokeWidth={2} />
                      <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>{r.servings} adag</Text>
                    </View>
                  ) : null}
                  {r.prep_time != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color={colors.muted} strokeWidth={2} />
                      <Text className="text-muted" style={{ fontSize: 12, fontWeight: '700' }}>{r.prep_time} perc</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Plus size={20} color={colors.primary} strokeWidth={2.4} />
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginLeft: 2, marginBottom: 7 },
  input: { width: '100%', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },
})
