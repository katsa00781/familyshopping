import { useRef } from 'react'
import {
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, ShoppingCart } from 'lucide-react-native'

import { ListCard } from '@/components/lista/ListCard'
import { mockLists } from '@/data/mockLists'
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

function PastListRow({ list }: { list: ShoppingList }) {
  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text className="text-body-md text-foreground dark:text-dark-foreground font-medium">
        {formatPastDate(list.date)}
      </Text>
      <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
        {formatHuf(list.total_amount)}
      </Text>
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
        <ShoppingCart size={32} color="#94A3B8" />
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

export default function ListsScreen() {
  const fabY = useRef(new Animated.Value(0)).current
  const lastScrollY = useRef(0)

  const activeLists = mockLists.filter((l) => !l.completed)
  const pastLists = mockLists.filter((l) => l.completed)
  const isEmpty = mockLists.length === 0

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y
    const diff = y - lastScrollY.current
    lastScrollY.current = y

    if (diff > 4 && y > 60) {
      // scroll down → hide FAB
      Animated.timing(fabY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } else if (diff < -4) {
      // scroll up → show FAB
      Animated.timing(fabY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#F1F5F9' }}
      className="dark:bg-dark-background"
      edges={['top']}
    >
      {/* ── Large title header ─────────────────────────────────── */}
      <View
        className="px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <View className="flex-row items-end justify-between">
          <Text className="text-heading-xl font-bold  text-foreground dark:text-dark-foreground">
            Bevásárló listák
          </Text>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={28} color="#2563EB" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ─────────────────────────────────── */}
      {isEmpty ? (
        <EmptyState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Aktív listák */}
          {activeLists.length > 0 && (
            <>
              <SectionHeader title="Aktív listák" />
              <View className="pt-2">
                {activeLists.map((list) => (
                  <ListCard key={list.id} list={list} onPress={() => {}} />
                ))}
              </View>
            </>
          )}

          {/* Korábbi listák */}
          {pastLists.length > 0 && (
            <>
              <SectionHeader title="Korábbi listák" />
              <View
                className="mx-screen-x mt-2 rounded-card overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card"
              >
                {pastLists.map((list, idx) => (
                  <View key={list.id}>
                    {idx > 0 && (
                      <View className="h-px bg-border dark:bg-dark-border mx-4" />
                    )}
                    <PastListRow list={list} />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB ───────────────────────────────────────────────── */}
      <Animated.View
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          transform: [{ translateY: fabY }],
        }}
      >
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 9999,
            backgroundColor: '#2563EB',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          })}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  )
}
