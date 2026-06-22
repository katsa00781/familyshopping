import { useEffect } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Clock, NotebookPen, Pencil, Plus, Trash2, UtensilsCrossed, Users, X } from 'lucide-react-native'

import { MEAL_TYPES } from '@/lib/recipes'
import { colors } from '@/constants/colors'
import type { MealType, Recipe } from '@/types'

export interface PickerTarget {
  date: string
  mealType: MealType
  weekdayLabel: string
  existingEntryId: string | null
}

interface RecipePickerSheetProps {
  visible: boolean
  recipes: Recipe[]
  target: PickerTarget | null // null = böngésző (receptkönyv) mód
  onClose: () => void
  onPick: (recipeId: string) => void
  onRemove: (entryId: string) => void
  onNewRecipe: () => void
  onEditRecipe: (recipe: Recipe) => void
}

export function RecipePickerSheet({
  visible,
  recipes,
  target,
  onClose,
  onPick,
  onRemove,
  onNewRecipe,
  onEditRecipe,
}: RecipePickerSheetProps) {
  const dark = useColorScheme() === 'dark'

  const translateY = useSharedValue(900)
  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 900, { duration: visible ? 300 : 250 })
  }, [visible, translateY])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const fieldBg = dark ? colors.darkCard : colors.card
  const fieldBorder = dark ? colors.darkBorder : colors.border
  const fg = dark ? colors.darkForeground : colors.foreground

  const mealLabel = target ? MEAL_TYPES.find((m) => m.key === target.mealType)?.label : null
  const title = target ? `${target.weekdayLabel} · ${mealLabel}` : 'Receptkönyv'

  function handlePick(recipeId: string) {
    if (!target) return
    onPick(recipeId)
    onClose()
  }

  function handleRemove() {
    if (!target?.existingEntryId) return
    onRemove(target.existingEntryId)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onClose} />

        <Animated.View
          className="bg-background dark:bg-dark-background"
          style={[{ height: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, sheetStyle]}
        >
          {/* Grab + fejléc */}
          <View style={{ paddingTop: 10, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 99, backgroundColor: dark ? colors.darkBorder : '#D7D3CA' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 6 }}>
            <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.3, flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel="Bezárás" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
              <X size={17} color={fg} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Segédszöveg */}
          <Text className="text-muted" style={{ paddingHorizontal: 18, paddingBottom: 10, fontSize: 13, fontWeight: '600' }}>
            {target
              ? 'Válassz receptet ehhez az étkezéshez.'
              : 'Koppints egy receptre a szerkesztéshez, vagy hozz létre újat.'}
          </Text>

          {/* Új recept (mindkét módban elérhető) */}
          <Pressable
            onPress={onNewRecipe}
            accessibilityLabel="Új recept létrehozása"
            style={{ marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16, backgroundColor: colors.primary }}
          >
            <Plus size={19} color={colors.primaryForeground} strokeWidth={2.6} />
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>
              Új recept
            </Text>
          </Pressable>

          {/* Eltávolítás (ha a slothoz már tartozik recept) */}
          {target?.existingEntryId ? (
            <Pressable
              onPress={handleRemove}
              accessibilityLabel="Recept eltávolítása erről a napról"
              style={{ marginHorizontal: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.destructive, letterSpacing: -0.2 }}>
                Recept eltávolítása
              </Text>
            </Pressable>
          ) : null}

          {recipes.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.10)', marginBottom: 4 }}>
                <NotebookPen size={30} color={colors.primary} strokeWidth={1.75} />
              </View>
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                Még nincs recepted
              </Text>
              <Text className="text-muted" style={{ fontSize: 13.5, fontWeight: '600', textAlign: 'center' }}>
                Koppints a fenti „Új recept” gombra az első recept létrehozásához. Hozzávalókkal
                a bevásárlólista is pontosabb lesz.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 10 }} showsVerticalScrollIndicator={false}>
              {recipes.map((r) => {
                const row = (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,184,166,0.12)' }}>
                      <UtensilsCrossed size={24} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text className="text-foreground dark:text-dark-foreground" numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 }}>
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
                    {!target ? (
                      <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.darkBorder : 'rgba(28,43,42,0.06)' }}>
                        <Pencil size={16} color={colors.muted} strokeWidth={2} />
                      </View>
                    ) : null}
                  </View>
                )

                return (
                  <Pressable
                    key={r.id}
                    onPress={() => (target ? handlePick(r.id) : onEditRecipe(r))}
                    accessibilityRole="button"
                    accessibilityLabel={target ? `${r.name} kiválasztása` : `${r.name} szerkesztése`}
                    style={({ pressed }) => [
                      { borderRadius: 18, padding: 12, borderWidth: 1.5, borderColor: fieldBorder, backgroundColor: fieldBg, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    {row}
                  </Pressable>
                )
              })}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}
