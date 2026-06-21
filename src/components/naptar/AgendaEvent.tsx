import { Pressable, Text, View } from 'react-native'
import { MapPin } from 'lucide-react-native'

import { eventTimeLabel } from '@/lib/calendar'
import { colors } from '@/constants/colors'
import type { CalendarEvent } from '@/types'

interface AgendaEventProps {
  event: CalendarEvent
  onPress: () => void
}

export function AgendaEvent({ event, onPress }: AgendaEventProps) {
  const barColor = event.color ?? colors.primary

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} szerkesztése`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        className="bg-card dark:bg-dark-card"
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 14,
          borderRadius: 18,
          paddingVertical: 14,
          paddingRight: 16,
          marginBottom: 10,
          overflow: 'hidden',
          shadowColor: '#1C2B2A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View style={{ width: 5, borderTopRightRadius: 99, borderBottomRightRadius: 99, backgroundColor: barColor }} />

        <View style={{ width: 58, justifyContent: 'center', alignItems: 'flex-end' }}>
          {event.all_day ? (
            <Text className="text-muted" style={{ fontSize: 11.5, fontWeight: '800', textAlign: 'right', lineHeight: 14 }}>
              Egész{'\n'}nap
            </Text>
          ) : (
            <Text
              className="text-foreground dark:text-dark-foreground"
              style={{ fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}
            >
              {eventTimeLabel(event.starts_at)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', gap: 3 }}>
          <Text
            className="text-foreground dark:text-dark-foreground"
            style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 }}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {event.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color={colors.muted} strokeWidth={2} />
              <Text className="text-muted" style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}
