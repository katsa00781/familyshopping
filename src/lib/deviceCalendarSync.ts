import { Platform } from 'react-native'
import * as Calendar from 'expo-calendar'

import { colors } from '@/constants/colors'
import type { CalendarEventInput } from '@/types'

// A műszakbeosztást a telefon natív naptárába is kiírjuk (pl. hogy a rendszer
// Naptár appban is látszódjon). Az edzésnaptár (Underground KB) mára a közös
// Supabase projekten (calendar_events, event_type='workout') keresztül
// szinkronizál, nem a device-naptáron át — lásd src/lib/calendar.ts. Saját, app
// által kezelt naptárba dolgozunk, amit minden szinkronnál tisztára építünk.

const SHIFT_CALENDAR_TITLE = 'Műszakok (FamilyHub)'

/** Naptár-hozzáférés kérése. true, ha írható. */
export async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const req = await Calendar.requestCalendarPermissionsAsync()
  return req.granted
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
