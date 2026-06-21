import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getSessionSafe } from '@/lib/supabase'
import { fetchEvents, insertEvent, patchEvent, removeEvent } from '@/lib/calendar'
import type { CalendarEvent, CalendarEventInput } from '@/types'

const CACHE_KEY = 'familyhub_calendar_v1'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function saveCache(events: CalendarEvent[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(events))
}

async function loadCache(): Promise<CalendarEvent[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CalendarEvent[]
}

interface CalendarState {
  events: CalendarEvent[]
  isLoading: boolean
  error: string | null

  loadEvents: () => Promise<void>
  createEvent: (input: CalendarEventInput) => Promise<void>
  updateEvent: (id: string, input: CalendarEventInput) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  loadEvents: async () => {
    set({ isLoading: true, error: null })

    const session = await getSessionSafe()
    const user = session?.user

    if (!user) {
      const cached = await loadCache()
      set({ events: cached ?? [], isLoading: false })
      return
    }

    // A bejelentkezés utáni első authentikált lekérés a friss JWT miatt némán üres
    // lehet (RLS 0 sor) → hibára és üres eredményre is egyszer újrapróbálunk.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const events = await fetchEvents(user.id)
        if (events.length === 0 && attempt === 0) {
          const cached = await loadCache()
          if (cached && cached.length > 0) {
            await new Promise((r) => setTimeout(r, 600))
            continue
          }
        }
        await saveCache(events)
        set({ events, isLoading: false })
        return
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        const cached = await loadCache()
        if (cached) {
          set({ events: cached, isLoading: false, error: 'Offline – tárolt adatok' })
        } else {
          set({ events: [], isLoading: false, error: 'Naptár betöltése sikertelen' })
        }
      }
    }
  },

  createEvent: async (input) => {
    const session = await getSessionSafe()
    const user = session?.user
    const now = new Date().toISOString()

    const optimistic: CalendarEvent = {
      ...input,
      id: generateId(),
      user_id: user?.id ?? 'mock-user',
      created_by: user?.id ?? null,
      rrule: null,
      created_at: now,
      updated_at: now,
    }

    const prev = get().events
    const next = [...prev, optimistic].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    set({ events: next })
    await saveCache(next)

    if (user) {
      try {
        const saved = await insertEvent(user.id, input)
        const merged = get()
          .events.map((e) => (e.id === optimistic.id ? saved : e))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        set({ events: merged })
        await saveCache(merged)
      } catch {
        set({ events: prev, error: 'Esemény mentése sikertelen' })
        await saveCache(prev)
      }
    }
  },

  updateEvent: async (id, input) => {
    const prev = get().events
    const next = prev
      .map((e) => (e.id === id ? { ...e, ...input, updated_at: new Date().toISOString() } : e))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    set({ events: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      try {
        await patchEvent(id, input)
      } catch {
        set({ events: prev, error: 'Esemény frissítése sikertelen' })
        await saveCache(prev)
      }
    }
  },

  deleteEvent: async (id) => {
    const prev = get().events
    const next = prev.filter((e) => e.id !== id)
    set({ events: next })
    await saveCache(next)

    const session = await getSessionSafe()
    const user = session?.user
    if (user) {
      try {
        await removeEvent(id)
      } catch {
        set({ events: prev, error: 'Esemény törlése sikertelen' })
        await saveCache(prev)
      }
    }
  },
}))
