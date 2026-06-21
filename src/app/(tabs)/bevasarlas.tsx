import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Plus, ScanLine, ShoppingCart } from 'lucide-react-native'

import { ListSegment, type ListSegmentKey } from '@/components/lista/ListSegment'
import { ListCardActive } from '@/components/lista/ListCardActive'
import { ListCardPast } from '@/components/lista/ListCardPast'
import ListCreateSheet from '@/components/lista/ListCreateSheet'
import { useListStore } from '@/store/listStore'
import { useToastStore } from '@/store/toastStore'
import { colors } from '@/constants/colors'
import type { ShoppingList } from '@/types'

interface SectionLabelProps {
  title: string
  count: number
}

function SectionLabel({ title, count }: SectionLabelProps) {
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
      <View className="bg-surface-sunken dark:bg-dark-border" style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 }}>
        <Text className="text-muted" style={{ fontSize: 13, fontWeight: '800' }}>
          {count}
        </Text>
      </View>
    </View>
  )
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
  const [createVisible, setCreateVisible] = useState(false)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const createList = useListStore((s) => s.createList)
  const deleteList = useListStore((s) => s.deleteList)
  const restoreList = useListStore((s) => s.restoreList)
  const completeList = useListStore((s) => s.completeList)
  const setActiveListId = useListStore((s) => s.setActiveListId)
  const showToast = useToastStore((s) => s.showToast)

  useEffect(() => {
    loadLists()
  }, [loadLists])

  function handleSegment(key: ListSegmentKey) {
    if (key === 'termekek') router.push('/(tabs)/termekek')
    else if (key === 'arak') router.push('/(tabs)/arak')
  }

  function handleBolt(list: ShoppingList) {
    setActiveListId(list.id)
    router.navigate('/(tabs)/bolt')
  }

  function handleActiveMenu(list: ShoppingList) {
    Alert.alert(list.name, undefined, [
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

  const activeLists = lists.filter((l) => !l.completed)
  const pastLists = lists.filter((l) => l.completed)
  const isEmpty = lists.length === 0

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
              <ScanLine size={20} color={colors.foreground} strokeWidth={2} />
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
                <SectionLabel title="Korábbi listák" count={pastLists.length} />
                {pastLists.map((list) => (
                  <ListCardPast
                    key={list.id}
                    list={list}
                    onPress={() => router.push(`/lista/${list.id}`)}
                    onMenu={() => handlePastMenu(list)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB – új lista */}
      <Pressable
        onPress={() => setCreateVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Új lista létrehozása"
        style={({ pressed }) => ({
          position: 'absolute',
          right: 22,
          bottom: 24,
          width: 60,
          height: 60,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.42,
          shadowRadius: 22,
          elevation: 8,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>

      <ListCreateSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(name, date) => createList(name, date)}
      />
    </SafeAreaView>
  )
}
