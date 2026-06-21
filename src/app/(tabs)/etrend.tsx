import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BookOpen, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react-native'

import { DayCard } from '@/components/etrend/DayCard'
import { RecipePickerSheet, type PickerTarget } from '@/components/etrend/RecipePickerSheet'
import { useMealPlanStore } from '@/store/mealPlanStore'
import { useListStore } from '@/store/listStore'
import { useToastStore } from '@/store/toastStore'
import { dayKey } from '@/lib/calendar'
import {
  addDays,
  buildShoppingItems,
  isoWeekNumber,
  startOfWeek,
  weekDays,
  weekRangeLabel,
  weekdayFull,
} from '@/lib/recipes'
import { haptics } from '@/lib/haptics'
import { colors } from '@/constants/colors'
import type { MealPlanEntry, MealType, Recipe, RecipeIngredient } from '@/types'

export default function EtrendScreen() {
  const router = useRouter()

  const recipes = useMealPlanStore((s) => s.recipes)
  const ingredients = useMealPlanStore((s) => s.ingredients)
  const entries = useMealPlanStore((s) => s.entries)
  const loadAll = useMealPlanStore((s) => s.loadAll)
  const assignRecipe = useMealPlanStore((s) => s.assignRecipe)
  const removeEntry = useMealPlanStore((s) => s.removeEntry)

  const createListWithItems = useListStore((s) => s.createListWithItems)
  const setActiveListId = useListStore((s) => s.setActiveListId)
  const showToast = useToastStore((s) => s.showToast)

  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const [sheetVisible, setSheetVisible] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const todayKey = dayKey(today)

  const recipesById = useMemo(() => {
    const m = new Map<string, Recipe>()
    for (const r of recipes) m.set(r.id, r)
    return m
  }, [recipes])

  const ingredientsByRecipe = useMemo(() => {
    const m = new Map<string, RecipeIngredient[]>()
    for (const ing of ingredients) {
      const arr = m.get(ing.recipe_id) ?? []
      arr.push(ing)
      m.set(ing.recipe_id, arr)
    }
    return m
  }, [ingredients])

  // nap (YYYY-MM-DD) → (étkezés → tétel)
  const entriesByDay = useMemo(() => {
    const m = new Map<string, Map<MealType, MealPlanEntry>>()
    for (const e of entries) {
      const inner = m.get(e.date) ?? new Map<MealType, MealPlanEntry>()
      inner.set(e.meal_type, e)
      m.set(e.date, inner)
    }
    return m
  }, [entries])

  function isSelectable(key: string): boolean {
    return (entriesByDay.get(key)?.size ?? 0) > 0
  }
  function isSelected(key: string): boolean {
    return isSelectable(key) && !excluded.has(key)
  }

  const selectedDays = useMemo(
    () => days.filter((d) => isSelected(dayKey(d))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, excluded, entriesByDay],
  )

  function shiftWeek(delta: number) {
    setWeekStart((prev) => addDays(prev, delta * 7))
    setExcluded(new Set())
  }

  function toggleDay(key: string) {
    if (!isSelectable(key)) return
    haptics.selection()
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openSlot(date: Date, mealType: MealType) {
    const key = dayKey(date)
    const existing = entriesByDay.get(key)?.get(mealType) ?? null
    setPickerTarget({
      date: key,
      mealType,
      weekdayLabel: weekdayFull(date),
      existingEntryId: existing?.id ?? null,
    })
    setSheetVisible(true)
  }

  function openBrowse() {
    setPickerTarget(null)
    setSheetVisible(true)
  }

  function handlePick(recipeId: string) {
    if (!pickerTarget) return
    const recipe = recipesById.get(recipeId)
    const servings = recipe?.servings && recipe.servings > 0 ? recipe.servings : 4
    void assignRecipe(pickerTarget.date, pickerTarget.mealType, recipeId, servings)
    haptics.light()
  }

  function handleGenerate() {
    const selectedKeys = new Set(selectedDays.map((d) => dayKey(d)))
    const selectedEntries = entries.filter((e) => selectedKeys.has(e.date))
    const items = buildShoppingItems(selectedEntries, recipesById, ingredientsByRecipe)

    if (items.length === 0) {
      haptics.warning()
      showToast('Jelölj ki legalább egy tervezett napot.', 'error')
      return
    }

    const name = `Heti bevásárlás · ${weekRangeLabel(weekStart)}`
    void createListWithItems(name, dayKey(weekStart), items).then((id) => {
      setActiveListId(id)
      haptics.success()
      showToast(`Lista létrehozva · ${items.length} tétel`, 'success')
      router.push(`/lista/${id}`)
    })
  }

  const weekNo = isoWeekNumber(weekStart)
  const isCurrentWeek = dayKey(weekStart) === dayKey(startOfWeek(today))
  const weekSub = `${isCurrentWeek ? 'Ez a hét · ' : ''}${weekNo}. hét`

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 150, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fejléc */}
        <View style={{ paddingHorizontal: 2 }}>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 }}>
            Étrend
          </Text>

          {/* Hét-váltó */}
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => shiftWeek(-1)}
              accessibilityLabel="Előző hét"
              hitSlop={8}
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border"
              style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={20} color={colors.foreground} strokeWidth={2.4} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 17, fontWeight: '800', letterSpacing: -0.2 }}>
                {weekRangeLabel(weekStart)}
              </Text>
              <Text className="text-muted" style={{ marginTop: 1, fontSize: 12, fontWeight: '700' }}>
                {weekSub}
              </Text>
            </View>
            <Pressable
              onPress={() => shiftWeek(1)}
              accessibilityLabel="Következő hét"
              hitSlop={8}
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border"
              style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronRight size={20} color={colors.foreground} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Receptkönyv + segéd */}
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={openBrowse}
              accessibilityLabel="Receptkönyv megnyitása"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingLeft: 13, paddingRight: 15, borderRadius: 99, backgroundColor: 'rgba(20,184,166,0.10)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.18)' }}
            >
              <BookOpen size={16} color={colors.primary} strokeWidth={2} />
              <Text style={{ color: colors.primary, fontSize: 13.5, fontWeight: '800' }}>Receptkönyv</Text>
            </Pressable>
            <Text className="text-muted" style={{ flex: 1, fontSize: 12.5, fontWeight: '700', lineHeight: 16 }}>
              Koppints egy étkezésre a recept hozzáadásához
            </Text>
          </View>
        </View>

        {/* Napok */}
        {days.map((d) => {
          const key = dayKey(d)
          return (
            <DayCard
              key={key}
              date={d}
              isToday={key === todayKey}
              entriesByMeal={entriesByDay.get(key) ?? new Map()}
              recipesById={recipesById}
              selectable={isSelectable(key)}
              selected={isSelected(key)}
              onToggle={() => toggleDay(key)}
              onSlotPress={(mealType) => openSlot(d, mealType)}
            />
          )
        })}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        className="bg-background dark:bg-dark-background"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}
      >
        <Pressable
          onPress={handleGenerate}
          disabled={selectedDays.length === 0}
          accessibilityLabel="Bevásárlólista generálása a kijelölt napokból"
          accessibilityRole="button"
          style={{
            height: 56,
            borderRadius: 18,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: selectedDays.length === 0 ? 0.5 : 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.32,
            shadowRadius: 22,
            elevation: 6,
          }}
        >
          <ShoppingCart size={20} color={colors.primaryForeground} strokeWidth={2} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primaryForeground, letterSpacing: -0.2 }}>
            Bevásárlólista generálása
          </Text>
        </Pressable>
        <Text className="text-muted" style={{ marginTop: 8, textAlign: 'center', fontSize: 12.5, fontWeight: '700' }}>
          a{' '}
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontWeight: '800' }}>
            {selectedDays.length} kijelölt nap
          </Text>{' '}
          hozzávalóiból
        </Text>
      </View>

      <RecipePickerSheet
        visible={sheetVisible}
        recipes={recipes}
        target={pickerTarget}
        onClose={() => setSheetVisible(false)}
        onPick={handlePick}
        onRemove={(id) => void removeEntry(id)}
      />
    </SafeAreaView>
  )
}
