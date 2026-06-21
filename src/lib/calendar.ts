import { supabase } from '@/lib/supabase'
import type { CalendarEvent, CalendarEventInput } from '@/types'

// ─── Dátum-helperek (helyi idő, TZ-eltolás nélkül) ────────────────────────────
// A naptár-grid és az agenda helyi idő szerint csoportosít. A starts_at UTC-ben
// tárolódik; olvasáskor a helyi naphoz rendeljük (dayKey).

const WEEKDAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'] as const
const MONTHS_HU = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
] as const

export const weekdayHeaders = WEEKDAY_SHORT

export interface CalendarDay {
  date: Date
  day: number // a hónap napja (1–31)
  key: string // helyi YYYY-MM-DD
  inMonth: boolean // az aktuális hónaphoz tartozik-e
  isToday: boolean
  isSunday: boolean
}

/** Helyi naptári kulcs (YYYY-MM-DD), TZ-eltolás nélkül. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Egy esemény helyi napja (a starts_at alapján). */
export function eventDayKey(event: CalendarEvent): string {
  return dayKey(new Date(event.starts_at))
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

/** A hónap teljes, hétfővel kezdődő rácsa (6 sor × 7 nap = 42 cella). */
export function buildMonthMatrix(year: number, month: number): CalendarDay[] {
  const today = new Date()
  const first = new Date(year, month, 1)
  // getDay(): 0=vasárnap … 6=szombat → hétfő-első offset
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)

  const days: CalendarDay[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    days.push({
      date,
      day: date.getDate(),
      key: dayKey(date),
      inMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      isSunday: date.getDay() === 0,
    })
  }
  return days
}

/** „2026. június" – hónap-fejléc. */
export function monthTitle(year: number, month: number): string {
  return `${year}. ${MONTHS_HU[month]}`
}

/** „Június 19., péntek" – agenda nap-címke. */
export function agendaDayLabel(date: Date): string {
  const month = MONTHS_HU[date.getMonth()]!
  const cap = month.charAt(0).toUpperCase() + month.slice(1)
  const weekday = date.toLocaleDateString('hu-HU', { weekday: 'long' })
  return `${cap} ${date.getDate()}., ${weekday}`
}

/** „07:45" – esemény kezdő időpontja (helyi idő). */
export function eventTimeLabel(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** „2026. jún. 19." – rövid dátum-pirula a szerkesztőhöz. */
export function shortDateLabel(date: Date): string {
  const month = MONTHS_HU[date.getMonth()]!.slice(0, 3)
  return `${date.getFullYear()}. ${month}. ${date.getDate()}.`
}

/** Dátum + perc (a nap kezdetétől) → ISO timestamp tároláshoz. */
export function combineDateTime(dayDate: Date, minutes: number): string {
  const d = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate())
  d.setMinutes(minutes)
  return d.toISOString()
}

/** ISO timestamp → perc a nap kezdetétől (helyi idő). */
export function minutesOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CalendarEvent[]
}

export async function insertEvent(
  userId: string,
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...input, user_id: userId, created_by: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as CalendarEvent
}

export async function patchEvent(
  id: string,
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as CalendarEvent
}

export async function removeEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}
