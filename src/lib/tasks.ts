import { File } from 'expo-file-system'

import { supabase } from '@/lib/supabase'
import { dayKey, eventTimeLabel, nextOccurrence } from '@/lib/calendar'
import { formatHuDate } from '@/lib/format'
import type { FamilyTask, FamilyTaskInput } from '@/types'

// Családi feladatok – közös (adatgazda-modell, mint a naptár). `ownerId` = a család
// adatgazdája (resolveDataOwnerId), `createdBy` = aki ténylegesen felvette.

const TABLE = 'family_tasks'
const PHOTO_BUCKET = 'task-photos'
const SIGNED_URL_TTL_S = 60 * 60

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function fetchTasks(ownerId: string): Promise<FamilyTask[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as FamilyTask[]
}

export async function insertTask(
  ownerId: string,
  createdBy: string,
  id: string,
  input: FamilyTaskInput,
): Promise<FamilyTask> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, id, user_id: ownerId, created_by: createdBy })
    .select('*')
    .single()
  if (error) throw error
  return data as FamilyTask
}

export type FamilyTaskPatch = Partial<
  FamilyTaskInput & Pick<FamilyTask, 'completed_at' | 'completed_by'>
>

export async function patchTask(id: string, patch: FamilyTaskPatch): Promise<FamilyTask> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as FamilyTask
}

export async function removeTask(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// ─── Fotó (privát Storage bucket) ─────────────────────────────────────────────
export function taskPhotoPath(ownerId: string, taskId: string): string {
  // Időbélyeg a fájlnévben: fotócserénél új URL → nem a régi (cache-elt) kép látszik.
  return `${ownerId}/${taskId}-${Date.now()}.jpg`
}

/** Helyi kép (kamera / galéria URI) feltöltése; visszaadja a storage útvonalat. */
export async function uploadTaskPhoto(ownerId: string, taskId: string, localUri: string): Promise<string> {
  const bytes = await new File(localUri).arrayBuffer()
  const path = taskPhotoPath(ownerId, taskId)
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return path
}

export async function deleteTaskPhoto(path: string): Promise<void> {
  signedUrlCache.delete(path)
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
  if (error) throw error
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/** Aláírt (1 órás) URL a megjelenítéshez; memóriában cache-elve, lejárat előtt 5 perccel frissül. */
export async function getTaskPhotoUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt - 5 * 60_000 > Date.now()) return cached.url
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_S)
  if (error || !data) return null
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_S * 1000 })
  return data.signedUrl
}

// ─── Határidő ─────────────────────────────────────────────────────────────────
/** Lejárt-e: időponttal → a határidő elmúlt; csak dátummal → a nap már elmúlt. */
export function isOverdue(task: FamilyTask, now: Date = new Date()): boolean {
  if (!task.due_at || task.completed_at) return false
  const due = new Date(task.due_at)
  if (task.due_has_time) return due.getTime() < now.getTime()
  return dayKey(due) < dayKey(now)
}

/** Határidő-felirat: „Ma 18:00", „Holnap", „Tegnap", „11.12.", más évben „2027.01.05.". */
export function dueLabel(task: Pick<FamilyTask, 'due_at' | 'due_has_time'>, now: Date = new Date()): string | null {
  if (!task.due_at) return null
  const due = new Date(task.due_at)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)

  let day: string
  if (diffDays === 0) day = 'Ma'
  else if (diffDays === 1) day = 'Holnap'
  else if (diffDays === -1) day = 'Tegnap'
  else if (due.getFullYear() === now.getFullYear()) {
    day = `${String(due.getMonth() + 1).padStart(2, '0')}.${String(due.getDate()).padStart(2, '0')}.`
  } else day = formatHuDate(task.due_at)

  return task.due_has_time ? `${day} ${eventTimeLabel(task.due_at)}` : day
}

/**
 * Ismétlődő feladat következő határideje kipipáláskor (ISO), a már elmúlt alkalmakat
 * átugorva. null, ha a feladat nem ismétlődő / nincs határideje / az ismétlődés véget ért.
 */
export function nextDueAt(task: FamilyTask, now: Date = new Date()): string | null {
  if (!task.rrule || !task.due_at) return null
  const isPast = (d: Date) => (task.due_has_time ? d.getTime() <= now.getTime() : dayKey(d) < dayKey(now))
  return nextOccurrence(new Date(task.due_at), task.rrule, isPast)?.toISOString() ?? null
}

/** Rendezési kulcs: határidő (csak dátumnál a nap vége), határidő nélkül a végére. */
function dueSortValue(task: FamilyTask): number {
  if (!task.due_at) return Number.MAX_SAFE_INTEGER
  const due = new Date(task.due_at)
  if (task.due_has_time) return due.getTime()
  return new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59).getTime()
}

export function sortByDue(tasks: FamilyTask[]): FamilyTask[] {
  return [...tasks].sort((a, b) => dueSortValue(a) - dueSortValue(b) || a.created_at.localeCompare(b.created_at))
}

export interface TaskGroups {
  overdue: FamilyTask[]
  upcoming: FamilyTask[]
  noDue: FamilyTask[]
  done: FamilyTask[]
}

const DONE_LIMIT = 20

/** Képernyő-szekciók: Lejárt / Hamarosan / Határidő nélkül / Kész (utolsó 20, legfrissebb elöl). */
export function groupTasks(tasks: FamilyTask[], now: Date = new Date()): TaskGroups {
  const open = sortByDue(tasks.filter((t) => !t.completed_at))
  const done = tasks
    .filter((t) => t.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, DONE_LIMIT)
  return {
    overdue: open.filter((t) => isOverdue(t, now)),
    upcoming: open.filter((t) => t.due_at && !isOverdue(t, now)),
    noDue: open.filter((t) => !t.due_at),
    done,
  }
}

/** Tag-szűrő: 'all' = mind, null = csak a közös feladatok, egyébként a tag id-ja. */
export type TaskAssigneeFilter = 'all' | string | null

export function filterByAssignee(tasks: FamilyTask[], filter: TaskAssigneeFilter): FamilyTask[] {
  if (filter === 'all') return tasks
  return tasks.filter((t) => t.assignee_id === filter)
}
