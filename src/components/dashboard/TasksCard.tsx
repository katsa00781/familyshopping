import { Text, View } from 'react-native'
import { ListTodo } from 'lucide-react-native'

import { DashboardCard } from './DashboardCard'
import { dueLabel, isOverdue, sortByDue } from '@/lib/tasks'
import { colors } from '@/constants/colors'
import type { FamilyMemberLocal, FamilyTask } from '@/types'

interface TasksCardProps {
  tasks: FamilyTask[]
  members: FamilyMemberLocal[]
  onPress: () => void
}

const PREVIEW_COUNT = 3

/**
 * Kezdőlap „Feladatok" kártya: nyitott / lejárt darabszám, alatta a 3 legsürgősebb
 * nyitott feladat (határidő szerint, a határidő nélküliek a végén) tagszínnel.
 */
export function TasksCard({ tasks, members, onPress }: TasksCardProps) {
  const open = sortByDue(tasks.filter((t) => !t.completed_at))
  const overdueCount = open.filter((t) => isOverdue(t)).length

  if (open.length === 0) {
    return (
      <DashboardCard
        icon={ListTodo}
        tint="primary"
        title="Feladatok"
        subtitle="Nincs nyitott feladat"
        accessibilityLabel="Feladatok megnyitása"
        onPress={onPress}
      >
        <Text className="text-muted" style={{ marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Koppints új családi feladat felvételéhez.
        </Text>
      </DashboardCard>
    )
  }

  const subtitle = overdueCount > 0 ? `${open.length} nyitott · ${overdueCount} lejárt` : `${open.length} nyitott`

  return (
    <DashboardCard
      icon={ListTodo}
      tint={overdueCount > 0 ? 'accent' : 'primary'}
      title="Feladatok"
      subtitle={subtitle}
      subtitleTint={overdueCount > 0 ? 'accent' : 'muted'}
      accessibilityLabel={`Feladatok, ${subtitle}`}
      onPress={onPress}
    >
      <View style={{ marginTop: 12, gap: 9 }}>
        {open.slice(0, PREVIEW_COUNT).map((t) => {
          const member = t.assignee_id ? members.find((m) => m.id === t.assignee_id) : undefined
          const overdue = isOverdue(t)
          const due = dueLabel(t)
          return (
            <View key={t.id} className="flex-row items-center" style={{ gap: 10 }}>
              <View
                style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: member?.color ?? colors.muted }}
              />
              <Text
                className="flex-1 text-foreground dark:text-dark-foreground"
                style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}
                numberOfLines={1}
              >
                {t.title}
              </Text>
              {due ? (
                <Text
                  className={overdue ? 'text-accent' : 'text-muted'}
                  style={{ fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}
                >
                  {due}
                </Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </DashboardCard>
  )
}
