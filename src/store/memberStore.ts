import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { memberColorAt } from '@/constants/colors'
import { resolveDataOwnerId } from '@/lib/dataOwner'
import { getSessionSafe, supabase } from '@/lib/supabase'
import type { FamilyMemberLocal } from '@/types'

// A háztartás tagjai (név + tagszín; fiók nélküli gyerekek is). A naptár és az
// étrend `member_id`-ja erre hivatkozik.
//
// Közös taglista (2026-11-06): a szerveren a `household_members` táblában él, a
// család adatgazdájához kötve (supabase/migrations/20261106140000_shared_calendar.sql).
// Az AsyncStorage gyors induló cache és offline tartalék. Ha a tábla még nincs
// meg / hiba van, a lista lokális marad (a korábbi viselkedés).
const CACHE_KEY = 'familyhub_members_v1'
// A képernyők fókuszkor hívják a betöltést – a szervert legfeljebb ennyi időnként kérdezzük.
const REFRESH_INTERVAL_MS = 30_000

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Első indításkor seed: a leggyakoribb családi felállás. Bármikor szerkeszthető.
const SEED_NAMES = ['Apa', 'Anya', 'Kevin', 'Kira'] as const
function seedMembers(): FamilyMemberLocal[] {
  return SEED_NAMES.map((name, i) => ({ id: generateId(), name, color: memberColorAt(i) }))
}

async function persist(members: FamilyMemberLocal[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(members))
}

interface MemberRow {
  id: string
  name: string
  color: string
}

/** Bejelentkezett felhasználó + a közös adatok gazdája; offline/mock → null. */
async function currentOwner(): Promise<{ userId: string; ownerId: string } | null> {
  const session = await getSessionSafe()
  if (!session?.user) return null
  return { userId: session.user.id, ownerId: await resolveDataOwnerId(session.user.id) }
}

async function countRefs(
  table: 'calendar_events' | 'meal_plan_entries',
  ownerId: string,
  memberIds: string[] | null,
): Promise<number | null> {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerId)
  query = memberIds ? query.in('member_id', memberIds) : query.not('member_id', 'is', null)
  const { count, error } = await query
  return error ? null : (count ?? 0)
}

/** Ennyi esemény + étrend-tétel hivatkozik a megadott tagokra (hibánál null). */
async function referenceCount(ownerId: string, ids: string[]): Promise<number | null> {
  if (ids.length === 0) return 0
  const [cal, meal] = await Promise.all([
    countRefs('calendar_events', ownerId, ids),
    countRefs('meal_plan_entries', ownerId, ids),
  ])
  return cal === null || meal === null ? null : cal + meal
}

/**
 * Igaz, ha ez a telefon a „valódi" taglistát tartja: a tagjaira hivatkozik esemény
 * vagy étrend-tétel, vagy még sehol nincs tag-hivatkozás. Hibánál (null) nem tölt fel.
 */
async function isCanonicalLocalList(
  ownerId: string,
  members: FamilyMemberLocal[],
): Promise<boolean> {
  const ids = members.map((m) => m.id)
  if (ids.length === 0) return false
  const counts = await Promise.all([
    countRefs('calendar_events', ownerId, ids),
    countRefs('meal_plan_entries', ownerId, ids),
    countRefs('calendar_events', ownerId, null),
    countRefs('meal_plan_entries', ownerId, null),
  ])
  if (counts.some((c) => c === null)) return false
  const [calOwn, mealOwn, calAny, mealAny] = counts as number[]
  return (calOwn ?? 0) + (mealOwn ?? 0) > 0 || (calAny ?? 0) + (mealAny ?? 0) === 0
}

async function upsertRemote(ownerId: string, members: FamilyMemberLocal[]): Promise<boolean> {
  if (members.length === 0) return true
  const rows = members.map((m, i) => ({
    id: m.id,
    user_id: ownerId,
    name: m.name,
    color: m.color,
    sort_order: i,
  }))
  const { error } = await supabase.from('household_members').upsert(rows)
  return !error
}

/**
 * Helyi tag-szerkesztés felküldése. Családtag (nem adatgazda) csak akkor ír, ha a
 * lista már a szerverről jött – különben a saját alap-tagjait töltené fel a közös
 * listába. A sorrend (sort_order) mindig a teljes listából számolódik újra.
 */
async function syncRemote(
  members: FamilyMemberLocal[],
  remoteBacked: boolean,
  deletedId?: string,
): Promise<void> {
  const owner = await currentOwner()
  if (!owner) return
  if (!remoteBacked) {
    // Szerverről még nem jött lista: családtag sosem, az adatgazda csak a „valódi"
    // (hivatkozott) listával tölthet fel.
    if (owner.userId !== owner.ownerId) return
    if (!(await isCanonicalLocalList(owner.ownerId, members))) return
  }
  if (deletedId) await supabase.from('household_members').delete().eq('id', deletedId)
  if (await upsertRemote(owner.ownerId, members)) useMemberStore.setState({ remoteBacked: true })
}

interface MemberState {
  members: FamilyMemberLocal[]
  loaded: boolean
  lastRemoteSync: number
  /** Igaz, ha a lista a szerverről jött / oda feltöltöttük → a helyi szerkesztés szinkronizálható. */
  remoteBacked: boolean

  /** `force`: családváltás után azonnal a szervert kérdezi (a 30 mp-es korláttól függetlenül). */
  loadMembers: (force?: boolean) => Promise<void>
  addMember: (name: string) => void
  updateMember: (id: string, patch: Partial<Pick<FamilyMemberLocal, 'name' | 'color'>>) => void
  removeMember: (id: string) => void
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  loaded: false,
  lastRemoteSync: 0,
  remoteBacked: false,

  loadMembers: async (force = false) => {
    // 1) Lokális cache (azonnali megjelenítés). Seed csak, ha még soha nem volt lista.
    if (!get().loaded) {
      const raw = await AsyncStorage.getItem(CACHE_KEY)
      if (raw) {
        set({ members: JSON.parse(raw) as FamilyMemberLocal[], loaded: true })
      } else {
        const seeded = seedMembers()
        await persist(seeded)
        set({ members: seeded, loaded: true })
      }
    }

    // 2) Szerver (közös lista), legfeljebb 30 mp-enként.
    if (!force && Date.now() - get().lastRemoteSync < REFRESH_INTERVAL_MS) return
    const owner = await currentOwner()
    if (!owner) return

    const { data, error } = await supabase
      .from('household_members')
      .select('id, name, color')
      .eq('user_id', owner.ownerId)
      .order('sort_order', { ascending: true })
    if (error) return // pl. a migráció még nincs alkalmazva / offline → marad a lokális
    set({ lastRemoteSync: Date.now() })

    const rows = (data ?? []) as MemberRow[]

    // Öngyógyítás (adatgazda telefonja, első szinkronnál): ha a szerveres tagokra
    // semmi nem hivatkozik, a helyiekre viszont igen, akkor a szerverre egy friss
    // telepítés seedelt alap-tagokat → a helyi (valódi) lista nyer és lecseréli.
    if (rows.length > 0 && owner.userId === owner.ownerId && !get().remoteBacked) {
      const localIds = get().members.map((m) => m.id)
      const serverIds = rows.map((r) => r.id)
      const sameList =
        localIds.length === serverIds.length && localIds.every((id) => serverIds.includes(id))
      if (!sameList) {
        const [serverRefs, localRefs] = await Promise.all([
          referenceCount(owner.ownerId, serverIds),
          referenceCount(owner.ownerId, localIds),
        ])
        if (serverRefs === 0 && localRefs !== null && localRefs > 0) {
          const stale = serverIds.filter((id) => !localIds.includes(id))
          if (await upsertRemote(owner.ownerId, get().members)) {
            if (stale.length > 0) {
              await supabase.from('household_members').delete().in('id', stale)
            }
            set({ remoteBacked: true })
          }
          return
        }
      }
    }

    if (rows.length > 0) {
      const members = rows.map((r) => ({ id: r.id, name: r.name, color: r.color }))
      set({ members, remoteBacked: true })
      await persist(members)
      return
    }

    // Üres szerveres lista: CSAK az adatgazda telefonja tölti fel a saját tagjait
    // (az eddigi id-kkel → a meglévő esemény/étrend hozzárendelések megmaradnak).
    // Egy családtag telefonja sosem seedel, különben a véletlen id-jű alap-tagjai
    // felülírnák a tulajdonos tagjait. Az adatgazda fiókja is futhat friss telepítésen
    // (szimulátor, újratelepítés) frissen seedelt tagokkal – ezért csak akkor tölt fel,
    // ha a helyi tagokra tényleg hivatkozik esemény/étrend-tétel, vagy még egyáltalán
    // nincs tag-hivatkozás (új család).
    if (
      owner.userId === owner.ownerId &&
      (await isCanonicalLocalList(owner.ownerId, get().members))
    ) {
      if (await upsertRemote(owner.ownerId, get().members)) set({ remoteBacked: true })
    }
  },

  addMember: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const members = get().members
    const next = [
      ...members,
      { id: generateId(), name: trimmed, color: memberColorAt(members.length) },
    ]
    set({ members: next })
    void persist(next)
    void syncRemote(next, get().remoteBacked)
  },

  updateMember: (id, patch) => {
    const next = get().members.map((m) => (m.id === id ? { ...m, ...patch } : m))
    set({ members: next })
    void persist(next)
    void syncRemote(next, get().remoteBacked)
  },

  removeMember: (id) => {
    const next = get().members.filter((m) => m.id !== id)
    set({ members: next })
    void persist(next)
    void syncRemote(next, get().remoteBacked, id)
  },
}))
