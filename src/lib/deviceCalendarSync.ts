import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Calendar from 'expo-calendar/legacy'

import { colors } from '@/constants/colors'
import { parseRecurrence } from '@/lib/calendar'
import type { CalendarEvent, CalendarEventInput } from '@/types'

// A műszakbeosztást a telefon natív naptárába is kiírjuk (pl. hogy a rendszer
// Naptár appban is látszódjon). Az edzésnaptár (Underground KB) mára a közös
// Supabase projekten (calendar_events, event_type='workout') keresztül
// szinkronizál, nem a device-naptáron át — lásd src/lib/calendar.ts. Saját, app
// által kezelt naptárba dolgozunk, amit minden szinkronnál tisztára építünk.

const SHIFT_CALENDAR_TITLE = 'Műszakok (FamilyHub)'
// A közös családi naptár tükre az Apple/telefon naptárban (FamilyHub → telefon).
const FAMILYHUB_CALENDAR_TITLE = 'FamilyHub'
// Az app saját naptárai – a beolvasható naptárak közül kimaradnak (nincs visszhang/duplikáció).
const OWN_CALENDAR_TITLES = [SHIFT_CALENDAR_TITLE, FAMILYHUB_CALENDAR_TITLE]

export type CalendarPermission = 'granted' | 'undetermined' | 'denied'

/** Naptár-hozzáférés állapota kérés nélkül (beállító képernyőhöz). */
export async function getCalendarPermission(): Promise<CalendarPermission> {
  const current = await Calendar.getCalendarPermissionsAsync()
  if (current.granted) return 'granted'
  return current.canAskAgain ? 'undetermined' : 'denied'
}

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

async function createOwnCalendar(title: string): Promise<string> {
  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync()
    return Calendar.createCalendarAsync({
      title,
      color: colors.primary,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCal.source.id,
      name: title,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    })
  }

  return Calendar.createCalendarAsync({
    title,
    color: colors.primary,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: title, type: Calendar.SourceType.LOCAL },
    name: title,
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
  const calendarId = await createOwnCalendar(SHIFT_CALENDAR_TITLE)

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

// ─── FamilyHub → telefon naptár (kétirányú szinkron, 2026-11-06) ────────────────
//
// Növekményes tükrözés a saját „FamilyHub" naptárba: a FamilyHub esemény id →
// telefonos esemény id + verzió párost AsyncStorage-ban tartjuk; csak az új /
// változott eseményeket írjuk újra (törlés + létrehozás – ismétlődőnél ez a
// legmegbízhatóbb), a FamilyHubból eltűnteket töröljük. Ha a felhasználó a
// naptárat kitörölte az Apple Naptárban, újra létrehozzuk és mindent kiírunk.

const EXPORT_MAP_KEY = 'deviceCalendar.exportMap'
// Ennél régebben véget ért, nem ismétlődő eseményeket nem írunk ki.
const EXPORT_PAST_DAYS = 60

interface ExportEntry {
  deviceId: string
  version: string
}

interface ExportMap {
  calendarId: string
  entries: Record<string, ExportEntry>
}

const FREQUENCY: Record<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY', Calendar.Frequency> = {
  DAILY: Calendar.Frequency.DAILY,
  WEEKLY: Calendar.Frequency.WEEKLY,
  MONTHLY: Calendar.Frequency.MONTHLY,
  YEARLY: Calendar.Frequency.YEARLY,
}

function exportVersion(ev: CalendarEvent): string {
  return [
    ev.title,
    ev.starts_at,
    ev.ends_at ?? '',
    ev.all_day ? '1' : '0',
    ev.rrule ?? '',
    ev.location ?? '',
    ev.description ?? '',
  ].join('|')
}

function toRecurrenceRule(rrule: string | null): Calendar.RecurrenceRule | null {
  const rule = parseRecurrence(rrule)
  if (!rule) return null
  return {
    frequency: FREQUENCY[rule.freq],
    interval: rule.interval,
    ...(rule.until ? { endDate: rule.until } : {}),
    ...(rule.count ? { occurrence: rule.count } : {}),
  }
}

async function readExportMap(): Promise<ExportMap | null> {
  try {
    const raw = await AsyncStorage.getItem(EXPORT_MAP_KEY)
    return raw ? (JSON.parse(raw) as ExportMap) : null
  } catch {
    return null
  }
}

async function writeExportMap(map: ExportMap | null): Promise<void> {
  if (map) await AsyncStorage.setItem(EXPORT_MAP_KEY, JSON.stringify(map))
  else await AsyncStorage.removeItem(EXPORT_MAP_KEY)
}

function shouldExport(ev: CalendarEvent, cutoff: number): boolean {
  if (ev.rrule) return true
  return new Date(ev.ends_at ?? ev.starts_at).getTime() >= cutoff
}

async function createDeviceEvent(calendarId: string, ev: CalendarEvent): Promise<string> {
  const start = new Date(ev.starts_at)
  const end = ev.ends_at ? new Date(ev.ends_at) : start
  return Calendar.createEventAsync(calendarId, {
    title: ev.title,
    startDate: start,
    endDate: end,
    allDay: ev.all_day,
    location: ev.location ?? undefined,
    notes: ev.description ?? undefined,
    recurrenceRule: toRecurrenceRule(ev.rrule),
    // A FamilyHub saját emlékeztetőt küld – itt nem duplikáljuk.
    alarms: [],
  })
}

async function deleteDeviceEvent(deviceId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(deviceId, { futureEvents: true })
  } catch {
    // már nincs meg (a felhasználó törölte az Apple Naptárban) – nem hiba
  }
}

/**
 * A megadott FamilyHub-eseményeket tükrözi a telefon „FamilyHub" naptárába.
 * Visszaadja a módosított (létrehozott/újraírt/törölt) telefonos események számát,
 * vagy -1-et, ha nincs naptár-hozzáférés. Kérés nélkül nem kér engedélyt.
 */
export async function exportEventsToDevice(events: CalendarEvent[]): Promise<number> {
  if ((await getCalendarPermission()) !== 'granted') return -1

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  let map = await readExportMap()
  const existing = calendars.find((c) => c.id === map?.calendarId)
  if (!map || !existing) {
    // Első futás, vagy a naptárat törölték: tiszta lap (az esetleges árva azonos
    // nevű naptárat is eltávolítjuk, hogy ne legyen két „FamilyHub").
    for (const c of calendars.filter((c) => c.title === FAMILYHUB_CALENDAR_TITLE)) {
      await Calendar.deleteCalendarAsync(c.id)
    }
    map = { calendarId: await createOwnCalendar(FAMILYHUB_CALENDAR_TITLE), entries: {} }
  }

  const cutoff = Date.now() - EXPORT_PAST_DAYS * 24 * 60 * 60 * 1000
  const wanted = events.filter((e) => shouldExport(e, cutoff))
  const wantedIds = new Set(wanted.map((e) => e.id))
  let changed = 0

  for (const [id, entry] of Object.entries(map.entries)) {
    if (wantedIds.has(id)) continue
    await deleteDeviceEvent(entry.deviceId)
    delete map.entries[id]
    changed++
  }

  for (const ev of wanted) {
    const version = exportVersion(ev)
    const entry = map.entries[ev.id]
    if (entry?.version === version) continue
    if (entry) await deleteDeviceEvent(entry.deviceId)
    try {
      const deviceId = await createDeviceEvent(map.calendarId, ev)
      map.entries[ev.id] = { deviceId, version }
      changed++
    } catch {
      delete map.entries[ev.id] // a következő szinkron újrapróbálja
    }
  }

  await writeExportMap(map)
  return changed
}

/** A „FamilyHub" telefonos naptár törlése (kikapcsoláskor). */
export async function removeFamilyHubCalendarFromDevice(): Promise<void> {
  if ((await getCalendarPermission()) !== 'granted') return
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  for (const c of calendars.filter((c) => c.title === FAMILYHUB_CALENDAR_TITLE)) {
    await Calendar.deleteCalendarAsync(c.id)
  }
  await writeExportMap(null)
}

// ─── Telefon naptár → FamilyHub (csak olvasás, csak ezen a telefonon) ──────────

export interface DeviceCalendarInfo {
  id: string
  title: string
  color: string
  sourceName: string
}

/** A beolvasható telefonos naptárak (az app saját naptárai nélkül). */
export async function listImportableCalendars(): Promise<DeviceCalendarInfo[]> {
  if ((await getCalendarPermission()) !== 'granted') return []
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  return calendars
    .filter((c) => !OWN_CALENDAR_TITLES.includes(c.title))
    .map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color,
      sourceName: c.source?.name ?? '',
    }))
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'hu') || a.title.localeCompare(b.title, 'hu'))
}

/** Telefonos esemény-azonosító előtag: az ilyen események csak olvashatók. */
export const DEVICE_EVENT_PREFIX = 'dev:'

export function isDeviceEvent(event: Pick<CalendarEvent, 'id'>): boolean {
  return event.id.startsWith(DEVICE_EVENT_PREFIX)
}

/**
 * A kiválasztott telefonos naptárak eseményei az időablakban, `CalendarEvent`-té
 * képezve (az ismétlődőket a rendszer már előfordulásokra bontja). Az `id` a
 * `dev:` előtagot és a kezdést is tartalmazza (egy ismétlődő sorozat
 * előfordulásai azonos telefonos id-t kapnak).
 */
export async function fetchDeviceEvents(
  calendarIds: string[],
  start: Date,
  end: Date,
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) return []
  if ((await getCalendarPermission()) !== 'granted') return []

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const byId = new Map(calendars.map((c) => [c.id, c]))
  const ids = calendarIds.filter((id) => byId.has(id))
  if (ids.length === 0) return []

  const raw = await Calendar.getEventsAsync(ids, start, end)
  return raw.map((e) => {
    const cal = byId.get(e.calendarId)
    const startsAt = new Date(e.startDate).toISOString()
    return {
      id: `${DEVICE_EVENT_PREFIX}${e.id}:${startsAt}`,
      user_id: 'device',
      created_by: null,
      created_at: startsAt,
      updated_at: startsAt,
      title: e.title || '(nincs cím)',
      description: e.notes || null,
      location: e.location || null,
      starts_at: startsAt,
      ends_at: e.endDate ? new Date(e.endDate).toISOString() : null,
      all_day: e.allDay,
      member_id: null,
      color: cal?.color ?? colors.muted,
      rrule: null,
      event_type: 'event',
      device_calendar: cal?.title ?? 'Telefon naptár',
    }
  })
}

