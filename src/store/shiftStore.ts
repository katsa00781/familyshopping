import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { defaultShiftTypes, emptySchedule } from '@/lib/shifts'
import type { ShiftSchedule, ShiftType } from '@/types'

// v1: a műszaksablon lokális (single-user, AsyncStorage). A generált események
// valódi calendar_events sorok (lásd shifts.ts + calendarStore.createEventsWithIds).
const CACHE_KEY = 'familyhub_shifts_v1'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface Persisted {
  shiftTypes: ShiftType[]
  schedule: ShiftSchedule | null
}

interface ShiftState {
  shiftTypes: ShiftType[]
  schedule: ShiftSchedule | null
  loaded: boolean

  loadShifts: () => Promise<void>
  addShiftType: (name: string) => void
  updateShiftType: (id: string, patch: Partial<Pick<ShiftType, 'name' | 'startMinutes' | 'endMinutes' | 'color'>>) => void
  removeShiftType: (id: string) => void
  setSchedule: (schedule: ShiftSchedule) => void
}

function persist(state: Persisted): void {
  void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state))
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  shiftTypes: [],
  schedule: null,
  loaded: false,

  loadShifts: async () => {
    if (get().loaded) return
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted
      set({ shiftTypes: parsed.shiftTypes ?? [], schedule: parsed.schedule ?? null, loaded: true })
      return
    }
    const seeded = defaultShiftTypes(generateId)
    const schedule = emptySchedule(6, null)
    persist({ shiftTypes: seeded, schedule })
    set({ shiftTypes: seeded, schedule, loaded: true })
  },

  addShiftType: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const types = get().shiftTypes
    const next: ShiftType = {
      id: generateId(),
      name: trimmed,
      startMinutes: 8 * 60,
      endMinutes: 16 * 60,
      color: ['#14B8A6', '#FB7185', '#A78BFA', '#F59E0B', '#38BDF8', '#34D399'][types.length % 6]!,
    }
    const updated = [...types, next]
    set({ shiftTypes: updated })
    persist({ shiftTypes: updated, schedule: get().schedule })
  },

  updateShiftType: (id, patch) => {
    const updated = get().shiftTypes.map((t) => (t.id === id ? { ...t, ...patch } : t))
    set({ shiftTypes: updated })
    persist({ shiftTypes: updated, schedule: get().schedule })
  },

  removeShiftType: (id) => {
    const updated = get().shiftTypes.filter((t) => t.id !== id)
    // a beosztásból is kivesszük a hivatkozásokat
    const schedule = get().schedule
    const nextSchedule = schedule
      ? { ...schedule, days: schedule.days.map((d) => (d === id ? null : d)) }
      : schedule
    set({ shiftTypes: updated, schedule: nextSchedule })
    persist({ shiftTypes: updated, schedule: nextSchedule })
  },

  setSchedule: (schedule) => {
    set({ schedule })
    persist({ shiftTypes: get().shiftTypes, schedule })
  },
}))
