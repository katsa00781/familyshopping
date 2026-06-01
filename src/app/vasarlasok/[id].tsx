import { useCallback, useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { usePurchaseStore } from '@/store/purchaseStore'
import { colors } from '@/constants/colors'
import { formatHuf, formatHuDate } from '@/lib/format'
import type { Purchase, ShoppingStatistic } from '@/types'

const SOURCE_LABEL: Record<Purchase['source'], string> = {
  ocr: 'Blokk',
  list: 'Lista',
  manual: 'Kézi',
  import: 'Import',
}

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const statistics    = usePurchaseStore((s) => s.statistics)
  const loadPurchases = usePurchaseStore((s) => s.loadPurchases)
  const getPurchase   = usePurchaseStore((s) => s.getPurchase)

  useFocusEffect(
    useCallback(() => {
      if (statistics.length === 0) void loadPurchases()
    }, [statistics.length, loadPurchases])
  )

  const purchase = useMemo(() => (id ? getPurchase(id) : undefined), [id, statistics, getPurchase])

  function renderHeader(title: string) {
    return (
      <View
        className="px-screen-x border-b border-border dark:border-dark-border flex-row items-center"
        style={{ height: 56 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Vissza"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}
        >
          <ChevronLeft size={26} color={colors.muted} strokeWidth={2} />
        </Pressable>
        <Text
          className="text-heading-md font-semibold text-foreground dark:text-dark-foreground"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {title}
        </Text>
      </View>
    )
  }

  if (!purchase) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
        {renderHeader('Vásárlás')}
        <View className="flex-1 items-center justify-center px-screen-x">
          <Text className="text-body-md text-muted text-center">A vásárlás nem található.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const store = purchase.store_name ?? 'Ismeretlen bolt'

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {renderHeader(store)}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
      >
        {/* Meta */}
        <View className="px-screen-x flex-row items-center gap-2 mb-3">
          <Text className="text-body-sm text-muted">{formatHuDate(purchase.date)}</Text>
          <View className="rounded-fab bg-border dark:bg-dark-border px-2 py-0.5">
            <Text className="text-caption text-muted">{SOURCE_LABEL[purchase.source]}</Text>
          </View>
          <Text className="text-body-sm text-muted">· {purchase.item_count} tétel</Text>
        </View>

        {/* Tételek */}
        <View className="mx-screen-x rounded-card overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
          {purchase.items.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 && <View className="h-px bg-border dark:bg-dark-border mx-4" />}
              <ItemRow item={item} />
            </View>
          ))}
        </View>

        {/* Összesítő */}
        <View className="mx-screen-x mt-section flex-row items-center justify-between rounded-card bg-card dark:bg-dark-card border border-border dark:border-dark-border px-4 py-4">
          <Text className="text-body-md text-muted">Összesen</Text>
          <Text className="text-heading-md font-bold text-foreground dark:text-dark-foreground">
            {formatHuf(purchase.total)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ItemRow({ item }: { item: ShoppingStatistic }) {
  const qtyLabel = `${formatHuf(item.unit_price)} · ${item.quantity} ${item.unit}`
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          className="text-body-md font-medium text-foreground dark:text-dark-foreground"
          numberOfLines={2}
        >
          {item.product_name}
        </Text>
        <Text className="text-body-sm text-muted">{qtyLabel}</Text>
      </View>
      <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
        {formatHuf(item.total_price)}
      </Text>
    </View>
  )
}
