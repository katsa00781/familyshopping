import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, ChevronUp, ListTodo } from 'lucide-react-native'

import { Fab } from '@/components/ui/Fab'
import { ListSegment, useSegmentNav } from '@/components/lista/ListSegment'
import { TaskRow } from '@/components/feladatok/TaskRow'
import { TaskSheet, type TaskSheetInput } from '@/components/feladatok/TaskSheet'
import { useTaskStore, type TaskPhotoChange } from '@/store/taskStore'
import { useMemberStore } from '@/store/memberStore'
import { filterByAssignee, groupTasks, type TaskAssigneeFilter } from '@/lib/tasks'
import { colors } from '@/constants/colors'
import type { FamilyTask } from '@/types'

interface SectionLabelProps {
  title: string
  count: number
  tone?: 'default' | 'accent'
}

function SectionLabel({ title, count, tone = 'default' }: SectionLabelProps) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingTop: 10, paddingBottom: 2, paddingHorizontal: 4 }}>
      <Text
        className={tone === 'accent' ? 'text-accent' : 'text-foreground dark:text-dark-foreground'}
        style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}
      >
        {title}
      </Text>
      <View
        className={tone === 'accent' ? 'bg-accent/15' : 'bg-surface-sunken dark:bg-dark-border'}
        style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 }}
      >
        <Text className={tone === 'accent' ? 'text-accent' : 'text-muted'} style={{ fontSize: 13, fontWeight: '800' }}>
          {count}
        </Text>
      </View>
    </View>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View className="items-center justify-center" style={{ paddingVertical: 64, gap: 12 }}>
      <View className="items-center justify-center bg-surface-sunken dark:bg-dark-border" style={{ width: 72, height: 72, borderRadius: 99 }}>
        <ListTodo size={32} color={colors.muted} strokeWidth={1.75} />
      </View>
      <Text className="text-foreground dark:text-dark-foreground text-center" style={{ fontSize: 18, fontWeight: '800' }}>
        {filtered ? 'Nincs feladat ennél a tagnál' : 'Még nincs feladat'}
      </Text>
      <Text className="text-muted text-center" style={{ fontSize: 14, fontWeight: '600' }}>
        Vegyél fel egyet a + gombbal
      </Text>
    </View>
  )
}

interface FilterPillProps {
  label: string
  color: string | null
  active: boolean
  onPress: () => void
}

function FilterPill({ label, color, active, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Szűrés: ${label}`}
      hitSlop={{ top: 3, bottom: 3 }}
    >
      <View
        className={active ? 'bg-card dark:bg-dark-card' : 'bg-surface-sunken dark:bg-dark-border'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 38,
          paddingHorizontal: 14,
          borderRadius: 99,
          borderWidth: 1.5,
          borderColor: active ? (color ?? colors.primary) : 'transparent',
        }}
      >
        {color ? <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: color }} /> : null}
        <Text
          className={active && !color ? 'text-primary' : active ? '' : 'text-muted'}
          style={{ fontSize: 13.5, fontWeight: '800', ...(active && color ? { color } : {}) }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

export default function FeladatokScreen() {
  const handleSegment = useSegmentNav('feladatok')

  const tasks = useTaskStore((s) => s.tasks)
  const pendingPhotos = useTaskStore((s) => s.pendingPhotos)
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const members = useMemberStore((s) => s.members)
  const loadMembers = useMemberStore((s) => s.loadMembers)

  const [filter, setFilter] = useState<TaskAssigneeFilter>('all')
  const [doneOpen, setDoneOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyTask | null>(null)

  useEffect(() => {
    void loadTasks()
    void loadMembers()
  }, [loadTasks, loadMembers])

  const groups = groupTasks(filterByAssignee(tasks, filter))
  const openCount = groups.overdue.length + groups.upcoming.length + groups.noDue.length
  const isEmpty = openCount === 0 && groups.done.length === 0

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(task: FamilyTask) {
    setEditing(task)
    setSheetOpen(true)
  }

  function handleSave(input: TaskSheetInput, photo: TaskPhotoChange, id: string | null) {
    if (id) void updateTask(id, input, photo)
    else void createTask(input, photo ?? null)
  }

  function confirmDelete(task: FamilyTask) {
    Alert.alert('Feladat törlése', `Biztosan törlöd: „${task.title}"?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => void deleteTask(task.id) },
    ])
  }

  function renderRows(list: FamilyTask[]) {
    return list.map((task) => (
      <TaskRow
        key={task.id}
        task={task}
        assignee={members.find((m) => m.id === task.assignee_id) ?? null}
        pendingPhotoUri={pendingPhotos[task.id] ?? null}
        onToggle={() => void toggleTask(task.id)}
        onPress={() => openEdit(task)}
        onDelete={() => confirmDelete(task)}
      />
    ))
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {/* Fejléc: cím + szegmens */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }}>
        <View style={{ paddingHorizontal: 2, paddingTop: 4, minHeight: 42, justifyContent: 'center' }}>
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.6 }}>
            Bevásárlás
          </Text>
        </View>
        <ListSegment active="feladatok" onSelect={handleSegment} />
      </View>

      {/* Tag-szűrő – tördelt sor, minden tag egyszerre látszik (nincs oldalra görgetés) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingVertical: 6, gap: 8 }}>
        <FilterPill label="Mind" color={null} active={filter === 'all'} onPress={() => setFilter('all')} />
        {members.map((m) => (
          <FilterPill key={m.id} label={m.name} color={m.color} active={filter === m.id} onPress={() => setFilter(m.id)} />
        ))}
        <FilterPill label="Közös" color={colors.muted} active={filter === null} onPress={() => setFilter(null)} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 124, gap: 10 }}
      >
        {isEmpty ? (
          <EmptyState filtered={filter !== 'all'} />
        ) : (
          <>
            {groups.overdue.length > 0 && (
              <>
                <SectionLabel title="Lejárt" count={groups.overdue.length} tone="accent" />
                {renderRows(groups.overdue)}
              </>
            )}

            {groups.upcoming.length > 0 && (
              <>
                <SectionLabel title="Hamarosan" count={groups.upcoming.length} />
                {renderRows(groups.upcoming)}
              </>
            )}

            {groups.noDue.length > 0 && (
              <>
                <SectionLabel title="Határidő nélkül" count={groups.noDue.length} />
                {renderRows(groups.noDue)}
              </>
            )}

            {groups.done.length > 0 && (
              <>
                <Pressable
                  onPress={() => setDoneOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: doneOpen }}
                  accessibilityLabel={doneOpen ? 'Kész feladatok elrejtése' : 'Kész feladatok mutatása'}
                  className="flex-row items-center justify-between"
                  style={{ paddingTop: 10, paddingBottom: 2, paddingHorizontal: 4, minHeight: 44 }}
                >
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-muted" style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>
                      Kész
                    </Text>
                    {doneOpen ? (
                      <ChevronUp size={17} color={colors.muted} strokeWidth={2} />
                    ) : (
                      <ChevronDown size={17} color={colors.muted} strokeWidth={2} />
                    )}
                  </View>
                  <View className="bg-surface-sunken dark:bg-dark-border" style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 }}>
                    <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>
                      {groups.done.length}
                    </Text>
                  </View>
                </Pressable>
                {doneOpen ? renderRows(groups.done) : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB – új feladat */}
      <Fab onPress={openNew} accessibilityLabel="Új feladat" />

      <TaskSheet
        visible={sheetOpen}
        task={editing}
        pendingPhotoUri={editing ? (pendingPhotos[editing.id] ?? null) : null}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onDelete={(id) => void deleteTask(id)}
      />
    </SafeAreaView>
  )
}
