import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useColorScheme } from 'nativewind'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Camera, ChevronLeft, MoreVertical, Plus } from 'lucide-react-native'

import { useOcrStore } from '@/store/ocrStore'

import ListItem from '@/components/lista/ListItem'
import ItemAddSheet from '@/components/lista/ItemAddSheet'
import ItemEditSheet from '@/components/lista/ItemEditSheet'
import { StoreOrderSheet } from '@/components/lista/StoreOrderSheet'
import { useListStore } from '@/store/listStore'
import { useProductStore } from '@/store/productStore'
import { useStoreOrderStore } from '@/store/storeOrderStore'
import { useToastStore } from '@/store/toastStore'
import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import { groupItemsByStore } from '@/lib/sortByStore'
import type { ItemCategory, ShoppingItem } from '@/types'

type FilterCategory = 'Összes' | ItemCategory
const FILTERS: FilterCategory[] = [
  'Összes', 'Zöldség', 'Gyümölcs', 'Tejtermék', 'Hús', 'Pékáru', 'Vegán', 'Ital', 'Édesség', 'Egyéb',
]

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'

  const insets = useSafeAreaInsets()

  const list = useListStore((s) => s.lists.find((l) => l.id === id))
  const toggleItem = useListStore((s) => s.toggleItem)
  const deleteItem = useListStore((s) => s.deleteItem)
  const updateItem = useListStore((s) => s.updateItem)
  const assignItemStore = useListStore((s) => s.assignItemStore)
  const showToast = useToastStore((s) => s.showToast)
  const addItem = useListStore((s) => s.addItem)
  const completeList = useListStore((s) => s.completeList)
  const deleteList = useListStore((s) => s.deleteList)

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)

  useEffect(() => {
    if (products.length === 0) void loadProducts()
  }, [products.length, loadProducts])

  const storeOrder = useStoreOrderStore((s) => s.order)
  const loadStoreOrder = useStoreOrderStore((s) => s.loadOrder)

  useEffect(() => {
    void loadStoreOrder()
  }, [loadStoreOrder])

  const [filter, setFilter] = useState<FilterCategory>('Összes')
  const [addVisible, setAddVisible] = useState(false)
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null)
  const [storeOrderVisible, setStoreOrderVisible] = useState(false)

  const items = list?.items ?? []
  const storeGroups = groupItemsByStore(
    filter === 'Összes' ? items : items.filter((i) => i.category === filter),
    products,
    storeOrder,
  )
  // Egyetlen, bolt nélküli csoportnál nincs értelme fejlécnek.
  const showStoreHeaders = !(storeGroups.length === 1 && storeGroups[0]?.store === null)
  const checkedCount = items.filter((i) => i.checked).length
  const allChecked = items.length > 0 && checkedCount === items.length

  // Pulse animation for "Lista befejezése" when all checked
  const pulse = useSharedValue(1)
  useEffect(() => {
    if (allChecked) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 300 }),
          withTiming(1, { duration: 300 }),
        ),
        -1,
        false,
      )
    } else {
      pulse.value = withTiming(1, { duration: 150 })
    }
  }, [allChecked, pulse])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }))

  const bg = dark ? colors.darkBackground : colors.background
  const barBg = dark ? colors.darkCard : colors.card
  const borderColor = dark ? colors.darkBorder : colors.border
  const fgColor = dark ? colors.darkForeground : colors.foreground

  function showMenu() {
    Alert.alert(list?.name ?? 'Lista', undefined, [
      {
        text: 'Boltok sorrendje',
        onPress: () => setStoreOrderVisible(true),
      },
      {
        text: 'Lista törlése',
        style: 'destructive',
        onPress: async () => {
          if (!id) return
          await deleteList(id)
          router.back()
        },
      },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  async function handleComplete() {
    if (!id) return
    await completeList(id)
    router.back()
  }

  if (!list) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: bg }]} edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-body-md text-muted">Lista nem található</Text>
        </View>
      </SafeAreaView>
    )
  }

  const totalFt = list.total_amount

  return (
    <View style={[styles.flex, { backgroundColor: bg }]}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: barBg }}>
        <View
          className="flex-row items-center px-screen-x"
          style={[styles.header, { borderBottomColor: borderColor }]}
        >
          {/* Bal: vissza gomb */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View className="flex-row items-center">
              <ChevronLeft size={22} color={colors.primary} strokeWidth={1.75} />
              <Text style={{ color: colors.primary, fontSize: 17, lineHeight: 22 }}>Vissza</Text>
            </View>
          </Pressable>

          {/* Cím */}
          <Text
            className="flex-1 text-[17px] font-semibold text-foreground dark:text-dark-foreground text-center px-2"
          >
            {list.name}
          </Text>

          {/* Jobb: menü */}
          <Pressable
            onPress={showMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <MoreVertical size={24} color={fgColor} strokeWidth={1.75} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Filter chips */}
      <View style={[styles.chips, { backgroundColor: barBg, borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {FILTERS.map((f) => {
            const active = f === filter
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={`h-9 px-4 rounded-fab mr-2 items-center justify-center ${
                  active ? 'bg-primary' : 'bg-[#F1F5F9] dark:bg-[#1E293B]'
                }`}
              >
                <Text
                  className={`text-body-sm font-medium ${
                    active ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                  }`}
                >
                  {f}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Items */}
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {storeGroups.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Text className="text-body-md text-muted">
              {filter === 'Összes' ? 'Még nincs tétel' : `Nincs ${filter} tétel`}
            </Text>
          </View>
        ) : (
          storeGroups.map((group) => (
            <View key={group.store ?? '__no_store__'}>
              {showStoreHeaders && (
                <Pressable
                  onPress={() => setStoreOrderVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${group.store ?? 'Bolt nélkül'} – boltok sorrendjének módosítása`}
                >
                  <View className="flex-row items-end px-screen-x pt-5 pb-2">
                    <Text className="flex-1 text-caption font-semibold text-muted uppercase tracking-widest">
                      {group.store ?? 'Bolt nélkül'}
                    </Text>
                    <Text className="text-caption text-muted">
                      {group.items.filter((i) => i.checked).length}/{group.items.length}
                    </Text>
                  </View>
                </Pressable>
              )}
              {group.items.map((item) => (
                <ListItem
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(list.id, item.id)}
                  onDelete={() => deleteItem(list.id, item.id)}
                  onEdit={() => setEditItem(item)}
                />
              ))}
            </View>
          ))
        )}
        {/* Bottom padding so last item is not hidden behind bar */}
        <View style={{ height: 112 + insets.bottom }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.bar,
          { backgroundColor: barBg, borderTopColor: borderColor, paddingBottom: insets.bottom },
        ]}
      >
        {/* Totals sor: összeg bal, ikonok jobb */}
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <Text className="text-caption text-muted uppercase tracking-widest">Összesen</Text>
            <Text className="text-heading-md font-bold text-foreground dark:text-dark-foreground">
              {formatHuf(totalFt)}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {/* Camera – OCR blokk beolvasás kötve a listához */}
            <Pressable
              className="w-tap h-tap rounded-button bg-[#F1F5F9] dark:bg-[#1E293B] items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              onPress={() => {
                useOcrStore.getState().setBoundList(id ?? null)
                router.push('/ocr')
              }}
              accessibilityLabel="Blokk beolvasása"
            >
              <Camera size={22} color={fgColor} />
            </Pressable>

            {/* Tétel hozzáadása */}
            <Pressable
              onPress={() => setAddVisible(true)}
              className="w-tap h-tap rounded-button bg-[#F1F5F9] dark:bg-[#1E293B] items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Plus size={22} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Teljes szélességű CTA */}
        <Animated.View style={pulseStyle}>
          <Pressable
            onPress={handleComplete}
            disabled={list.completed}
            className={`h-cta rounded-button bg-primary items-center justify-center ${
              list.completed ? 'opacity-40' : ''
            }`}
            style={({ pressed }) => ({ opacity: list.completed ? 0.4 : pressed ? 0.8 : 1 })}
          >
            <Text className="text-[17px] leading-[22px] font-semibold text-white">
              {list.completed ? 'Befejezve' : 'Lista befejezése'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Sheets */}
      <ItemAddSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={(item) => addItem(list.id, item)}
      />
      <ItemEditSheet
        visible={editItem !== null}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(itemId, patch, store) => {
          void (async () => {
            await updateItem(list.id, itemId, patch)
            if (store && !(await assignItemStore(list.id, itemId, store))) {
              showToast('A bolt mentése nem sikerült', 'error')
            }
          })()
        }}
      />
      <StoreOrderSheet
        visible={storeOrderVisible}
        onClose={() => setStoreOrderVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 44,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
