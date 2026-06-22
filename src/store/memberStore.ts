import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { memberColorAt } from '@/constants/colors'
import type { FamilyMemberLocal } from '@/types'

// v1: a családtagok lokálisak (single-user, profiles üres). Az étrend tagonkénti
// tételeihez kell névből + színből álló taglista. Később a család-megosztással
// szinkronizálható (v2.x). Lásd CLAUDE.md „v1 rögzített döntések".
const CACHE_KEY = 'familyhub_members_v1'

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

interface MemberState {
  members: FamilyMemberLocal[]
  loaded: boolean

  loadMembers: () => Promise<void>
  addMember: (name: string) => void
  updateMember: (id: string, patch: Partial<Pick<FamilyMemberLocal, 'name' | 'color'>>) => void
  removeMember: (id: string) => void
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  loaded: false,

  loadMembers: async () => {
    if (get().loaded) return
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (raw) {
      set({ members: JSON.parse(raw) as FamilyMemberLocal[], loaded: true })
      return
    }
    const seeded = seedMembers()
    await persist(seeded)
    set({ members: seeded, loaded: true })
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
  },

  updateMember: (id, patch) => {
    const next = get().members.map((m) => (m.id === id ? { ...m, ...patch } : m))
    set({ members: next })
    void persist(next)
  },

  removeMember: (id) => {
    const next = get().members.filter((m) => m.id !== id)
    set({ members: next })
    void persist(next)
  },
}))
