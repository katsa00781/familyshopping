import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar'

import { colors } from '@/constants/colors'
import type { CalendarEventInput } from '@/types'

// A műszakbeosztást a telefon natív naptárába is kiírjuk, hogy a többi app
// (pl. az edzésnaptár) is olvashassa – azok külön Supabase projektben élnek, így
// a device naptár a közös csatorna. Saját, app által kezelt naptárba dolgozunk,
// amit minden szinkronnál tisztára építünk.

const SHIFT_CALENDAR_TITLE = 'Műszakok (FamilyHub)'

// A kettlebell app ebbe a device-naptárba írja az edzéseket (lásd ottani
// deviceCalendar.ts). Innen olvassuk vissza, hogy a családi naptárban is
// megjelenjenek a tervezett edzések.
const WORKOUT_CALENDAR_TITLE = 'Underground KB edzések'

/** Naptár-hozzáférés kérése. true, ha írható. */
export async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const req = await Calendar.requestCalendarPermissionsAsync()
  return req.granted
}

function toISO(value: string | Date): string {
  return typeof value === 'string' ? new Date(value).toISOString() : value.toISOString()
}

export interface DeviceWorkout {
  id: string
  title: string
  startISO: string
  endISO: string
  allDay: boolean
  color: string
}

/**
 * A kettlebell „Underground KB edzések" naptárának eseményei az adott
 * tartományban (csak olvasás). Üres tömb, ha nincs naptár-hozzáférés vagy
 * nincs ilyen naptár a telefonon.
 */
export async function getWorkoutEventsInRange(
  startISO: string,
  endISO: string,
): Promise<DeviceWorkout[]> {
  const granted = await ensureCalendarPermission()
  if (!granted) return []

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const workoutCalendars = calendars.filter((c) => c.title === WORKOUT_CALENDAR_TITLE)
  if (workoutCalendars.length === 0) return []

  const colorById = new Map(workoutCalendars.map((c) => [c.id, c.color]))
  const ids = workoutCalendars.map((c) => c.id)
  const events = await Calendar.getEventsAsync(ids, new Date(startISO), new Date(endISO))

  return events.map((e) => ({
    id: e.id,
    title: e.title ?? '',
    startISO: toISO(e.startDate),
    endISO: toISO(e.endDate),
    allDay: e.allDay ?? false,
    color: colorById.get(e.calendarId) ?? colors.primary,
  }))
}

/** A heti ismétlődés intervalluma az rrule-ból (FREQ=WEEKLY;INTERVAL=n). 1, ha hiányzik. */
function weeklyIntervalFromRRule(rrule: string | null): number {
  if (!rrule) return 1
  const match = rrule.match(/INTERVAL=(\d+)/)
  if (!match) return 1
  const value = parseInt(match[1] ?? '1', 10)
  return Number.isFinite(value) && value > 0 ? value : 1
}

async function createShiftCalendar(): Promise<string> {
  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync()
    return Calendar.createCalendarAsync({
      title: SHIFT_CALENDAR_TITLE,
      color: colors.primary,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCal.source.id,
      name: SHIFT_CALENDAR_TITLE,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    })
  }

  return Calendar.createCalendarAsync({
    title: SHIFT_CALENDAR_TITLE,
    color: colors.primary,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: SHIFT_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL },
    name: SHIFT_CALENDAR_TITLE,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  })
}

/** A saját műszak-naptár törlése (ha létezik). */
export async function clearShiftsFromDevice(): Promise<boolean> {
  const granted = await ensureCalendarPermission()
  if (!granted) return false
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const existing = calendars.find((c) => c.title === SHIFT_CALENDAR_TITLE)
  if (existing) await Calendar.deleteCalendarAsync(existing.id)
  return true
}

/**
 * A generált műszakeseményeket kiírja a telefon naptárába. A saját naptárat
 * minden híváskor újraépítjük (törlés + létrehozás), így mapping-nyilvántartás
 * nélkül mindig a friss beosztást tükrözi. Az események heti ismétlődők
 * (INTERVAL = ciklus hossza hétben), a natív naptár bontja ki őket.
 * Visszaadja a kiírt események számát, vagy -1, ha nincs engedély.
 */
export async function syncShiftsToDevice(events: CalendarEventInput[]): Promise<number> {
  const granted = await ensureCalendarPermission()
  if (!granted) return -1

  // tiszta lap: a régi naptár törlése, majd újra létrehozás
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const existing = calendars.find((c) => c.title === SHIFT_CALENDAR_TITLE)
  if (existing) await Calendar.deleteCalendarAsync(existing.id)
  const calendarId = await createShiftCalendar()

  let count = 0
  for (const ev of events) {
    const interval = weeklyIntervalFromRRule(ev.rrule)
    await Calendar.createEventAsync(calendarId, {
      title: ev.title,
      startDate: new Date(ev.starts_at),
      endDate: ev.ends_at ? new Date(ev.ends_at) : new Date(ev.starts_at),
      allDay: ev.all_day,
      notes: 'FamilyHub műszak',
      recurrenceRule: { frequency: Calendar.Frequency.WEEKLY, interval },
    })
    count++
  }
  return count
}
