import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { resolveDataOwnerId } from '@/lib/dataOwner'
import { getSessionSafe } from '@/lib/supabase'
import { loadWithSessionRetry } from '@/lib/loadWithRetry'
import {
  deleteTaskPhoto,
  dueLabel,
  fetchTasks,
  nextDueAt,
  insertTask,
  patchTask,
  removeTask,
  uploadTaskPhoto,
  type FamilyTaskPatch,
} from '@/lib/tasks'
import { syncTaskReminders } from '@/lib/notifications'
import { haptics } from '@/lib/haptics'
import { useMemberStore } from '@/store/memberStore'
import { useToastStore } from '@/store/toastStore'
import type { FamilyTask, FamilyTaskInput } from '@/types'

// Családi feladatok – közös (adatgazda-modell, mint a calendarStore). Optimista
// írás + visszagörgetés; a fotó feltöltése a sor mentése után történik, addig a
// helyi kép (`pendingPhotos`) látszik.

const CACHE_KEY = 'familyhub_tasks_v1'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function saveCache(tasks: FamilyTask[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tasks))
}

async function loadCache(): Promise<FamilyTask[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as FamilyTask[]
}

function memberName(assigneeId: string | null): string | null {
  if (!assigneeId) return null
  return useMemberStore.getState().members.find((m) => m.id === assigneeId)?.name ?? null
}

// Az emlékeztető-egyeztetéseket sorba fűzzük, hogy a gyors egymás utáni írások ne
// ütemezzenek duplán.
let reminderQueue: Promise<void> = Promise.resolve()
function syncReminders(tasks: FamilyTask[]): void {
  reminderQueue = reminderQueue
    .then(() => syncTaskReminders(tasks, memberName))
    .catch(() => {})
}

function showError(message: string): void {
  useToastStore.getState().showToast(message, 'error')
}

/** `undefined` = a fotó marad, `null` = eltávolítás, string = új helyi kép URI. */
export type TaskPhotoChange = string | null | undefined

interface TaskState {
  tasks: FamilyTask[]
  /** Feltöltés alatt álló fotók: feladat id → helyi URI (azonnali megjelenítéshez). */
  pendingPhotos: Record<string, string>
  isLoading: boolean
  error: string | null

  loadTasks: () => Promise<void>
  createTask: (input: Omit<FamilyTaskInput, 'photo_path'>, photoUri: string | null) => Promise<void>
  updateTask: (id: string, input: Omit<FamilyTaskInput, 'photo_path'>, photo: TaskPhotoChange) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => {
  /** Helyi állapot + cache frissítése egy feladatra. */
  async function replaceTask(id: string, fn: (t: FamilyTask) => FamilyTask): Promise<void> {
    const next = get().tasks.map((t) => (t.id === id ? fn(t) : t))
    set({ tasks: next })
    await saveCache(next)
  }

  function setPending(id: string, uri: string | null): void {
    const pending = { ...get().pendingPhotos }
    if (uri) pending[id] = uri
    else delete pending[id]
    set({ pendingPhotos: pending })
  }

  /** Új fotó feltöltése + `photo_path` mentése; a régi objektumot törli. */
  async function attachPhoto(task: FamilyTask, uri: string, oldPath: string | null): Promise<void> {
    setPending(task.id, uri)
    try {
      const path = await uploadTaskPhoto(task.user_id, task.id, uri)
      const saved = await patchTask(task.id, { photo_path: path })
      await replaceTask(task.id, () => saved)
      if (oldPath) void deleteTaskPhoto(oldPath).catch(() => {})
    } catch {
      showError('Fotó feltöltése sikertelen')
    } finally {
      setPending(task.id, null)
    }
  }

  return {
    tasks: [],
    pendingPhotos: {},
    isLoading: false,
    error: null,

    loadTasks: async () => {
      set({ isLoading: true, error: null })

      // Cold-start-biztos betöltés (session a retry-cikluson belül). Lásd loadWithRetry.
      const result = await loadWithSessionRetry(
        async (userId) => fetchTasks(await resolveDataOwnerId(userId)),
        (tasks) => tasks.length === 0,
      )

      if (result.status === 'data') {
        await saveCache(result.data)
        set({ tasks: result.data, isLoading: false, error: null })
        syncReminders(result.data)
        return
      }

      if (result.status === 'failed') {
        const cached = await loadCache()
        if (cached && cached.length > 0) {
          set({ tasks: cached, isLoading: false, error: 'Offline – tárolt adatok' })
          return
        }
        set({ tasks: [], isLoading: false, error: 'Feladatok betöltése sikertelen' })
        return
      }

      await saveCache([])
      set({ tasks: [], isLoading: false, error: null })
      syncReminders([])
    },

    createTask: async (input, photoUri) => {
      const session = await getSessionSafe()
      const user = session?.user
      const now = new Date().toISOString()

      const optimistic: FamilyTask = {
        ...input,
        photo_path: null,
        id: generateId(),
        user_id: user ? await resolveDataOwnerId(user.id) : 'mock-user',
        created_by: user?.id ?? null,
        completed_at: null,
        completed_by: null,
        created_at: now,
        updated_at: now,
      }

      const prev = get().tasks
      const next = [...prev, optimistic]
      set({ tasks: next })
      await saveCache(next)
      if (photoUri) setPending(optimistic.id, photoUri)

      if (!user) return
      try {
        const saved = await insertTask(optimistic.user_id, user.id, optimistic.id, { ...input, photo_path: null })
        await replaceTask(optimistic.id, () => saved)
        syncReminders(get().tasks)
        if (photoUri) await attachPhoto(saved, photoUri, null)
      } catch {
        setPending(optimistic.id, null)
        set({ tasks: prev, error: 'Feladat mentése sikertelen' })
        await saveCache(prev)
        showError('Feladat mentése sikertelen')
      }
    },

    updateTask: async (id, input, photo) => {
      const prev = get().tasks
      const current = prev.find((t) => t.id === id)
      if (!current) return

      const removePhoto = photo === null && current.photo_path !== null
      const patch: FamilyTaskPatch = removePhoto ? { ...input, photo_path: null } : input
      await replaceTask(id, (t) => ({ ...t, ...patch, updated_at: new Date().toISOString() }))
      if (typeof photo === 'string') setPending(id, photo)

      const session = await getSessionSafe()
      if (!session?.user) return
      try {
        const saved = await patchTask(id, patch)
        await replaceTask(id, () => saved)
        syncReminders(get().tasks)
        if (removePhoto && current.photo_path) void deleteTaskPhoto(current.photo_path).catch(() => {})
        if (typeof photo === 'string') await attachPhoto(saved, photo, current.photo_path)
      } catch {
        setPending(id, null)
        set({ tasks: prev, error: 'Feladat frissítése sikertelen' })
        await saveCache(prev)
        showError('Feladat frissítése sikertelen')
      }
    },

    toggleTask: async (id) => {
      const prev = get().tasks
      const current = prev.find((t) => t.id === id)
      if (!current) return

      const session = await getSessionSafe()
      const user = session?.user
      // Ismétlődő feladat: kipipáláskor nem lesz „kész", hanem a határidő a következő
      // esedékességre lép (az emlékeztető a sync-kel átütemeződik).
      const nextDue = current.completed_at ? null : nextDueAt(current)
      const patch: FamilyTaskPatch = current.completed_at
        ? { completed_at: null, completed_by: null }
        : nextDue
          ? { due_at: nextDue }
          : { completed_at: new Date().toISOString(), completed_by: user?.id ?? null }
      await replaceTask(id, (t) => ({ ...t, ...patch }))
      syncReminders(get().tasks)
      if (nextDue) {
        haptics.success()
        const label = dueLabel({ due_at: nextDue, due_has_time: current.due_has_time })
        useToastStore.getState().showToast(`Kész! Következő: ${label ?? ''}`, 'success')
      }

      if (!user) return
      try {
        const saved = await patchTask(id, patch)
        await replaceTask(id, () => saved)
      } catch {
        set({ tasks: prev, error: 'Feladat frissítése sikertelen' })
        await saveCache(prev)
        syncReminders(prev)
        showError('Feladat frissítése sikertelen')
      }
    },

    deleteTask: async (id) => {
      const prev = get().tasks
      const current = prev.find((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      set({ tasks: next })
      await saveCache(next)
      syncReminders(next)

      const session = await getSessionSafe()
      if (!session?.user) return
      try {
        await removeTask(id)
        if (current?.photo_path) void deleteTaskPhoto(current.photo_path).catch(() => {})
      } catch {
        set({ tasks: prev, error: 'Feladat törlése sikertelen' })
        await saveCache(prev)
        syncReminders(prev)
        showError('Feladat törlése sikertelen')
      }
    },
  }
})
