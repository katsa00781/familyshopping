import { useEffect, useState, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { Moon, X } from 'lucide-react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'

import BoltRow from '@/components/bolt/BoltRow'
import { useListStore } from '@/store/listStore'

export default function BoltScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [keepAwake, setKeepAwake] = useState(false)
  const [ctaForced, setCtaForced] = useState(false)
  const prevListId = useRef<string | null>(null)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const toggleItem = useListStore((s) => s.toggleItem)
  const completeList = useListStore((s) => s.completeList)
  const activeListId = useListStore((s) => s.activeListId)

  const activeList = (() => {
    if (activeListId) {
      const found = lists.find((l) => l.id === activeListId && !l.completed)
      if (found) return found
    }
    return lists.find((l) => !l.completed) ?? null
  })()

  const items = activeList?.items ?? []
  const checkedCount = items.filter((i) => i.checked).length
  const allChecked = items.length > 0 && checkedCount === items.length
  const ctaActive = allChecked || ctaForced
  const checkedTotal = Math.round(
    items.filter((i) => i.checked).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
  )

  // Reset forced CTA when switching lists
  useEffect(() => {
    if (activeList?.id !== prevListId.current) {
      prevListId.current = activeList?.id ?? null
      setCtaForced(false)
    }
  }, [activeList?.id])

  useEffect(() => {
    void loadLists()
    return () => {
      void deactivateKeepAwake()
    }
  }, [loadLists])

  async function toggleKeepAwake() {
    if (keepAwake) {
      await deactivateKeepAwake()
      setKeepAwake(false)
    } else {
      await activateKeepAwakeAsync()
      setKeepAwake(true)
    }
  }

  async function handleComplete() {
    if (!activeList) return
    await completeList(activeList.id)
    router.back()
  }

  if (!activeList) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, lineHeight: 22, color: '#94A3B8', textAlign: 'center' }}>
            Nincs aktív lista
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header – 52pt, bg #000, hairline bottom #1F2937 */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000000' }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <X size={24} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeList.name}
          </Text>

          <Pressable
            onPress={toggleKeepAwake}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <Moon
              size={24}
              color={keepAwake ? '#2563EB' : '#94A3B8'}
              fill={keepAwake ? '#2563EB' : 'none'}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Item list */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {items.map((item) => (
          <BoltRow
            key={item.id}
            item={item}
            onToggle={() => void toggleItem(activeList.id, item.id)}
          />
        ))}
      </ScrollView>

      {/* Sticky progress bar – bg #111827, hairline top #1F2937 */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Long-press this row to force-activate the CTA */}
        <Pressable
          onLongPress={() => setCtaForced(true)}
          delayLongPress={600}
          style={styles.progressRow}
        >
          <Text style={styles.progressText}>{checkedCount}/{items.length} kipipálva</Text>
          <Text style={styles.progressText}>
            Eddig {checkedTotal.toLocaleString('hu-HU')} Ft
          </Text>
        </Pressable>

        {ctaActive && (
          <Pressable
            onPress={handleComplete}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>Vásárlás kész ✓</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: '#F8FAFC',
    marginHorizontal: 12,
  },
  bar: {
    backgroundColor: '#111827',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2937',
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
  },
  progressText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cta: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
