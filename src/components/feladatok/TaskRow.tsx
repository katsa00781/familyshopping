import { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { CalendarClock, Repeat, Trash2, Users } from 'lucide-react-native'

import { Checkbox } from '@/components/ui/Checkbox'
import { TaskPhoto } from './TaskPhoto'
import { dueLabel, isOverdue } from '@/lib/tasks'
import { recurrenceLabel } from '@/lib/calendar'
import { colors } from '@/constants/colors'
import type { FamilyMemberLocal, FamilyTask } from '@/types'

interface TaskRowProps {
  task: FamilyTask
  assignee: FamilyMemberLocal | null
  /** Feltöltés alatt álló helyi fotó. */
  pendingPhotoUri: string | null
  onToggle: () => void
  onPress: () => void
  onDelete: () => void
}

const cardShadow = {
  shadowColor: colors.foreground,
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
}

/**
 * Feladat-sor: kör checkbox, cím, határidő-chip (lejártnál korall) + felelős
 * tagszínnel, jobbra fotó-bélyegkép. Koppintás → szerkesztés, balra húzás → törlés.
 * Kipipáláskor a sor helyben halványodik (spring).
 */
export function TaskRow({ task, assignee, pendingPhotoUri, onToggle, onPress, onDelete }: TaskRowProps) {
  const swipeRef = useRef<SwipeableMethods>(null)
  const done = task.completed_at !== null
  const overdue = isOverdue(task)
  const due = dueLabel(task)
  const repeat = recurrenceLabel(task.rrule)
  const hasPhoto = task.photo_path !== null || pendingPhotoUri !== null

  const dim = useSharedValue(done ? 0.55 : 1)
  useEffect(() => {
    dim.value = withSpring(done ? 0.55 : 1, { damping: 18, stiffness: 180 })
  }, [done, dim])
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }))

  function renderRightActions() {
    return (
      <Pressable
        className="bg-destructive items-center justify-center rounded-3xl"
        style={{ width: 84, marginLeft: 10 }}
        onPress={() => {
          swipeRef.current?.close()
          onDelete()
        }}
        accessibilityRole="button"
        accessibilityLabel={`${task.title} törlése`}
      >
        <Trash2 size={22} color={colors.primaryForeground} strokeWidth={1.75} />
        <Text className="text-white" style={{ fontSize: 12.5, fontWeight: '700', marginTop: 4 }}>
          Törlés
        </Text>
      </Pressable>
    )
  }

  return (
    <ReanimatedSwipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <Animated.View style={dimStyle}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${task.title} szerkesztése`}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View
            className="flex-row items-center bg-card dark:bg-dark-card dark:border dark:border-dark-border rounded-3xl"
            style={[cardShadow, { paddingVertical: 14, paddingLeft: 16, paddingRight: 14, gap: 12, minHeight: 72 }]}
          >
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
              <Checkbox
                checked={done}
                onChange={onToggle}
                accessibilityLabel={done ? `${task.title} visszaállítása nyitottra` : `${task.title} késznek jelölése`}
              />
            </View>

            <View style={{ flex: 1, gap: 5 }}>
              <Text
                className="text-foreground dark:text-dark-foreground"
                style={{
                  fontSize: 16.5,
                  fontWeight: '700',
                  letterSpacing: -0.2,
                  textDecorationLine: done ? 'line-through' : 'none',
                }}
                numberOfLines={2}
              >
                {task.title}
              </Text>

              <View className="flex-row items-center flex-wrap" style={{ gap: 10 }}>
                {assignee ? (
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: assignee.color }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: assignee.color }} numberOfLines={1}>
                      {assignee.name}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <Users size={13} color={colors.muted} strokeWidth={1.75} />
                    <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700' }}>
                      Közös
                    </Text>
                  </View>
                )}

                {due ? (
                  <View
                    className={`flex-row items-center ${overdue ? 'bg-accent/15' : 'bg-surface-sunken dark:bg-dark-border'}`}
                    style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}
                  >
                    <CalendarClock size={12.5} color={overdue ? colors.accent : colors.muted} strokeWidth={1.75} />
                    <Text
                      className={overdue ? 'text-accent' : 'text-muted'}
                      style={{ fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] }}
                    >
                      {due}
                    </Text>
                  </View>
                ) : null}

                {repeat ? (
                  <View className="flex-row items-center" style={{ gap: 4 }} accessibilityLabel={`Ismétlődik ${repeat}`}>
                    <Repeat size={12.5} color={colors.primary} strokeWidth={1.75} />
                    <Text className="text-primary" style={{ fontSize: 12.5, fontWeight: '800' }}>
                      {repeat}
                    </Text>
                  </View>
                ) : null}
              </View>

              {task.notes ? (
                <Text className="text-muted" style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {task.notes}
                </Text>
              ) : null}
            </View>

            {hasPhoto ? <TaskPhoto path={task.photo_path} localUri={pendingPhotoUri} size={48} radius={13} /> : null}
          </View>
        </Pressable>
      </Animated.View>
    </ReanimatedSwipeable>
  )
}
