import { buildRRule, dayKey } from '@/lib/calendar'
import { memberColorAt } from '@/constants/colors'
import type { CalendarEventInput, ShiftSchedule, ShiftType } from '@/types'

// A műszaksablonból valódi naptáreseményeket generálunk: minden kiosztott
// műszaknap egy heti-ismétlődő esemény, ahol az INTERVAL = a ciklus hossza
// hetekben. Így a teljes rotáció (pl. 6 hetes beosztás) néhány ismétlődő
// eseménnyel leírható, és az `expandEvents` magától kibontja.

/** „06:00" – perc éjféltől → óra:perc címke. */
export function minutesToLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Egy Date óra/perce → perc éjféltől. */
export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Az adott naphoz tartozó hétfő (helyi idő). */
export function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // hétfő-első
  d.setDate(d.getDate() - offset)
  return d
}

/** Helyi YYYY-MM-DD → Date (helyi éjfél). */
export function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Alapértelmezett műszaktípusok első indításhoz (3 váltás, magyar nevek). */
export function defaultShiftTypes(makeId: () => string): ShiftType[] {
  return [
    { id: makeId(), name: 'Délelőttös', startMinutes: 6 * 60, endMinutes: 14 * 60, color: memberColorAt(0) },
    { id: makeId(), name: 'Délutános', startMinutes: 14 * 60, endMinutes: 22 * 60, color: memberColorAt(3) },
    { id: makeId(), name: 'Éjszakás', startMinutes: 22 * 60, endMinutes: 6 * 60, color: memberColorAt(2) },
  ]
}

/** Üres beosztás (a mai hét hétfőjétől, 6 hetes ciklus, nincs kiosztás). */
export function emptySchedule(cycleWeeks: number, memberId: string | null): ShiftSchedule {
  return {
    cycleWeeks,
    anchorDate: dayKey(mondayOf(new Date())),
    memberId,
    days: Array.from({ length: cycleWeeks * 7 }, () => null),
    generatedEventIds: [],
  }
}

/** A `days` tömb hosszának igazítása a ciklushossz változásakor (megtartja a meglévőt). */
export function resizeDays(days: (string | null)[], cycleWeeks: number): (string | null)[] {
  const total = cycleWeeks * 7
  const next = Array.from({ length: total }, (_, i) => days[i] ?? null)
  return next
}

/**
 * A sablonból generálandó naptáresemény-bemenetek. Minden kiosztott naphoz egy
 * heti-ismétlődő esemény (INTERVAL = cycleWeeks); az éjszakás (end <= start) műszak
 * vége másnapra esik.
 */
export function buildShiftEvents(schedule: ShiftSchedule, shiftTypes: ShiftType[]): CalendarEventInput[] {
  const typeById = new Map(shiftTypes.map((t) => [t.id, t]))
  const anchor = parseLocalDate(schedule.anchorDate)
  const rrule = buildRRule('weekly', schedule.cycleWeeks, null)
  const out: CalendarEventInput[] = []

  const total = schedule.cycleWeeks * 7
  for (let i = 0; i < total; i++) {
    const typeId = schedule.days[i]
    if (!typeId) continue
    const t = typeById.get(typeId)
    if (!t) continue

    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i)
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
    start.setMinutes(t.startMinutes)

    const overnight = t.endMinutes <= t.startMinutes
    const endBase = new Date(day.getFullYear(), day.getMonth(), day.getDate() + (overnight ? 1 : 0))
    const end = new Date(endBase.getFullYear(), endBase.getMonth(), endBase.getDate())
    end.setMinutes(t.endMinutes)

    out.push({
      title: t.name,
      description: null,
      location: null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      all_day: false,
      member_id: schedule.memberId,
      color: t.color,
      rrule,
    })
  }
  return out
}
