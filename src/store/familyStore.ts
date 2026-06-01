import { create } from 'zustand'
import { supabase, getSessionSafe } from '@/lib/supabase'
import type { Family, FamilyMember, FamilyRole } from '@/types'

interface FamilyState {
  family: Family | null
  isLoading: boolean
  error: string | null

  loadFamily: () => Promise<void>
  renameFamily: (name: string) => Promise<void>
  regenerateInvite: () => Promise<void>
  changeRole: (memberId: string, role: FamilyRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  isLoading: false,
  error: null,

  loadFamily: async () => {
    set({ isLoading: true, error: null })
    try {
      const session = await getSessionSafe()
      const user = session?.user
      if (!user) {
        set({ isLoading: false })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single()

      if (!profile?.family_id) {
        set({ isLoading: false })
        return
      }

      const { data: familyData, error } = await supabase
        .from('families')
        .select('*, family_members(*, profiles(full_name, email))')
        .eq('id', profile.family_id)
        .single()

      if (error) throw error

      const members: FamilyMember[] = (familyData.family_members ?? []).map(
        (m: { id: string; role: FamilyRole; joined_at: string; profiles: { full_name: string | null; email: string | null } | null }) => ({
          id: m.id,
          name: m.profiles?.full_name ?? 'Ismeretlen',
          email: m.profiles?.email ?? '',
          role: m.role,
          joinedAt: m.joined_at,
        })
      )

      const family: Family = {
        id: familyData.id as string,
        name: familyData.name as string,
        inviteLink: (familyData.invite_link as string | null) ?? '',
        inviteExpiresAt: (familyData.invite_expires_at as string | null) ?? '',
        members,
      }

      set({ family, isLoading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Betöltési hiba', isLoading: false })
    }
  },

  renameFamily: async (name) => {
    const family = get().family
    if (!family) return

    const prev = family
    set({ family: { ...family, name } })

    const { error } = await supabase.from('families').update({ name }).eq('id', family.id)
    if (error) {
      set({ family: prev })
    }
  },

  regenerateInvite: async () => {
    const family = get().family
    if (!family) return

    const newLink = Math.random().toString(36).slice(2, 10).toUpperCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('families')
      .update({ invite_link: newLink, invite_expires_at: expiresAt })
      .eq('id', family.id)

    if (!error) {
      set({
        family: { ...family, inviteLink: newLink, inviteExpiresAt: expiresAt },
      })
    }
  },

  changeRole: async (memberId, role) => {
    const family = get().family
    if (!family) return

    const prev = family.members
    set({
      family: {
        ...family,
        members: family.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
      },
    })

    const { error } = await supabase
      .from('family_members')
      .update({ role })
      .eq('id', memberId)

    if (error) {
      set({ family: { ...family, members: prev } })
    }
  },

  removeMember: async (memberId) => {
    const family = get().family
    if (!family) return

    const prev = family.members
    set({
      family: {
        ...family,
        members: family.members.filter((m) => m.id !== memberId),
      },
    })

    const { error } = await supabase.from('family_members').delete().eq('id', memberId)
    if (error) {
      set({ family: { ...family, members: prev } })
    }
  },
}))
