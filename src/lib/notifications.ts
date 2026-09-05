import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { expandEvents, rangesOverlap } from '@/lib/calendar'
import { StorageKeys, getStorageItem, setStorageItem } from '@/lib/storage'
import type { CalendarEvent } from '@/types'

// Csak lokális (a készüléken ütemezett) értesítések – nincs push/szerver oldal.
// Két funkció: (1) esemény-emlékeztető a naptár/időpont események starts_at
// előtt, (2) beosztás-ütközés riasztás, ha egy esemény átfedésben van egy
// `shift` típusú eseménnyel. Mindkettő a `NotificationPrefs`-ből engedélyezhető
// (lásd `src/app/ertesitesek.tsx`).

const REMINDER_LEAD_MINUTES = 30
const ALL_DAY_REMINDER_HOUR = 8

type ReminderMap = Record<string, string> // calendar_events.id → scheduled notification id

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let permissionRequested = false

/** Rendszerszintű értesítési engedély kérése (egyszer / app-indításkor). */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (permissionRequested) {
    const existing = await Notifications.getPermissionsAsync()
    return existing.granted
  }
  permissionRequested = true

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Általános',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

async function getReminderMap(): Promise<ReminderMap> {
  return (await getStorageItem<ReminderMap>(StorageKeys.eventReminderMap)) ?? {}
}

async function setReminderMap(map: ReminderMap): Promise<void> {
  await setStorageItem(StorageKeys.eventReminderMap, map)
}

/** Emlékeztető ideje: nem egész napos esemény → starts_at - 30 perc; egész napos → aznap 08:00. */
function reminderDate(event: CalendarEvent): Date | null {
  const start = new Date(event.starts_at)
  if (event.all_day) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), ALL_DAY_REMINDER_HOUR, 0, 0, 0)
    return d
  }
  return new Date(start.getTime() - REMINDER_LEAD_MINUTES * 60_000)
}

/**
 * Emlékeztető ütemezése/frissítése egy naptáreseményhez (`event`/`appointment`
 * típusra – a `shift` sorokhoz nincs emlékeztető). Ha a kiszámolt időpont már
 * elmúlt, nem ütemez semmit. Létrehozáskor/szerkesztéskor hívandó.
 */
export async function scheduleEventReminder(event: CalendarEvent): Promise<void> {
  if (event.event_type === 'shift') return
  await cancelEventReminder(event.id)

  const when = reminderDate(event)
  if (!when || when.getTime() <= Date.now()) return

  const granted = await ensureNotificationPermissions()
  if (!granted) return

  const minutesLabel = event.all_day ? 'Ma' : `${REMINDER_LEAD_MINUTES} perc múlva`
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: event.all_day ? 'Mai esemény' : `${minutesLabel}: ${event.title}`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  })

  const map = await getReminderMap()
  map[event.id] = notificationId
  await setReminderMap(map)
}

/** A korábban ütemezett emlékeztető törlése (esemény szerkesztésekor/törlésekor). */
export async function cancelEventReminder(eventId: string): Promise<void> {
  const map = await getReminderMap()
  const notificationId = map[eventId]
  if (!notificationId) return
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})
  delete map[eventId]
  await setReminderMap(map)
}

async function getNotifiedConflictIds(): Promise<string[]> {
  return (await getStorageItem<string[]>(StorageKeys.shiftConflictNotified)) ?? []
}

/**
 * Átvizsgálja a közelgő eseményeket, és minden még nem jelzett, `shift`-tel
 * ütköző eseményről egy azonnali lokális értesítést küld. A már jelzett
 * (esemény id, ütköző műszak id) párokat megjegyzi, hogy ne riasszon duplán.
 * `loadEvents` sikeres lekérése után hívandó.
 */
export async function notifyShiftConflicts(events: CalendarEvent[]): Promise<void> {
  const now = new Date()
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 nap előretekintés
  const expanded = expandEvents(events, now, horizon)

  const shifts = expanded.filter((e) => e.event_type === 'shift' && new Date(e.starts_at) >= now)
  const others = expanded.filter((e) => e.event_type !== 'shift' && new Date(e.starts_at) >= now)
  if (shifts.length === 0 || others.length === 0) return

  const notified = new Set(await getNotifiedConflictIds())
  const stillRelevant = new Set<string>()
  const toNotify: { event: CalendarEvent; shift: CalendarEvent }[] = []

  for (const ev of others) {
    const conflict = shifts.find((s) =>
      rangesOverlap(new Date(ev.starts_at), new Date(ev.ends_at ?? ev.starts_at), new Date(s.starts_at), new Date(s.ends_at ?? s.starts_at)),
    )
    if (!conflict) continue
    const key = `${ev.id}:${dayKeyOf(ev.starts_at)}`
    stillRelevant.add(key)
    if (!notified.has(key)) toNotify.push({ event: ev, shift: conflict })
  }

  if (toNotify.length > 0) {
    const granted = await ensureNotificationPermissions()
    if (granted) {
      for (const { event, shift } of toNotify) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Ütközés a beosztásoddal',
            body: `„${event.title}" ütközik a műszakoddal (${shift.title}).`,
          },
          trigger: null,
        })
      }
    }
  }

  // Csak a jelenleg is fennálló ütközések kulcsait tartjuk meg (a régiek elévülnek).
  await setStorageItem(StorageKeys.shiftConflictNotified, Array.from(stillRelevant))
}

function dayKeyOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
