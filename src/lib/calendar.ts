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

/** A hónap-grid teljes [első cella … utolsó cella] dátumtartománya. */
export function monthGridRange(year: number, month: number): { start: Date; end: Date } {
  const m = buildMonthMatrix(year, month)
  return { start: m[0]!.date, end: m[m.length - 1]!.date }
}

// ─── Ismétlődés (RFC 5545 részhalmaz) ─────────────────────────────────────────
// v1: egyszerű preset-ek (napi/heti/havi/éves) + opcionális vég-dátum. A táblában
// EGY sor tárolódik a `rrule` mezővel; megjelenítéskor a látható ablakra bontjuk ki
// (`expandEvents`). A szerkesztés mindig a mester-eseményen történik (lásd naptar.tsx).

export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export const RECURRENCE_OPTIONS: { key: RecurrenceFreq; label: string }[] = [
  { key: 'none', label: 'Nincs' },
  { key: 'daily', label: 'Naponta' },
  { key: 'weekly', label: 'Hetente' },
  { key: 'monthly', label: 'Havonta' },
  { key: 'yearly', label: 'Évente' },
]

// Az „Egyéni" intervallum szerkesztőhöz (pl. „minden 6 hét" – műszakciklus).
export const RECURRENCE_UNITS: { key: Exclude<RecurrenceFreq, 'none'>; label: string }[] = [
  { key: 'daily', label: 'nap' },
  { key: 'weekly', label: 'hét' },
  { key: 'monthly', label: 'hónap' },
  { key: 'yearly', label: 'év' },
]

const FREQ_ADVERB = { daily: 'naponta', weekly: 'hetente', monthly: 'havonta', yearly: 'évente' } as const

const FREQ_TO_RFC = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' } as const
const RFC_TO_FREQ = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' } as const

interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  until: Date | null
  count: number | null
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Vég-dátum → RFC UNTIL (UTC, a nap végén), hogy a teljes nap beleférjen. */
function formatUntil(d: Date): string {
  const u = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return `${u.getUTCFullYear()}${pad2(u.getUTCMonth() + 1)}${pad2(u.getUTCDate())}T${pad2(u.getUTCHours())}${pad2(u.getUTCMinutes())}${pad2(u.getUTCSeconds())}Z`
}

function parseUntil(raw: string): Date | null {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function parseRRule(rrule: string | null): RecurrenceRule | null {
  if (!rrule) return null
  const parts: Record<string, string> = {}
  for (const seg of rrule.split(';')) {
    const [k, v] = seg.split('=')
    if (k) parts[k.toUpperCase()] = v ?? ''
  }
  const freq = parts['FREQ']
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null
  const interval = parts['INTERVAL'] ? Math.max(1, parseInt(parts['INTERVAL'], 10) || 1) : 1
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) || null : null
  const until = parts['UNTIL'] ? parseUntil(parts['UNTIL']) : null
  return { freq, interval, until, count }
}

/** Preset/egység + intervallum + vég-dátum → tárolható `rrule` string. */
export function buildRRule(freq: RecurrenceFreq, interval: number, until: Date | null): string | null {
  if (freq === 'none') return null
  const iv = Math.max(1, Math.floor(interval) || 1)
  let s = `FREQ=${FREQ_TO_RFC[freq]}`
  if (iv > 1) s += `;INTERVAL=${iv}`
  if (until) s += `;UNTIL=${formatUntil(until)}`
  return s
}

/** `rrule` → preset/egység kulcs (a szerkesztő feltöltéséhez). */
export function freqFromRRule(rrule: string | null): RecurrenceFreq {
  const r = parseRRule(rrule)
  return r ? RFC_TO_FREQ[r.freq] : 'none'
}

/** `rrule` → ismétlődési intervallum (1, ha nincs / egyszerű). */
export function intervalFromRRule(rrule: string | null): number {
  return parseRRule(rrule)?.interval ?? 1
}

/** `rrule` → vég-dátum (vagy null, ha végtelen / nincs ismétlődés). */
export function untilFromRRule(rrule: string | null): Date | null {
  return parseRRule(rrule)?.until ?? null
}

/** Rövid magyar címke az ismétlődésről (pl. „6 hetente"; vagy null, ha egyszeri). */
export function recurrenceLabel(rrule: string | null): string | null {
  const r = parseRRule(rrule)
  if (!r) return null
  const adverb = FREQ_ADVERB[RFC_TO_FREQ[r.freq]]
  return r.interval > 1 ? `${r.interval} ${adverb}` : adverb
}

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function stepDate(base: Date, freq: RecurrenceRule['freq'], steps: number): Date {
  const d = new Date(base)
  if (freq === 'DAILY') d.setDate(d.getDate() + steps)
  else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7 * steps)
  else if (freq === 'MONTHLY') d.setMonth(d.getMonth() + steps)
  else d.setFullYear(d.getFullYear() + steps)
  return d
}

/**
 * Az ismétlődő eseményeket konkrét előfordulásokká bontja a [rangeStart, rangeEnd]
 * ablakban (a nem-ismétlődők változatlanul átmennek). Minden előfordulás a mester
 * `id`-jét őrzi (a szerkesztés a mestert nyitja), de a saját `starts_at`/`ends_at`
 * időpontjával. A nagy ciklusok elkerülésére az induló indexet az ablak elejére
 * ugratja (DAILY/WEEKLY/MONTHLY/YEARLY).
 */
export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const out: CalendarEvent[] = []
  const rangeStartMs = startOfDayMs(rangeStart)
  const rangeEndMs = new Date(
    rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999,
  ).getTime()

  for (const ev of events) {
    const rule = parseRRule(ev.rrule)
    if (!rule) {
      out.push(ev)
      continue
    }

    const start = new Date(ev.starts_at)
    const durationMs = ev.ends_at ? Math.max(0, new Date(ev.ends_at).getTime() - start.getTime()) : 0
    const untilMs = rule.until
      ? new Date(rule.until.getFullYear(), rule.until.getMonth(), rule.until.getDate(), 23, 59, 59, 999).getTime()
      : null

    // Induló index: az ablak elejéhez ugratás (egy lépés ráhagyással), hogy ne
    // kelljen a mester kezdetétől végigiterálni.
    let i = 0
    if (rangeStartMs > startOfDayMs(start)) {
      if (rule.freq === 'DAILY' || rule.freq === 'WEEKLY') {
        const stepDays = (rule.freq === 'DAILY' ? 1 : 7) * rule.interval
        const diffDays = Math.floor((rangeStartMs - startOfDayMs(start)) / 86_400_000)
        i = Math.max(0, Math.floor(diffDays / stepDays) - 1)
      } else if (rule.freq === 'MONTHLY') {
        const months = (rangeStart.getFullYear() - start.getFullYear()) * 12 + (rangeStart.getMonth() - start.getMonth())
        i = Math.max(0, Math.floor(months / rule.interval) - 1)
      } else {
        const years = rangeStart.getFullYear() - start.getFullYear()
        i = Math.max(0, Math.floor(years / rule.interval) - 1)
      }
    }

    const MAX = 500
    for (let n = 0; n < MAX; n++, i++) {
      if (rule.count != null && i >= rule.count) break
      const occ = stepDate(start, rule.freq, rule.interval * i)
      const occMs = occ.getTime()
      if (untilMs != null && occMs > untilMs) break
      if (occMs > rangeEndMs) break
      if (occMs >= rangeStartMs) {
        out.push({
          ...ev,
          starts_at: occ.toISOString(),
          ends_at: durationMs ? new Date(occMs + durationMs).toISOString() : null,
        })
      }
    }
  }
  return out
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

/** Több esemény beszúrása explicit id-kkel (műszak-generálás – stabil id a követéshez). */
export async function insertEvents(
  userId: string,
  rows: (CalendarEventInput & { id: string })[],
): Promise<CalendarEvent[]> {
  if (rows.length === 0) return []
  const payload = rows.map((r) => ({ ...r, user_id: userId, created_by: userId }))
  const { data, error } = await supabase.from('calendar_events').insert(payload).select('*')
  if (error) throw error
  return (data ?? []) as CalendarEvent[]
}

/** Több esemény törlése id szerint (műszak-beosztás eltávolítása). */
export async function removeEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('calendar_events').delete().in('id', ids)
  if (error) throw error
}
