import { useEffect, useState, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import { Check, ChevronDown, X } from 'lucide-react-native'

import BoltRow from '@/components/bolt/BoltRow'
import BottomSheet from '@/components/ui/BottomSheet'
import { useListStore } from '@/store/listStore'
import { useProductStore } from '@/store/productStore'
import { colors } from '@/constants/colors'
import { haptics } from '@/lib/haptics'
import { formatHuf } from '@/lib/format'
import { sortItemsByStore } from '@/lib/sortByStore'

export default function BoltScreen() {
  useKeepAwake()

  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [ctaForced, setCtaForced] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const prevListId = useRef<string | null>(null)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const toggleItem = useListStore((s) => s.toggleItem)
  const finishShopping = useListStore((s) => s.finishShopping)
  const activeListId = useListStore((s) => s.activeListId)
  const setActiveListId = useListStore((s) => s.setActiveListId)

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)

  const dark = useColorScheme() === 'dark'
  const activeLists = lists.filter((l) => !l.completed)

  const activeList = (() => {
    if (activeListId) {
      const found = lists.find((l) => l.id === activeListId && !l.completed)
      if (found) return found
    }
    return lists.find((l) => !l.completed) ?? null
  })()

  const items = sortItemsByStore(activeList?.items ?? [], products)
  const checkedCount = items.filter((i) => i.checked).length
  const allChecked = items.length > 0 && checkedCount === items.length
  const ctaActive = allChecked || ctaForced
  const checkedTotal = Math.round(
    items.filter((i) => i.checked).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
  )

  useEffect(() => {
    if (activeList?.id !== prevListId.current) {
      prevListId.current = activeList?.id ?? null
      setCtaForced(false)
    }
  }, [activeList?.id])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  useEffect(() => {
    if (products.length === 0) void loadProducts()
  }, [products.length, loadProducts])

  async function handleComplete() {
    if (!activeList) return
    await finishShopping(activeList.id)
    router.back()
  }

  if (!activeList) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>
            Nincs aktív lista
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.boltBg }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <X size={24} color={colors.darkForeground} />
          </Pressable>

          <Pressable
            onPress={() => setShowPicker(true)}
            style={({ pressed }) => [styles.headerTitleRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeList.name}
            </Text>
            <ChevronDown size={20} color={colors.muted} />
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
            onToggle={() => {
              haptics.medium()
              void toggleItem(activeList.id, item.id)
            }}
          />
        ))}
      </ScrollView>

      {/* List picker bottom sheet */}
      <BottomSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        title="Lista kiválasztása"
        variant="half"
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerList}
          >
            {activeLists.map((list) => {
              const isActive = list.id === activeList.id
              const unchecked = list.items.filter((i) => !i.checked).length
              const total = list.items.length
              return (
                <Pressable
                  key={list.id}
                  onPress={() => {
                    setActiveListId(list.id)
                    setShowPicker(false)
                  }}
                  style={({ pressed }) => [
                    styles.pickerCard,
                    {
                      backgroundColor: isActive
                        ? colors.primary + '1A'
                        : dark ? colors.darkBackground : colors.background,
                      borderColor: isActive ? colors.primary : 'transparent',
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pickerCardName,
                        { color: isActive ? colors.primary : dark ? colors.darkForeground : colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {list.name}
                    </Text>
                    <Text style={[styles.pickerCardSub, { color: colors.muted }]}>
                      {total === 0
                        ? 'Üres lista'
                        : `${unchecked} / ${total} tétel`}
                    </Text>
                  </View>
                  {isActive && <Check size={22} color={colors.primary} />}
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      </BottomSheet>

      {/* Sticky progress bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onLongPress={() => setCtaForced(true)}
          delayLongPress={600}
          style={styles.progressRow}
        >
          <Text style={styles.progressText}>{checkedCount}/{items.length} kipipálva</Text>
          <Text style={styles.progressText}>
            Eddig {formatHuf(checkedTotal)}
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
    backgroundColor: colors.boltBg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.boltBorder,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.darkForeground,
  },
  pickerList: {
    paddingVertical: 8,
    gap: 10,
  },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerCardName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 3,
  },
  pickerCardSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  bar: {
    backgroundColor: colors.boltBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.boltBorder,
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
    color: colors.muted,
    fontWeight: '500',
  },
  cta: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.card,
  },
})
