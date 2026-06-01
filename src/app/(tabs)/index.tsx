import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronRight, MoreHorizontal, Plus, Receipt, ScanLine, ShoppingBag, ShoppingCart } from 'lucide-react-native'

import { ListCard } from '@/components/lista/ListCard'
import ListCreateSheet from '@/components/lista/ListCreateSheet'
import { useListStore } from '@/store/listStore'
import { useToastStore } from '@/store/toastStore'
import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import type { ShoppingList } from '@/types'

function formatPastDate(dateStr: string): string {
  const date = new Date(dateStr)
  const str = date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="px-screen-x pt-2 pb-1" style={{ minHeight: 44, justifyContent: 'flex-end' }}>
      <Text className="text-body-sm font-semibold text-muted uppercase" style={{ letterSpacing: 0.5 }}>
        {title}
      </Text>
    </View>
  )
}

interface PastListRowProps {
  list: ShoppingList
  onOpen: () => void
  onRestore: () => void
  onDelete: () => void
}

function PastListRow({ list, onOpen, onRestore, onDelete }: PastListRowProps) {
  function handleMenu() {
    Alert.alert(list.name, formatPastDate(list.date), [
      { text: 'Újraaktiválás', onPress: onRestore },
      { text: 'Törlés', style: 'destructive', onPress: onDelete },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      onPress={onOpen}
      accessibilityLabel={`${list.name}, ${formatPastDate(list.date)}, ${formatHuf(list.total_amount)}`}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          className="text-body-md text-foreground dark:text-dark-foreground font-medium"
          numberOfLines={1}
        >
          {list.name}
        </Text>
        <Text className="text-body-sm text-muted">
          {formatPastDate(list.date)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
          {formatHuf(list.total_amount)}
        </Text>
        <Pressable
          onPress={handleMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          accessibilityLabel="Műveletek"
        >
          <MoreHorizontal size={18} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
      </View>
    </Pressable>
  )
}

function PurchasesEntryRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      className="mx-screen-x mt-3 flex-row items-center gap-3 rounded-card border border-border dark:border-dark-border bg-card dark:bg-dark-card px-4 py-3.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      onPress={onPress}
      accessibilityLabel="Vásárlások megtekintése"
      accessibilityRole="button"
    >
      <View
        className="items-center justify-center rounded-full bg-primary/10"
        style={{ width: 36, height: 36 }}
      >
        <Receipt size={20} color={colors.primary} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
          Vásárlások
        </Text>
        <Text className="text-body-sm text-muted">Beolvasott blokkok és befejezett listák</Text>
      </View>
      <ChevronRight size={20} color={colors.muted} strokeWidth={1.75} />
    </Pressable>
  )
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-screen-x py-16 gap-3">
      <View
        className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
        style={{ width: 72, height: 72 }}
      >
        <ShoppingCart size={32} color={colors.muted} />
      </View>
      <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground text-center">
        Még nincs listád
      </Text>
      <Text className="text-body-md text-muted text-center">
        Hozz létre egyet a + gombbal
      </Text>
    </View>
  )
}

function BoltModeButton({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#60A5FA',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel="Bolt mód megnyitása"
        accessibilityRole="button"
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <ShoppingBag size={24} color="#ffffff" strokeWidth={1.75} />
      </Pressable>
    </Animated.View>
  )
}

export default function ListsScreen() {
  const router = useRouter()
  const [createVisible, setCreateVisible] = useState(false)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const createList = useListStore((s) => s.createList)
  const deleteList = useListStore((s) => s.deleteList)
  const restoreList = useListStore((s) => s.restoreList)
  const showToast = useToastStore((s) => s.showToast)

  useEffect(() => { loadLists() }, [loadLists])

  async function handleRestore(list: ShoppingList) {
    await restoreList(list.id)
    showToast(`„${list.name}" újra aktív`, 'success')
  }

  const activeLists = lists.filter((l) => !l.completed)
  const pastLists = lists.filter((l) => l.completed)
  const isEmpty = lists.length === 0

  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-dark-background"
      edges={['top']}
    >
      <View
        className="px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <View className="flex-row items-end justify-between">
          <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
            Bevásárló listák
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              onPress={() => router.push('/ocr')}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Blokk beolvasása"
              accessibilityRole="button"
            >
              <ScanLine size={24} color={colors.muted} strokeWidth={1.75} />
            </Pressable>
            <Pressable
              onPress={() => setCreateVisible(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Új lista létrehozása"
              accessibilityRole="button"
            >
              <Plus size={28} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      <PurchasesEntryRow onPress={() => router.push('/vasarlasok')} />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 104 }}
        >
          {activeLists.length > 0 && (
            <>
              <SectionHeader title="Aktív listák" />
              <View className="pt-2">
                {activeLists.map((list) => (
                  <ListCard key={list.id} list={list} onPress={() => router.push(`/lista/${list.id}`)} />
                ))}
              </View>
            </>
          )}

          {pastLists.length > 0 && (
            <>
              <SectionHeader title="Korábbi listák" />
              <View className="mx-screen-x mt-2 rounded-card overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
                {pastLists.map((list, idx) => (
                  <View key={list.id}>
                    {idx > 0 && <View className="h-px bg-border dark:bg-dark-border mx-4" />}
                    <PastListRow
                      list={list}
                      onOpen={() => router.push(`/lista/${list.id}`)}
                      onRestore={() => handleRestore(list)}
                      onDelete={() =>
                        Alert.alert(
                          'Lista törlése',
                          `Biztosan törlöd a(z) „${list.name}" listát?`,
                          [
                            { text: 'Törlés', style: 'destructive', onPress: () => deleteList(list.id) },
                            { text: 'Mégse', style: 'cancel' },
                          ]
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <BoltModeButton onPress={() => router.navigate('/(tabs)/bolt')} />

      <ListCreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(name, date) => createList(name, date)}
      />
    </SafeAreaView>
  )
}
