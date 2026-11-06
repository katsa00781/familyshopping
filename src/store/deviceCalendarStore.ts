import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  ensureCalendarPermission,
  exportEventsToDevice,
  fetchDeviceEvents,
  getCalendarPermission,
  removeFamilyHubCalendarFromDevice,
  type CalendarPermission,
} from '@/lib/deviceCalendarSync'
import type { CalendarEvent, CalendarEventType } from '@/types'

// Kétirányú szinkron a telefon (Apple) naptárával – eszközönkénti beállítás.
//  • FamilyHub → telefon: a közös naptár családi eseményei és edzései a saját
//    „FamilyHub" naptárba (felhasználói döntés: műszak és ügyfél-időpont nem).
//  • Telefon → FamilyHub: a kiválasztott naptárak eseményei csak olvashatóan,
//    csak ezen a telefonon jelennek meg (nem kerülnek a közös naptárba).

const SETTINGS_KEY = 'deviceCalendar.settings'
const EXPORT_TYPES: readonly CalendarEventType[] = ['event', 'workout']
const EXPORT_DEBOUNCE_MS = 1500
// Beolvasási ablak: 2 hónap vissza, 13 hónap előre (a hónap-grid lapozásához).
const IMPORT_PAST_MONTHS = 2
const IMPORT_FUTURE_MONTHS = 13

interface Settings {
  exportEnabled: boolean
  importCalendarIds: string[]
}

const DEFAULT_SETTINGS: Settings = { exportEnabled: true, importCalendarIds: [] }

let exportTimer: ReturnType<typeof setTimeout> | null = null
let exportRunning = false
let pendingEvents: CalendarEvent[] | null = null

interface DeviceCalendarState extends Settings {
  loaded: boolean
  permission: CalendarPermission
  deviceEvents: CalendarEvent[]
  lastExportAt: string | null
  exportError: boolean

  loadSettings: () => Promise<void>
  /** Engedélykérés (felhasználói gombnyomásra). */
  requestPermission: () => Promise<CalendarPermission>
  setExportEnabled: (enabled: boolean, events: CalendarEvent[]) => Promise<void>
  toggleImportCalendar: (calendarId: string) => Promise<void>
  refreshDeviceEvents: () => Promise<void>
  /** Késleltetett kiírás (a calendarStore minden betöltés/módosítás után hívja). */
  scheduleExport: (events: CalendarEvent[]) => void
  /** Azonnali kiírás („Szinkron most"). */
  exportNow: (events: CalendarEvent[]) => Promise<void>
}

async function persistSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export const useDeviceCalendarStore = create<DeviceCalendarState>((set, get) => {
  async function runExport(events: CalendarEvent[]): Promise<void> {
    if (exportRunning) {
      pendingEvents = events // a futó szinkron után a legfrissebbel még egyszer
      return
    }
    exportRunning = true
    try {
      const result = await exportEventsToDevice(
        events.filter((e) => EXPORT_TYPES.includes(e.event_type)),
      )
      if (result >= 0) set({ lastExportAt: new Date().toISOString(), exportError: false })
    } catch {
      set({ exportError: true })
    } finally {
      exportRunning = false
      const next = pendingEvents
      pendingEvents = null
      if (next && get().exportEnabled) void runExport(next)
    }
  }

  return {
    ...DEFAULT_SETTINGS,
    loaded: false,
    permission: 'undetermined',
    deviceEvents: [],
    lastExportAt: null,
    exportError: false,

    loadSettings: async () => {
      const permission = await getCalendarPermission().catch(() => 'undetermined' as const)
      if (get().loaded) {
        set({ permission })
        return
      }
      let settings = DEFAULT_SETTINGS
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY)
        if (raw) settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      } catch {
        // sérült beállítás → alapértelmezés
      }
      set({ ...settings, permission, loaded: true })
    },

    requestPermission: async () => {
      await ensureCalendarPermission().catch(() => false)
      const permission = await getCalendarPermission()
      set({ permission })
      return permission
    },

    setExportEnabled: async (enabled, events) => {
      set({ exportEnabled: enabled })
      await persistSettings({ exportEnabled: enabled, importCalendarIds: get().importCalendarIds })
      if (enabled) await get().exportNow(events)
      else await removeFamilyHubCalendarFromDevice().catch(() => {})
    },

    toggleImportCalendar: async (calendarId) => {
      const current = get().importCalendarIds
      const next = current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId]
      set({ importCalendarIds: next })
      await persistSettings({ exportEnabled: get().exportEnabled, importCalendarIds: next })
      await get().refreshDeviceEvents()
    },

    refreshDeviceEvents: async () => {
      await get().loadSettings()
      const ids = get().importCalendarIds
      if (ids.length === 0 || get().permission !== 'granted') {
        set({ deviceEvents: [] })
        return
      }
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - IMPORT_PAST_MONTHS, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + IMPORT_FUTURE_MONTHS, 1)
      try {
        set({ deviceEvents: await fetchDeviceEvents(ids, start, end) })
      } catch {
        // a telefon naptár olvasása nem kritikus – marad az előző állapot
      }
    },

    scheduleExport: (events) => {
      if (exportTimer) clearTimeout(exportTimer)
      exportTimer = setTimeout(() => {
        exportTimer = null
        void (async () => {
          await get().loadSettings()
          if (!get().exportEnabled || get().permission !== 'granted') return
          await runExport(events)
        })()
      }, EXPORT_DEBOUNCE_MS)
    },

    exportNow: async (events) => {
      await get().loadSettings()
      if (!get().exportEnabled || get().permission !== 'granted') return
      await runExport(events)
    },
  }
})
