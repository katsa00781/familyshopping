import { Text, View } from 'react-native'
import { Calendar } from 'lucide-react-native'

import { DashboardCard } from './DashboardCard'

/** A „Ma" kártya egy eseménysora (v1: a Naptár-funkció tölti fel). */
export interface TodayEvent {
  id: string
  time: string // "07:45"
  title: string
  who: string
  color: string // tagszín
}

interface TodayCardProps {
  events?: TodayEvent[]
  onPress: () => void
}

function weekday(): string {
  return new Date().toLocaleDateString('hu-HU', { weekday: 'long' })
}

/**
 * „Ma" kártya – a mai naptáresemények belépője (korall kiemelés).
 * v1: az események a Naptár-funkció (6. feladat) után élesednek; addig
 * a kártya az üres állapotot mutatja a végleges layouttal.
 */
export function TodayCard({ events = [], onPress }: TodayCardProps) {
  const subtitle = events.length
    ? `${events.length} esemény · ${weekday()}`
    : `Nincs esemény · ${weekday()}`

  return (
    <DashboardCard
      icon={Calendar}
      tint="accent"
      accentShadow
      title="Ma"
      subtitle={subtitle}
      subtitleTint="accent"
      accessibilityLabel="Naptár megnyitása"
      onPress={onPress}
    >
      {events.length ? (
        <View style={{ marginTop: 14 }}>
          {events.map((ev, idx) => (
            <View
              key={ev.id}
              className={idx > 0 ? 'border-t border-border dark:border-dark-border' : ''}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 9 }}
            >
              <View
                style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: ev.color }}
              />
              <Text
                className="text-foreground dark:text-dark-foreground"
                style={{ width: 46, fontSize: 14.5, fontWeight: '800', fontVariant: ['tabular-nums'] }}
              >
                {ev.time}
              </Text>
              <Text
                className="flex-1 text-foreground dark:text-dark-foreground"
                style={{ fontSize: 15, fontWeight: '600' }}
                numberOfLines={1}
              >
                {ev.title}
              </Text>
              <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700' }}>
                {ev.who}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-muted" style={{ marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Nincs mai esemény
        </Text>
      )}
    </DashboardCard>
  )
}
