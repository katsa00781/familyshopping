import { create } from 'zustand'

import { resetDataOwnerCache } from '@/lib/dataOwner'
import { getSessionSafe, supabase } from '@/lib/supabase'
import { useCalendarStore } from '@/store/calendarStore'
import { useListStore } from '@/store/listStore'
import { useMemberStore } from '@/store/memberStore'
import { useProductStore } from '@/store/productStore'
import { useStoreOrderStore } from '@/store/storeOrderStore'
import type { Family, FamilyMember, FamilyRole } from '@/types'

// Család-megosztás (2026-11-06): `families` + `family_members` (lásd
// supabase/migrations/20261106120000_family_sharing.sql). Létrehozás, csatlakozás
// és meghívókód-generálás szerveroldali RPC-n át (security definer).

interface ProfileRow {
  full_name: string | null
  display_name: string | null
  email: string | null
}

interface MemberRow {
  id: string
  user_id: string
  role: FamilyRole
  joined_at: string
  // Futásidőben objektum (many-to-one), a típus nélküli kliens tömbnek következteti.
  profiles: ProfileRow | ProfileRow[] | null
}

interface FamilyRow {
  id: string
  owner_id: string
  name: string
  invite_link: string | null
  invite_expires_at: string | null
  family_members: MemberRow[] | null
}

const RPC_ERRORS: Record<string, string> = {
  INVALID_CODE: 'Érvénytelen vagy lejárt meghívókód.',
  ALREADY_IN_FAMILY: 'Már tagja vagy egy családnak.',
  NOT_ALLOWED: 'Ehhez admin jogosultság kell.',
  NOT_AUTHENTICATED: 'Jelentkezz be újra.',
}

function rpcErrorMessage(message: string | undefined): string {
  const key = Object.keys(RPC_ERRORS).find((k) => message?.includes(k))
  return key ? (RPC_ERRORS[key] ?? 'Ismeretlen hiba') : 'Hálózati hiba, próbáld újra.'
}

function toFamily(row: FamilyRow): Family {
  const members: FamilyMember[] = (row.family_members ?? [])
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return {
        id: m.id,
        userId: m.user_id,
        name: profile?.display_name || profile?.full_name || profile?.email || 'Ismeretlen',
        email: profile?.email ?? '',
        role: m.role,
        joinedAt: m.joined_at,
      }
    })
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    inviteLink: row.invite_link ?? '',
    inviteExpiresAt: row.invite_expires_at ?? '',
    members,
  }
}

/** Családváltás után a közös adatok gazdája megváltozhat → minden közös adat újratöltése. */
async function reloadSharedData(): Promise<void> {
  resetDataOwnerCache()
  await Promise.all([
    useListStore.getState().loadLists(),
    useProductStore.getState().loadProducts(),
    useStoreOrderStore.getState().loadOrder(true),
    useCalendarStore.getState().loadEvents(),
    useMemberStore.getState().loadMembers(true),
  ])
}

interface FamilyState {
  family: Family | null
  isLoading: boolean
  error: string | null

  loadFamily: () => Promise<void>
  /** Hibánál magyar hibaüzenet, sikernél null. */
  createFamily: (name: string) => Promise<string | null>
  joinFamily: (code: string) => Promise<string | null>
  leaveFamily: () => Promise<string | null>
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
        set({ family: null, isLoading: false })
        return
      }

      // RLS: csak a saját család látszik → legfeljebb egy sor.
      const { data, error } = await supabase
        .from('families')
        .select(
          'id, owner_id, name, invite_link, invite_expires_at, family_members(id, user_id, role, joined_at, profiles(full_name, display_name, email))',
        )
        .maybeSingle()

      if (error) throw error
      set({ family: data ? toFamily(data as FamilyRow) : null, isLoading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Betöltési hiba', isLoading: false })
    }
  },

  createFamily: async (name) => {
    const { error } = await supabase.rpc('create_family', { p_name: name })
    if (error) return rpcErrorMessage(error.message)
    await get().loadFamily()
    await reloadSharedData()
    return null
  },

  joinFamily: async (code) => {
    const { error } = await supabase.rpc('join_family', { p_code: code })
    if (error) return rpcErrorMessage(error.message)
    await get().loadFamily()
    await reloadSharedData()
    return null
  },

  leaveFamily: async () => {
    const session = await getSessionSafe()
    const family = get().family
    const me = family?.members.find((m) => m.userId === session?.user.id)
    if (!family || !me) return null
    if (family.ownerId === me.userId) {
      return 'A család tulajdonosa nem léphet ki (a közös adatok az ő fiókjához tartoznak).'
    }
    const { error } = await supabase.from('family_members').delete().eq('id', me.id)
    if (error) return rpcErrorMessage(error.message)
    set({ family: null })
    await reloadSharedData()
    return null
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
    const { error } = await supabase.rpc('regenerate_family_invite')
    if (error) {
      set({ error: rpcErrorMessage(error.message) })
      return
    }
    await get().loadFamily()
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

    const { error } = await supabase.from('family_members').update({ role }).eq('id', memberId)

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

    // RLS: a tulajdonos sora nem törölhető → 0 sor, ezt is hibaként kezeljük.
    const { data, error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .select('id')
    if (error || !data || data.length === 0) {
      set({ family: { ...family, members: prev } })
    }
  },
}))
