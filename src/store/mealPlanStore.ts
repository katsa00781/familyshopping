import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getSessionSafe } from '@/lib/supabase'
import { loadWithSessionRetry } from '@/lib/loadWithRetry'
import {
  deleteMealPlanEntry,
  deleteRecipe as deleteRecipeRow,
  fetchIngredients,
  fetchMealPlanEntries,
  fetchRecipes,
  insertMealPlanEntry,
  insertRecipe,
  replaceIngredients,
  updateRecipe,
} from '@/lib/recipes'
import type {
  MealPlanEntry,
  MealPlanEntryInput,
  Recipe,
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeInput,
} from '@/types'

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
  saveRecipe: (
    input: RecipeInput,
    ingredients: RecipeIngredientInput[],
    id: string | null,
  ) => Promise<Recipe>
  deleteRecipe: (id: string) => Promise<void>
  addEntry: (input: MealPlanEntryInput) => Promise<void>
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

    // Cold-start-biztos betöltés (session a retry-cikluson belül). Lásd loadWithRetry.
    const result = await loadWithSessionRetry(
      async (userId) => {
        const [recipes, entries] = await Promise.all([
          fetchRecipes(userId),
          fetchMealPlanEntries(userId),
        ])
        const ingredients = await fetchIngredients(recipes.map((r) => r.id))
        return { recipes, ingredients, entries }
      },
      (d) => d.recipes.length === 0 && d.entries.length === 0,
    )

    if (result.status === 'data') {
      await saveCache(result.data)
      set({ ...result.data, isLoading: false, error: null })
      return
    }

    if (result.status === 'failed') {
      const cached = await loadCache()
      if (cached && (cached.recipes.length > 0 || cached.entries.length > 0)) {
        set({ ...cached, isLoading: false, error: 'Offline – tárolt adatok' })
        return
      }
      set({ recipes: [], ingredients: [], entries: [], isLoading: false, error: 'Étrend betöltése sikertelen' })
      return
    }

    // `empty`: a szerver megerősítette, hogy nincs recept és étrend-bejegyzés (v1: a
    // recipes tábla üres → ez a várható állapot).
    await saveCache({ recipes: [], ingredients: [], entries: [] })
    set({ recipes: [], ingredients: [], entries: [], isLoading: false, error: null })
  },

  saveRecipe: async (input, ingredientInputs, id) => {
    const session = await getSessionSafe()
    const user = session?.user
    if (!user) throw new Error('Bejelentkezés szükséges a recept mentéséhez.')

    // A hozzávaló-FK miatt a recept szerver-id-je kell előbb → nincs offline-optimista út.
    const recipe = id
      ? await updateRecipe(id, input)
      : await insertRecipe(user.id, input)
    const savedIngredients = await replaceIngredients(recipe.id, ingredientInputs)

    const recipes = (() => {
      const exists = get().recipes.some((r) => r.id === recipe.id)
      const list = exists
        ? get().recipes.map((r) => (r.id === recipe.id ? recipe : r))
        : [...get().recipes, recipe]
      return list.sort((a, b) => a.name.localeCompare(b.name, 'hu'))
    })()
    const ingredients = [
      ...get().ingredients.filter((ing) => ing.recipe_id !== recipe.id),
      ...savedIngredients,
    ]

    set({ recipes, ingredients })
    void saveCache({ recipes, ingredients, entries: get().entries })
    return recipe
  },

  deleteRecipe: async (id) => {
    const session = await getSessionSafe()
    const user = session?.user
    if (!user) throw new Error('Bejelentkezés szükséges a recept törléséhez.')

    await deleteRecipeRow(id)

    // Szerveroldalon CASCADE viszi a hozzávalókat és az étrend-tételeket is.
    const recipes = get().recipes.filter((r) => r.id !== id)
    const ingredients = get().ingredients.filter((ing) => ing.recipe_id !== id)
    const entries = get().entries.filter((e) => e.recipe_id !== id)
    set({ recipes, ingredients, entries })
    void saveCache({ recipes, ingredients, entries })
  },

  // Új tétel (recept VAGY nyers termék) hozzáadása egy slothoz. Egy slothoz több
  // tétel tartozhat (tagonként), ezért mindig új sor jön létre (nincs csere).
  addEntry: async (input) => {
    const session = await getSessionSafe()
    const user = session?.user
    const now = new Date().toISOString()

    const optimistic: MealPlanEntry = {
      ...input,
      id: generateId(),
      user_id: user?.id ?? 'mock-user',
      created_by: user?.id ?? null,
      created_at: now,
    }

    const prev = get().entries
    const next = [...prev, optimistic]
    set({ entries: next })
    void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: next })

    if (user) {
      try {
        const saved = await insertMealPlanEntry(user.id, input)
        const merged = get().entries.map((e) => (e.id === optimistic.id ? saved : e))
        set({ entries: merged })
        void saveCache({ recipes: get().recipes, ingredients: get().ingredients, entries: merged })
      } catch {
        set({ entries: prev, error: 'Tétel hozzáadása sikertelen' })
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
