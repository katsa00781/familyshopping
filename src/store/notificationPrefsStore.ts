import { create } from 'zustand'

import { StorageKeys, getStorageItem, setStorageItem } from '@/lib/storage'

export interface NotificationPrefs {
  calendarReminders: boolean
  priceAlerts: boolean
  shoppingReminders: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  calendarReminders: true,
  priceAlerts: true,
  shoppingReminders: false,
}

interface NotificationPrefsState {
  prefs: NotificationPrefs
  hydrated: boolean
  load: () => Promise<void>
  setPref: (key: keyof NotificationPrefs, value: boolean) => void
}

/**
 * Lokális értesítési preferenciák (AsyncStorage). v1: csak a beállításokat
 * tároljuk; a tényleges push-ütemezés a v2.1 (out of scope). A memberStore /
 * shiftStore lokális-perzisztens mintáját követi.
 */
export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  hydrated: false,
  load: async () => {
    if (get().hydrated) return
    const stored = await getStorageItem<Partial<NotificationPrefs>>(
      StorageKeys.notificationPrefs,
    )
    set({ prefs: { ...DEFAULT_PREFS, ...(stored ?? {}) }, hydrated: true })
  },
  setPref: (key, value) => {
    const next = { ...get().prefs, [key]: value }
    set({ prefs: next })
    void setStorageItem(StorageKeys.notificationPrefs, next)
  },
}))
