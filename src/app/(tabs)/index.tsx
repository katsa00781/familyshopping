import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Settings } from 'lucide-react-native'

import { TodayCard, type TodayEvent } from '@/components/dashboard/TodayCard'
import { ActiveListCard } from '@/components/dashboard/ActiveListCard'
import { BudgetCard } from '@/components/dashboard/BudgetCard'
import ListCreateSheet from '@/components/lista/ListCreateSheet'
import { useAuthStore } from '@/store/authStore'
import { useFamilyStore } from '@/store/familyStore'
import { useListStore } from '@/store/listStore'
import { useBudgetStore } from '@/store/budgetStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useMemberStore } from '@/store/memberStore'
import { summarizeBudget } from '@/lib/budget'
import { dayKey, eventDayKey, eventTimeLabel, expandEvents } from '@/lib/calendar'
import { colors, memberColorAt } from '@/constants/colors'

interface DisplayMember {
  id: string
  name: string
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

function todayLabel(): string {
  const str = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function KezdolapScreen() {
  const router = useRouter()
  const [createVisible, setCreateVisible] = useState(false)

  const user = useAuthStore((s) => s.user)
  const family = useFamilyStore((s) => s.family)
  const loadFamily = useFamilyStore((s) => s.loadFamily)

  const lists = useListStore((s) => s.lists)
  const activeListId = useListStore((s) => s.activeListId)
  const loadLists = useListStore((s) => s.loadLists)
  const createList = useListStore((s) => s.createList)

  const loadBudget = useBudgetStore((s) => s.loadBudget)
  const budgetPlan = useBudgetStore((s) => s.plan)
  const budgetSpending = useBudgetStore((s) => s.spending)
  const budgetSummary = budgetPlan ? summarizeBudget(budgetPlan, budgetSpending) : null

  const events = useCalendarStore((s) => s.events)
  const loadEvents = useCalendarStore((s) => s.loadEvents)

  const familyMembers = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  useEffect(() => {
    loadFamily()
    loadLists()
    loadBudget()
    loadEvents()
    void loadMembers()
  }, [loadFamily, loadLists, loadBudget, loadEvents, loadMembers])

  // Mai naptáresemények a „Ma" kártyához (ismétlődő is kibontva, egész napos elöl).
  const now = new Date()
  const todayKey = dayKey(now)
  const todayEvents: TodayEvent[] = expandEvents(events, now, now)
    .filter((e) => eventDayKey(e) === todayKey)
    .sort((a, b) => {
      if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
      return a.starts_at.localeCompare(b.starts_at)
    })
    .map((e) => ({
      id: e.id,
      time: e.all_day ? '—' : eventTimeLabel(e.starts_at),
      title: e.title,
      who: e.member_id ? familyMembers.find((m) => m.id === e.member_id)?.name ?? '' : '',
      color: e.color ?? colors.primary,
    }))

  const name = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'Felhasználó'
  const firstName = name.trim().split(/\s+/)[0] ?? name

  // v1 single-user: ha nincs betöltött család, a bejelentkezett felhasználót mutatjuk.
  const members: DisplayMember[] =
    family && family.members.length > 0
      ? family.members.map((m) => ({ id: m.id, name: m.name }))
      : [{ id: user?.id ?? 'me', name }]

  // Aktív lista: az explicit kiválasztott, vagy a legutóbbi befejezetlen.
  const activeLists = lists.filter((l) => !l.completed)
  const activeList = activeLists.find((l) => l.id === activeListId) ?? activeLists[0] ?? null

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 18 }}
      >
        {/* Fejléc: köszöntés + dátum, jobbra tag-avatarok + beállítások */}
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 10 }}
        >
          <View style={{ flex: 1 }}>
            <Text
              className="text-foreground dark:text-dark-foreground"
              style={{ fontSize: 27, fontWeight: '800', letterSpacing: -0.4, lineHeight: 30 }}
              numberOfLines={1}
            >
              Szia, {firstName}!
            </Text>
            <Text className="text-muted" style={{ marginTop: 4, fontSize: 14, fontWeight: '600' }}>
              {todayLabel()}
            </Text>
          </View>

          <View className="flex-row items-center">
            {members.map((m, idx) => (
              <View
                key={m.id}
                className="items-center justify-center rounded-full border-card dark:border-dark-card"
                style={{
                  width: 40,
                  height: 40,
                  borderWidth: 2.5,
                  backgroundColor: memberColorAt(idx),
                  marginLeft: idx === 0 ? 0 : -8,
                }}
              >
                <Text className="text-white" style={{ fontSize: 15, fontWeight: '800' }}>
                  {initial(m.name)}
                </Text>
              </View>
            ))}
            <Pressable
              onPress={() => router.push('/(tabs)/profil')}
              accessibilityLabel="Család és beállítások"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{ marginLeft: -8 }}
                className="items-center justify-center rounded-full bg-card dark:bg-dark-card border-2 border-border dark:border-dark-border"
              >
                <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} color={colors.foreground} strokeWidth={1.75} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        <TodayCard events={todayEvents} onPress={() => router.navigate('/(tabs)/naptar')} />

        <ActiveListCard
          list={activeList}
          onOpen={() => activeList && router.push(`/lista/${activeList.id}`)}
          onOpenBolt={() => router.navigate('/(tabs)/bolt')}
          onCreate={() => setCreateVisible(true)}
        />

        <BudgetCard summary={budgetSummary} onPress={() => router.navigate('/(tabs)/kassza')} />
      </ScrollView>

      <ListCreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(listName, date) => createList(listName, date)}
      />
    </SafeAreaView>
  )
}
