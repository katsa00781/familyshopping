import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getSessionSafe } from '@/lib/supabase'
import {
  deleteMealPlanEntry,
  fetchIngredients,
  fetchMealPlanEntries,
  fetchRecipes,
  upsertMealPlanEntry,
} from '@/lib/recipes'
import type { MealPlanEntry, MealType, Recipe, RecipeIngredient } from '@/types'

const CACHE_KEY = 'familyhub_mealplan_v1'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

type CacheData = {
  recipes: Recipe[]
  ingredients: RecipeIngredient[]
  entries: MealPlanEntry[]
}

async function saveCache(data: CacheData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function loadCache(): Promise<CacheData | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CacheData
}

interface MealPlanState {
  recipes: Recipe[]
  ingredients: RecipeIngredient[]
  entries: MealPlanEntry[]
  isLoading: boolean
  error: string | null

  loadAll: () => Promise<void>
  assignRecipe: (
    date: string,
    mealType: MealType,
    recipeId: string,
    servings: number,
  ) => Promise<void>
  removeEntry: (id: string) => Promise<void>
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  recipes: [],
  ingredients: [],
  entries: [],
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })

    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      set({ ...(cached ?? { recipes: [], ingredients: [], entries: [] }), isLoading: false })
      return
    }

    // A bejelentkezés utáni első authentikált lekérés a friss JWT miatt némán üres
    // lehet (RLS 0 sor) → hibára és üres eredményre is egyszer újrapróbálunk.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [recipes, entries] = await Promise.all([
          fetchRecipes(user.id),
          fetchMealPlanEntries(user.id),
        ])
        const ingredients = await fetchIngredients(recipes.map((r) => r.id))

        if (recipes.length === 0 && entries.length === 0 && attempt === 0) {
          const cached = await loadCache()
          if (cached && (cached.recipes.length > 0 || cached.entries.length > 0)) {
            await new Promise((r) => setTimeout(r, 600))
            continue
          }
        }

        await saveCache({ recipes, ingredients, entries })
        set({ recipes, ingredients, entries, isLoading: false })
        return
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        const cached = await loadCache()
        if (cached) {
          set({ ...cached, isLoading: false, error: 'Offline – tárolt adatok' })
        } else {
          set({ isLoading: false, error: 'Étrend betöltése sikertelen' })
        }
      }
    }
  },

  assignRecipe: async (date, mealType, recipeId, servings) => {
    const session = await getSessionSafe()
    const user = session?.user
    const now = new Date().toISOString()

    const optimistic: MealPlanEntry = {
      id: generateId(),
      user_id: user?.id ?? 'mock-user',
      created_by: user?.id ?? null,
      date,
      meal_type: mealType,
      recipe_id: recipeId,
      servings,
      created_at: now,
    }

    const prev = get().entries
    // Egy slothoz (nap + étkezés) egy recept tartozik → a meglévőt lecseréljük.
    const next = [
      ...prev.filter((e) => !(e.date === date && e.meal_type === mealType)),
      optimistic,
    ]
    set({ entries: next })
    void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: next })

    if (user) {
      try {
        const saved = await upsertMealPlanEntry(user.id, {
          date,
          meal_type: mealType,
          recipe_id: recipeId,
          servings,
        })
        const merged = get().entries.map((e) => (e.id === optimistic.id ? saved : e))
        set({ entries: merged })
        void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: merged })
      } catch {
        set({ entries: prev, error: 'Recept hozzárendelése sikertelen' })
        void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: prev })
      }
    }
  },

  removeEntry: async (id) => {
    const prev = get().entries
    const next = prev.filter((e) => e.id !== id)
    set({ entries: next })
    void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: next })

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      try {
        await deleteMealPlanEntry(id)
      } catch {
        set({ entries: prev, error: 'Recept eltávolítása sikertelen' })
        void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: prev })
      }
    }
  },
}))
