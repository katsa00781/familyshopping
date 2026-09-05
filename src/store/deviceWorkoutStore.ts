import { create } from 'zustand'

import { getWorkoutEventsInRange, type DeviceWorkout } from '@/lib/deviceCalendarSync'
import type { CalendarEvent } from '@/types'

// A kettlebell appból a telefon naptárába írt edzéseket csak olvasásra
// jelenítjük meg a családi naptárban. A `dev:` id-előtag jelzi, hogy ezek
// külső, nem szerkeszthető események (a naptár-szerkesztő kihagyja őket).
const ID_PREFIX = 'dev:'

/** Külső device-esemény jelölése (csak olvasható edzés). */
export function isDeviceWorkout(id: string): boolean {
  return id.startsWith(ID_PREFIX)
}

function toCalendarEvent(w: DeviceWorkout): CalendarEvent {
  return {
    id: `${ID_PREFIX}${w.id}`,
    user_id: '',
    created_by: null,
    created_at: w.startISO,
    updated_at: w.startISO,
    title: w.title,
    description: null,
    location: null,
    starts_at: w.startISO,
    ends_at: w.endISO,
    all_day: w.allDay,
    member_id: null,
    color: w.color,
    rrule: null,
    event_type: 'event',
  }
}

interface DeviceWorkoutState {
  workouts: CalendarEvent[]
  loaded: boolean
  loadWorkouts: () => Promise<void>
}

export const useDeviceWorkoutStore = create<DeviceWorkoutState>((set) => ({
  workouts: [],
  loaded: false,

  loadWorkouts: async () => {
    // Széles ablak a látható hónapok köré (−2 hó … +13 hó), hogy a tervezett
    // edzések előre is látszódjanak. A device naptár az ismétlődőket már
    // konkrét előfordulásokká bontva adja vissza.
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0)
    try {
      const list = await getWorkoutEventsInRange(start.toISOString(), end.toISOString())
      set({ workouts: list.map(toCalendarEvent), loaded: true })
    } catch {
      set({ workouts: [], loaded: true })
    }
  },
}))
