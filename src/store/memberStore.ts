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
  if (!remoteBacked && owner.userId !== owner.ownerId) return
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
    if (rows.length > 0) {
      const members = rows.map((r) => ({ id: r.id, name: r.name, color: r.color }))
      set({ members, remoteBacked: true })
      await persist(members)
      return
    }

    // Üres szerveres lista: CSAK az adatgazda telefonja tölti fel a saját tagjait
    // (az eddigi id-kkel → a meglévő esemény/étrend hozzárendelések megmaradnak).
    // Egy családtag telefonja sosem seedel, különben a véletlen id-jű alap-tagjai
    // felülírnák a tulajdonos tagjait.
    if (owner.userId === owner.ownerId) {
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
