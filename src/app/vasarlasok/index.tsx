import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react-native'

import { usePurchaseStore } from '@/store/purchaseStore'
import { colors } from '@/constants/colors'
import { formatHuf, formatHuDate } from '@/lib/format'
import type { Purchase } from '@/types'

const SOURCE_LABEL: Record<Purchase['source'], string> = {
  ocr: 'Blokk',
  list: 'Lista',
  manual: 'Kézi',
  import: 'Import',
}

export default function PurchasesScreen() {
  const router = useRouter()

  const statistics    = usePurchaseStore((s) => s.statistics)
  const isLoading     = usePurchaseStore((s) => s.isLoading)
  const error         = usePurchaseStore((s) => s.error)
  const loadPurchases = usePurchaseStore((s) => s.loadPurchases)
  const getPurchases  = usePurchaseStore((s) => s.getPurchases)

  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void loadPurchases()
    }, [loadPurchases])
  )

  const purchases = useMemo(() => getPurchases(), [statistics, getPurchases])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPurchases()
    setRefreshing(false)
  }, [loadPurchases])

  function renderHeader() {
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
        <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
          Vásárlások
        </Text>
      </View>
    )
  }

  if (isLoading && purchases.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {renderHeader()}

      {error && (
        <View className="mx-screen-x mt-3 px-4 py-2 rounded-card bg-warning/10">
          <Text className="text-caption text-warning">{error}</Text>
        </View>
      )}

      {purchases.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View className="flex-1 items-center justify-center px-screen-x gap-3">
            <View
              className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
              style={{ width: 72, height: 72 }}
            >
              <Receipt size={32} color={colors.muted} strokeWidth={1.75} />
            </View>
            <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground text-center">
              Még nincs vásárlás
            </Text>
            <Text className="text-body-md text-muted text-center">
              Olvass be egy blokkot, vagy fejezz be egy listát — itt jelennek meg a vásárlásaid.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View className="mx-screen-x rounded-card overflow-hidden border border-border dark:border-dark-border bg-card dark:bg-dark-card">
            {purchases.map((p, idx) => (
              <View key={p.id}>
                {idx > 0 && <View className="h-px bg-border dark:bg-dark-border mx-4" />}
                <PurchaseRow
                  purchase={p}
                  onPress={() => router.push(`/vasarlasok/${encodeURIComponent(p.id)}`)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

interface PurchaseRowProps {
  purchase: Purchase
  onPress: () => void
}

function PurchaseRow({ purchase, onPress }: PurchaseRowProps) {
  const store = purchase.store_name ?? 'Ismeretlen bolt'
  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      onPress={onPress}
      accessibilityLabel={`${store}, ${formatHuDate(purchase.date)}, ${purchase.item_count} tétel, ${formatHuf(purchase.total)}`}
    >
      <View
        className="items-center justify-center rounded-full bg-primary/10"
        style={{ width: 40, height: 40 }}
      >
        <Receipt size={20} color={colors.primary} strokeWidth={1.75} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View className="flex-row items-center gap-2">
          <Text
            className="text-body-md font-semibold text-foreground dark:text-dark-foreground"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {store}
          </Text>
          <View className="rounded-fab bg-border dark:bg-dark-border px-2 py-0.5">
            <Text className="text-caption text-muted">{SOURCE_LABEL[purchase.source]}</Text>
          </View>
        </View>
        <Text className="text-body-sm text-muted">
          {formatHuDate(purchase.date)} · {purchase.item_count} tétel
        </Text>
      </View>

      <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
        {formatHuf(purchase.total)}
      </Text>
      <ChevronRight size={18} color={colors.muted} strokeWidth={1.75} />
    </Pressable>
  )
}
