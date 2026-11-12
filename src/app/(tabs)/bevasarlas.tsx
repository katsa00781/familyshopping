import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { ScanLine, ShoppingCart, Trash2 } from 'lucide-react-native'

import { Fab } from '@/components/ui/Fab'
import { ListSegment, useSegmentNav } from '@/components/lista/ListSegment'
import { ListCardActive } from '@/components/lista/ListCardActive'
import { ListCardPast } from '@/components/lista/ListCardPast'
import ListCreateSheet from '@/components/lista/ListCreateSheet'
import { useListStore } from '@/store/listStore'
import { useToastStore } from '@/store/toastStore'
import { colors } from '@/constants/colors'
import { haptics } from '@/lib/haptics'
import type { ShoppingList } from '@/types'

interface SectionLabelProps {
  title: string
  count: number
  /** Opcionális szöveges akció a számláló előtt (pl. „Kijelölés"). */
  action?: { label: string; accessibilityLabel: string; onPress: () => void }
}

function SectionLabel({ title, count, action }: SectionLabelProps) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ paddingTop: 10, paddingBottom: 2, paddingHorizontal: 4 }}
    >
      <Text
        className="text-foreground dark:text-dark-foreground"
        style={{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}
      >
        {title}
      </Text>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {action ? (
          <Pressable
            onPress={action.onPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-primary" style={{ fontSize: 14, fontWeight: '800' }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
        <View className="bg-surface-sunken dark:bg-dark-border" style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 }}>
          <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>
            {count}
          </Text>
        </View>
      </View>
    </View>
  )
}

/** Rendezési kulcs: befejezett listánál a befejezés, különben a létrehozás ideje. */
function sortTime(list: ShoppingList): number {
  return new Date(list.completed_at ?? list.created_at).getTime()
}

function EmptyState() {
  return (
    <View className="items-center justify-center" style={{ paddingVertical: 64, gap: 12 }}>
      <View
        className="items-center justify-center bg-surface-sunken dark:bg-dark-border"
        style={{ width: 72, height: 72, borderRadius: 99 }}
      >
        <ShoppingCart size={32} color={colors.muted} strokeWidth={1.75} />
      </View>
      <Text
        className="text-foreground dark:text-dark-foreground text-center"
        style={{ fontSize: 18, fontWeight: '800' }}
      >
        Még nincs listád
      </Text>
      <Text className="text-muted text-center" style={{ fontSize: 14, fontWeight: '600' }}>
        Hozz létre egyet a + gombbal
      </Text>
    </View>
  )
}

export default function BevasarlasScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const [createVisible, setCreateVisible] = useState(false)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const createList = useListStore((s) => s.createList)
  const deleteList = useListStore((s) => s.deleteList)
  const deleteLists = useListStore((s) => s.deleteLists)
  const setAllChecked = useListStore((s) => s.setAllChecked)
  const clearItems = useListStore((s) => s.clearItems)
  const restoreList = useListStore((s) => s.restoreList)
  const completeList = useListStore((s) => s.completeList)
  const setActiveListId = useListStore((s) => s.setActiveListId)
  const showToast = useToastStore((s) => s.showToast)
  const handleSegment = useSegmentNav('listak')

  // Korábbi listák kijelöléses törlése
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadLists()
  }, [loadLists])

  // Aktív listák: legújabb elöl. Korábbi listák: legutóbb befejezett elöl.
  const activeLists = useMemo(
    () => lists.filter((l) => !l.completed).sort((a, b) => sortTime(b) - sortTime(a)),
    [lists],
  )
  const pastLists = useMemo(
    () => lists.filter((l) => l.completed).sort((a, b) => sortTime(b) - sortTime(a)),
    [lists],
  )
  const isEmpty = lists.length === 0

  // Ha közben elfogytak a korábbi listák, a kijelölő mód magától megszűnik.
  const inSelection = selecting && pastLists.length > 0
  // Csak a még létező korábbi listák számítanak (pl. közben máshol törölt lista nem).
  const selectedCount = pastLists.filter((l) => selectedIds.has(l.id)).length

  function exitSelection() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  function startSelection(firstId?: string) {
    haptics.selection()
    setSelecting(true)
    setSelectedIds(firstId ? new Set([firstId]) : new Set())
  }

  function toggleSelected(id: string) {
    haptics.selection()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allPastSelected = pastLists.length > 0 && selectedCount === pastLists.length

  function toggleSelectAll() {
    haptics.selection()
    setSelectedIds(allPastSelected ? new Set() : new Set(pastLists.map((l) => l.id)))
  }

  function handleDeleteSelected() {
    const ids = pastLists.filter((l) => selectedIds.has(l.id)).map((l) => l.id)
    if (ids.length === 0) return
    Alert.alert('Listák törlése', `Biztosan törlöd a kijelölt ${ids.length} listát?`, [
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          exitSelection()
          await deleteLists(ids)
          showToast(`${ids.length} lista törölve`, 'success')
        },
      },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  function handleBolt(list: ShoppingList) {
    setActiveListId(list.id)
    router.navigate('/(tabs)/bolt')
  }

  function handleActiveMenu(list: ShoppingList) {
    const itemCount = list.items.length
    const allChecked = itemCount > 0 && list.items.every((i) => i.checked)
    Alert.alert(list.name, undefined, [
      ...(itemCount > 0
        ? [
            {
              text: allChecked ? 'Kijelölés megszüntetése' : 'Összes kijelölése',
              onPress: () => void setAllChecked(list.id, !allChecked),
            },
            {
              text: 'Lista ürítése',
              style: 'destructive' as const,
              onPress: () =>
                Alert.alert('Lista ürítése', `Biztosan törlöd mind a(z) ${itemCount} tételt a(z) „${list.name}" listáról?`, [
                  { text: 'Ürítés', style: 'destructive', onPress: () => void clearItems(list.id) },
                  { text: 'Mégse', style: 'cancel' },
                ]),
            },
          ]
        : []),
      { text: 'Befejezettnek jelöl', onPress: () => completeList(list.id) },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Lista törlése', `Biztosan törlöd a(z) „${list.name}" listát?`, [
            { text: 'Törlés', style: 'destructive', onPress: () => deleteList(list.id) },
            { text: 'Mégse', style: 'cancel' },
          ]),
      },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  function handlePastMenu(list: ShoppingList) {
    Alert.alert(list.name, undefined, [
      {
        text: 'Újraaktiválás',
        onPress: async () => {
          await restoreList(list.id)
          showToast(`„${list.name}" újra aktív`, 'success')
        },
      },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Lista törlése', `Biztosan törlöd a(z) „${list.name}" listát?`, [
            { text: 'Törlés', style: 'destructive', onPress: () => deleteList(list.id) },
            { text: 'Mégse', style: 'cancel' },
          ]),
      },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {/* Fejléc: cím + OCR-szkenner + szegmens */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
        <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 2, paddingTop: 4 }}>
          <Text
            className="text-foreground dark:text-dark-foreground"
            style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.6 }}
          >
            Bevásárlás
          </Text>
          <Pressable
            onPress={() => router.push('/ocr')}
            accessibilityRole="button"
            accessibilityLabel="Blokk beolvasása"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className="items-center justify-center bg-card dark:bg-dark-card border-2 border-border dark:border-dark-border"
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <ScanLine size={20} color={dark ? colors.darkForeground : colors.foreground} strokeWidth={2} />
            </View>
          </Pressable>
        </View>
        <ListSegment active="listak" onSelect={handleSegment} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 124, gap: 12 }}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {activeLists.length > 0 && (
              <>
                <SectionLabel title="Aktív listák" count={activeLists.length} />
                {activeLists.map((list, idx) => (
                  <ListCardActive
                    key={list.id}
                    list={list}
                    index={idx}
                    onPress={() => router.push(`/lista/${list.id}`)}
                    onBolt={() => handleBolt(list)}
                    onMenu={() => handleActiveMenu(list)}
                  />
                ))}
              </>
            )}

            {pastLists.length > 0 && (
              <>
                <SectionLabel
                  title="Korábbi listák"
                  count={pastLists.length}
                  action={
                    inSelection
                      ? {
                          label: allPastSelected ? 'Egyik sem' : 'Mind',
                          accessibilityLabel: allPastSelected
                            ? 'Kijelölés megszüntetése'
                            : 'Összes korábbi lista kijelölése',
                          onPress: toggleSelectAll,
                        }
                      : {
                          label: 'Kijelölés',
                          accessibilityLabel: 'Korábbi listák kijelölése törléshez',
                          onPress: () => startSelection(),
                        }
                  }
                />
                {pastLists.map((list) => (
                  <ListCardPast
                    key={list.id}
                    list={list}
                    selectable={inSelection}
                    selected={selectedIds.has(list.id)}
                    onPress={() =>
                      inSelection ? toggleSelected(list.id) : router.push(`/lista/${list.id}`)
                    }
                    onLongPress={inSelection ? undefined : () => startSelection(list.id)}
                    onMenu={() => handlePastMenu(list)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {inSelection ? (
        /* Kijelölő mód: törlés-sáv a FAB helyén */
        <View
          className="flex-row bg-background dark:bg-dark-background"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 10 }}
        >
          <Pressable
            onPress={exitSelection}
            accessibilityRole="button"
            accessibilityLabel="Kijelölés befejezése"
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
          >
            <View
              className="items-center justify-center bg-card dark:bg-dark-card border-2 border-border dark:border-dark-border"
              style={{ height: 56, borderRadius: 18 }}
            >
              <Text className="text-foreground dark:text-dark-foreground" style={{ fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>
                Mégse
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={handleDeleteSelected}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={`Kijelölt listák törlése (${selectedCount})`}
            accessibilityState={{ disabled: selectedCount === 0 }}
            style={({ pressed }) => ({ flex: 2, opacity: selectedCount === 0 ? 0.5 : pressed ? 0.85 : 1 })}
          >
            <View
              className="flex-row items-center justify-center bg-destructive"
              style={{ height: 56, borderRadius: 18, gap: 8 }}
            >
              <Trash2 size={19} color={colors.primaryForeground} strokeWidth={2} />
              <Text className="text-primary-foreground" style={{ fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>
                {selectedCount > 0 ? `Törlés (${selectedCount})` : 'Törlés'}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : (
        /* FAB – új lista */
        <Fab onPress={() => setCreateVisible(true)} accessibilityLabel="Új lista létrehozása" />
      )}

      <ListCreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(name, date) => createList(name, date)}
      />
    </SafeAreaView>
  )
}
