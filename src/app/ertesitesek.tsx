import { useEffect } from 'react'
import { Switch, Text, View } from 'react-native'

import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import { colors } from '@/constants/colors'
import {
  useNotificationPrefsStore,
  type NotificationPrefs,
} from '@/store/notificationPrefsStore'

interface ToggleRowProps {
  label: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  last?: boolean
}

function ToggleRow({ label, description, value, onValueChange, last }: ToggleRowProps) {
  return (
    <View
      className={`flex-row items-center px-4 py-3 gap-3 ${
        last ? '' : 'border-b border-border dark:border-dark-border'
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-body-lg text-foreground dark:text-dark-foreground">{label}</Text>
        <Text className="text-body-sm text-muted">{description}</Text>
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

const ITEMS: {
  key: keyof NotificationPrefs
  label: string
  description: string
}[] = [
  {
    key: 'calendarReminders',
    label: 'Naptár emlékeztetők',
    description: 'Értesítés 30 perccel egy közelgő esemény/időpont előtt.',
  },
  {
    key: 'shiftConflictAlerts',
    label: 'Beosztás-ütközés riasztás',
    description: 'Szólunk, ha egy esemény ütközik a műszakoddal.',
  },
  {
    key: 'priceAlerts',
    label: 'Árváltozás riasztások',
    description: 'Szólunk, ha egy figyelt termék ára változik.',
  },
  {
    key: 'shoppingReminders',
    label: 'Bevásárlás emlékeztető',
    description: 'Emlékeztető a befejezetlen aktív listákról.',
  },
]

export default function ErtesitesekScreen() {
  const prefs = useNotificationPrefsStore((s) => s.prefs)
  const setPref = useNotificationPrefsStore((s) => s.setPref)
  const load = useNotificationPrefsStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <SettingsScaffold title="Értesítések">
      <View className="rounded-card bg-card dark:bg-dark-card overflow-hidden">
        {ITEMS.map((item, i) => (
          <ToggleRow
            key={item.key}
            label={item.label}
            description={item.description}
            value={prefs[item.key]}
            onValueChange={(v) => setPref(item.key, v)}
            last={i === ITEMS.length - 1}
          />
        ))}
      </View>
      <Text className="text-body-sm text-muted px-1">
        A naptár emlékeztetők és a beosztás-ütközés riasztás lokális (a készüléken ütemezett)
        értesítések – ehhez a rendszerbeállításokban is engedélyezned kell az értesítéseket. Az
        árváltozás és bevásárlás emlékeztetők egyelőre csak beállítás, ütemezés nélkül.
      </Text>
    </SettingsScaffold>
  )
}
