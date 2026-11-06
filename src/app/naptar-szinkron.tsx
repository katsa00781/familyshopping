import { useCallback, useEffect, useState } from 'react'
import { Linking, Switch, Text, View } from 'react-native'

import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import Button from '@/components/ui/Button'
import { colors } from '@/constants/colors'
import { eventTimeLabel } from '@/lib/calendar'
import { listImportableCalendars, type DeviceCalendarInfo } from '@/lib/deviceCalendarSync'
import { formatHuDate } from '@/lib/format'
import { useCalendarStore } from '@/store/calendarStore'
import { useDeviceCalendarStore } from '@/store/deviceCalendarStore'

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
  dotColor?: string
  last?: boolean
}

function ToggleRow({ label, description, value, onValueChange, dotColor, last }: ToggleRowProps) {
  return (
    <View
      className={`flex-row items-center px-4 py-3 gap-3 ${
        last ? '' : 'border-b border-border dark:border-dark-border'
      }`}
    >
      {dotColor && (
        <View style={{ width: 12, height: 12, borderRadius: 99, backgroundColor: dotColor }} />
      )}
      <View className="flex-1 gap-0.5">
        <Text className="text-body-lg text-foreground dark:text-dark-foreground">{label}</Text>
        {description ? <Text className="text-body-sm text-muted">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  )
}

/** ISO időbélyeg → helyi `YYYY-MM-DD` (a formatHuDate-hez). */
function localDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-caption font-semibold text-muted uppercase tracking-widest px-1 mb-2">
      {children}
    </Text>
  )
}

export default function NaptarSzinkronScreen() {
  const events = useCalendarStore((s) => s.events)
  const permission = useDeviceCalendarStore((s) => s.permission)
  const exportEnabled = useDeviceCalendarStore((s) => s.exportEnabled)
  const importCalendarIds = useDeviceCalendarStore((s) => s.importCalendarIds)
  const lastExportAt = useDeviceCalendarStore((s) => s.lastExportAt)
  const exportError = useDeviceCalendarStore((s) => s.exportError)
  const loadSettings = useDeviceCalendarStore((s) => s.loadSettings)
  const requestPermission = useDeviceCalendarStore((s) => s.requestPermission)
  const setExportEnabled = useDeviceCalendarStore((s) => s.setExportEnabled)
  const toggleImportCalendar = useDeviceCalendarStore((s) => s.toggleImportCalendar)
  const exportNow = useDeviceCalendarStore((s) => s.exportNow)

  const [calendars, setCalendars] = useState<DeviceCalendarInfo[]>([])
  const [syncing, setSyncing] = useState(false)

  const loadCalendars = useCallback(async () => {
    setCalendars(await listImportableCalendars().catch(() => []))
  }, [])

  useEffect(() => {
    void (async () => {
      await loadSettings()
      await loadCalendars()
    })()
  }, [loadSettings, loadCalendars])

  async function handleGrant() {
    const result = await requestPermission()
    if (result === 'granted') {
      await loadCalendars()
      await exportNow(events)
    }
  }

  async function handleSyncNow() {
    setSyncing(true)
    await exportNow(events)
    setSyncing(false)
  }

  const lastSyncText = lastExportAt
    ? `Utolsó szinkron: ${formatHuDate(localDateKey(lastExportAt))} ${eventTimeLabel(lastExportAt)}`
    : 'Még nem volt szinkron.'

  return (
    <SettingsScaffold title="Apple Naptár" backLabel="Naptár">
      {permission !== 'granted' ? (
        <View className="rounded-card bg-card dark:bg-dark-card p-4 gap-3">
          <Text className="text-body-lg font-semibold text-foreground dark:text-dark-foreground">
            Naptár-hozzáférés szükséges
          </Text>
          <Text className="text-body-sm text-muted">
            {permission === 'denied'
              ? 'A hozzáférést korábban elutasítottad. A Beállítások → FamilyHub → Naptárak menüben adhatod meg („Teljes hozzáférés").'
              : 'A szinkronhoz a FamilyHubnak olvasnia és írnia kell a telefon naptárát.'}
          </Text>
          {permission === 'denied' ? (
            <Button variant="primary" size="lg" fullWidth onPress={() => void Linking.openSettings()}>
              Beállítások megnyitása
            </Button>
          ) : (
            <Button variant="primary" size="lg" fullWidth onPress={() => void handleGrant()}>
              Hozzáférés engedélyezése
            </Button>
          )}
        </View>
      ) : (
        <>
          <View>
            <SectionTitle>FamilyHub → Apple Naptár</SectionTitle>
            <View className="rounded-card bg-card dark:bg-dark-card overflow-hidden">
              <ToggleRow
                label="Kiírás a „FamilyHub” naptárba"
                description="A közös családi események és az edzések – a családtagok változásai is. Az Apple Naptárban ezt a naptárat ne szerkeszd: a következő szinkron felülírja."
                value={exportEnabled}
                onValueChange={(v) => void setExportEnabled(v, events)}
                last
              />
            </View>
            {exportEnabled && (
              <View className="mt-3 gap-2">
                <Text className={`text-body-sm px-1 ${exportError ? 'text-destructive' : 'text-muted'}`}>
                  {exportError ? 'Az utolsó szinkron nem sikerült.' : lastSyncText}
                </Text>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  loading={syncing}
                  onPress={() => void handleSyncNow()}
                >
                  Szinkron most
                </Button>
              </View>
            )}
          </View>

          <View>
            <SectionTitle>Apple Naptár → FamilyHub</SectionTitle>
            <Text className="text-body-sm text-muted px-1 mb-3">
              A kiválasztott naptárak eseményei csak ezen a telefonon látszanak a FamilyHubban,
              csak olvashatóan – a családtagokhoz nem kerülnek át.
            </Text>
            {calendars.length === 0 ? (
              <View className="rounded-card bg-card dark:bg-dark-card p-4">
                <Text className="text-body-md text-muted">Nincs beolvasható naptár.</Text>
              </View>
            ) : (
              <View className="rounded-card bg-card dark:bg-dark-card overflow-hidden">
                {calendars.map((cal, i) => (
                  <ToggleRow
                    key={cal.id}
                    label={cal.title}
                    description={cal.sourceName || undefined}
                    dotColor={cal.color}
                    value={importCalendarIds.includes(cal.id)}
                    onValueChange={() => void toggleImportCalendar(cal.id)}
                    last={i === calendars.length - 1}
                  />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </SettingsScaffold>
  )
}
