import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BookOpen, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react-native'

import { DayCard } from '@/components/etrend/DayCard'
import { RecipeEditorSheet } from '@/components/etrend/RecipeEditorSheet'
import { RecipePickerSheet } from '@/components/etrend/RecipePickerSheet'
import { MealEntrySheet, type MealEntryTarget } from '@/components/etrend/MealEntrySheet'
import { MemberEditorSheet } from '@/components/etrend/MemberEditorSheet'
import { useMealPlanStore } from '@/store/mealPlanStore'
import { useMemberStore } from '@/store/memberStore'
import { useProductStore } from '@/store/productStore'
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
import type {
  FamilyMemberLocal,
  MealPlanEntry,
  MealType,
  Product,
  Recipe,
  RecipeIngredient,
} from '@/types'

export default function EtrendScreen() {
  const router = useRouter()

  const recipes = useMealPlanStore((s) => s.recipes)
  const ingredients = useMealPlanStore((s) => s.ingredients)
  const entries = useMealPlanStore((s) => s.entries)
  const loadAll = useMealPlanStore((s) => s.loadAll)
  const addEntry = useMealPlanStore((s) => s.addEntry)
  const removeEntry = useMealPlanStore((s) => s.removeEntry)
  const saveRecipe = useMealPlanStore((s) => s.saveRecipe)
  const deleteRecipe = useMealPlanStore((s) => s.deleteRecipe)

  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)

  const createListWithItems = useListStore((s) => s.createListWithItems)
  const setActiveListId = useListStore((s) => s.setActiveListId)
  const showToast = useToastStore((s) => s.showToast)

  const today = useMemo(() => new Date(), [])
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  // Tétel-hozzáadó sheet (recept/termék)
  const [mealSheetVisible, setMealSheetVisible] = useState(false)
  const [mealTarget, setMealTarget] = useState<MealEntryTarget | null>(null)

  // Receptkönyv (böngésző) sheet + tag-szerkesztő
  const [browseVisible, setBrowseVisible] = useState(false)
  const [memberSheetVisible, setMemberSheetVisible] = useState(false)

  const [editorVisible, setEditorVisible] = useState(false)
  const [editorRecipe, setEditorRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    loadAll()
    loadMembers()
    loadProducts()
  }, [loadAll, loadMembers, loadProducts])

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

  const membersById = useMemo(() => {
    const m = new Map<string, FamilyMemberLocal>()
    for (const mem of members) m.set(mem.id, mem)
    return m
  }, [members])

  const productsById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  // nap (YYYY-MM-DD) → (étkezés → tételek listája)
  const entriesByDay = useMemo(() => {
    const m = new Map<string, Map<MealType, MealPlanEntry[]>>()
    for (const e of entries) {
      const inner = m.get(e.date) ?? new Map<MealType, MealPlanEntry[]>()
      const arr = inner.get(e.meal_type) ?? []
      arr.push(e)
      inner.set(e.meal_type, arr)
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

  function openAddEntry(date: Date, mealType: MealType) {
    setMealTarget({ date: dayKey(date), mealType, weekdayLabel: weekdayFull(date) })
    setMealSheetVisible(true)
  }

  function openBrowse() {
    setBrowseVisible(true)
  }

  function openNewRecipe() {
    setMealSheetVisible(false)
    setBrowseVisible(false)
    setEditorRecipe(null)
    setEditorVisible(true)
  }

  function openEditRecipe(recipe: Recipe) {
    setBrowseVisible(false)
    setEditorRecipe(recipe)
    setEditorVisible(true)
  }

  function openManageMembers() {
    setMealSheetVisible(false)
    setMemberSheetVisible(true)
  }

  const editorIngredients = useMemo(
    () => (editorRecipe ? (ingredientsByRecipe.get(editorRecipe.id) ?? []) : []),
    [editorRecipe, ingredientsByRecipe],
  )

  function handleAddRecipe(memberId: string | null, recipeId: string, servings: number) {
    if (!mealTarget) return
    void addEntry({
      date: mealTarget.date,
      meal_type: mealTarget.mealType,
      member_id: memberId,
      recipe_id: recipeId,
      servings,
      item_name: null,
      product_id: null,
      quantity: null,
      unit: null,
    })
  }

  function handleAddProduct(
    memberId: string | null,
    item: { item_name: string; product_id: string | null; quantity: number; unit: string },
  ) {
    if (!mealTarget) return
    void addEntry({
      date: mealTarget.date,
      meal_type: mealTarget.mealType,
      member_id: memberId,
      recipe_id: null,
      servings: 4,
      item_name: item.item_name,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
    })
  }

  function handleGenerate() {
    const selectedKeys = new Set(selectedDays.map((d) => dayKey(d)))
    const selectedEntries = entries.filter((e) => selectedKeys.has(e.date))
    const items = buildShoppingItems(selectedEntries, recipesById, ingredientsByRecipe, productsById)

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
              membersById={membersById}
              productsById={productsById}
              selectable={isSelectable(key)}
              selected={isSelected(key)}
              onToggle={() => toggleDay(key)}
              onAddEntry={(mealType) => openAddEntry(d, mealType)}
              onRemoveEntry={(id) => void removeEntry(id)}
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

      <MealEntrySheet
        visible={mealSheetVisible}
        target={mealTarget}
        members={members}
        recipes={recipes}
        products={products}
        onClose={() => setMealSheetVisible(false)}
        onAddRecipe={handleAddRecipe}
        onAddProduct={handleAddProduct}
        onManageMembers={openManageMembers}
        onNewRecipe={openNewRecipe}
      />

      <RecipePickerSheet
        visible={browseVisible}
        recipes={recipes}
        target={null}
        onClose={() => setBrowseVisible(false)}
        onPick={() => {}}
        onRemove={() => {}}
        onNewRecipe={openNewRecipe}
        onEditRecipe={openEditRecipe}
      />

      <MemberEditorSheet
        visible={memberSheetVisible}
        onClose={() => setMemberSheetVisible(false)}
      />

      <RecipeEditorSheet
        visible={editorVisible}
        recipe={editorRecipe}
        ingredients={editorIngredients}
        onClose={() => setEditorVisible(false)}
        onSave={async (input, ings, id) => {
          await saveRecipe(input, ings, id)
        }}
        onDelete={(id) => deleteRecipe(id)}
      />
    </SafeAreaView>
  )
}
