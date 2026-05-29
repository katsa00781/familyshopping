import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useColorScheme } from 'nativewind'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Pencil, ShoppingCart, Trash2 } from 'lucide-react-native'
import { Circle, Defs, Line, LinearGradient, Path, Stop, Svg } from 'react-native-svg'

import { useProductStore } from '@/store/productStore'
import { useListStore } from '@/store/listStore'
import { useToastStore } from '@/store/toastStore'
import BottomSheet from '@/components/ui/BottomSheet'
import Button from '@/components/ui/Button'
import { CategoryBadge, PriceBadge } from '@/components/ui/Badge'
import { colors } from '@/constants/colors'
import { formatHuf } from '@/lib/format'
import type { ItemCategory, PriceHistoryEntry, ShoppingItem } from '@/types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Period selector ──────────────────────────────────────────────────────────

type Period = '1hó' | '3hó' | '1év'

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Kézi',
  list:   'Lista',
  ocr:    'OCR',
  import: 'Import',
}

const SOURCE_BG: Record<string, string> = {
  manual: '#CBD5E1',
  list:   '#93C5FD',
  ocr:    '#DDD6FE',
  import: '#FCD34D',
}

const VALID_CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

// ─── Area chart ───────────────────────────────────────────────────────────────

function filterByPeriod(entries: PriceHistoryEntry[], period: Period): PriceHistoryEntry[] {
  const now = new Date()
  let cutoff: Date
  if (period === '1hó') {
    cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  } else if (period === '3hó') {
    cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  } else {
    cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  }
  return entries
    .filter((e) => new Date(e.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

interface AreaChartProps {
  history: PriceHistoryEntry[]
  period: Period
  chartWidth: number
}

function AreaChart({ history, period, chartWidth }: AreaChartProps) {
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const chartHeight = 120
  const padX = 10
  const padY = 16

  const filtered = filterByPeriod(history, period)

  if (filtered.length < 2) {
    return (
      <View style={{ height: chartHeight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Nincs elég adat a kiválasztott időszakra</Text>
      </View>
    )
  }

  const prices = filtered.map((e) => e.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  const dates = filtered.map((e) => new Date(e.date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const dateRange = maxDate - minDate || 1

  const innerW = chartWidth - padX * 2
  const innerH = chartHeight - padY * 2

  const points = filtered.map((e) => ({
    x: padX + ((new Date(e.date).getTime() - minDate) / dateRange) * innerW,
    y: padY + ((maxPrice - e.price) / priceRange) * innerH,
  }))

  const isUp = filtered[filtered.length - 1].price > filtered[0].price
  const trendColor = isUp ? colors.destructive : colors.success

  const linePath = points.reduce(
    (d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`),
    ''
  )
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`

  const minY = padY + innerH
  const maxY = padY

  const gridColor = dark ? colors.darkBorder : colors.border

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={trendColor} stopOpacity="0.22" />
          <Stop offset="1" stopColor={trendColor} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Min gridline */}
      <Line
        x1={padX} y1={minY} x2={chartWidth - padX} y2={minY}
        stroke={gridColor} strokeWidth={1} strokeDasharray="4 3"
      />
      {/* Max gridline */}
      <Line
        x1={padX} y1={maxY} x2={chartWidth - padX} y2={maxY}
        stroke={gridColor} strokeWidth={1} strokeDasharray="4 3"
      />

      {/* Area fill */}
      <Path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <Path
        d={linePath}
        stroke={trendColor}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={trendColor} />
      ))}

      {/* Price labels at min/max */}
      {/* Using View/Text overlay instead of SVG Text for simplicity */}
    </Svg>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === 'dark'
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const products = useProductStore((s) => s.products)
  const deleteProduct = useProductStore((s) => s.deleteProduct)

  const lists = useListStore((s) => s.lists)
  const loadLists = useListStore((s) => s.loadLists)
  const addItem = useListStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)

  const activeLists = lists.filter((l) => !l.completed)

  useEffect(() => {
    if (lists.length === 0) void loadLists()
  }, [])

  const product = products.find((p) => p.id === id)

  const [period, setPeriod] = useState<Period>('3hó')
  const [addSheetVisible, setAddSheetVisible] = useState(false)

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea} className="bg-background dark:bg-dark-background" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-body-lg text-muted">Termék nem található</Text>
        </View>
      </SafeAreaView>
    )
  }

  const isValidCat = VALID_CATEGORIES.includes(product.category as ItemCategory)
  const changePct =
    product.last_price && product.price
      ? ((product.price - product.last_price) / product.last_price) * 100
      : null
  const changeFt =
    product.last_price && product.price ? product.price - product.last_price : null

  const sortedHistory = [...product.price_history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  function handleDelete() {
    if (!product) return
    Alert.alert('Törlés', `Biztosan törlöd: ${product.name}?`, [
      { text: 'Törlés', style: 'destructive', onPress: () => { deleteProduct(product.id); router.back() } },
      { text: 'Mégse', style: 'cancel' },
    ])
  }

  async function handleAddToList(listId: string) {
    if (!product) return
    const item: ShoppingItem = {
      id: generateId(),
      name: product.name,
      quantity: 1,
      unit: product.unit,
      category: VALID_CATEGORIES.includes(product.category as ItemCategory)
        ? (product.category as ItemCategory)
        : 'Egyéb',
      checked: false,
      price: product.price,
      product_id: product.id,
    }
    await addItem(listId, item)
    const listName = lists.find((l) => l.id === listId)?.name ?? 'lista'
    showToast(`Hozzáadva: ${listName}`, 'success')
    setAddSheetVisible(false)
  }

  const chartWidth = width - 32

  return (
    <SafeAreaView style={styles.safeArea} className="bg-background dark:bg-dark-background" edges={['top']}>
      {/* Nav bar */}
      <View
        className="flex-row items-center px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 56 }}
      >
        <Pressable
          className="w-tap h-tap items-center justify-center -ml-2"
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={dark ? colors.darkForeground : colors.foreground} />
        </Pressable>

        <Text
          className="flex-1 text-body-lg font-semibold text-foreground dark:text-dark-foreground text-center"
          numberOfLines={1}
        >
          {product.name}
        </Text>

        <View className="flex-row gap-1">
          <Pressable
            className="w-tap h-tap items-center justify-center"
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            onPress={() => router.push(`/termekek/uj?id=${product.id}`)}
          >
            <Pencil size={20} color={dark ? colors.darkForeground : colors.foreground} />
          </Pressable>
          <Pressable
            className="w-tap h-tap items-center justify-center"
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            onPress={handleDelete}
          >
            <Trash2 size={20} color={colors.destructive} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Identity card */}
        <View className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card p-4 mb-4">
          <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground mb-1">
            {product.name}
          </Text>
          {product.brand && (
            <Text className="text-body-md text-muted mb-2">{product.brand}</Text>
          )}
          <View className="flex-row flex-wrap gap-2 items-center">
            {isValidCat && <CategoryBadge category={product.category as ItemCategory} />}
            <Text className="text-body-sm text-muted">{product.unit}</Text>
            {product.store_name && (
              <Text className="text-body-sm text-muted">· {product.store_name}</Text>
            )}
          </View>
        </View>

        {/* Dark price highlight */}
        <View
          className="rounded-card p-4 mb-4"
          style={{ backgroundColor: colors.darkCard }}
        >
          <Text className="text-body-sm mb-1" style={{ color: colors.muted }}>
            Aktuális ár
          </Text>
          <View className="flex-row items-end justify-between">
            <Text className="text-heading-lg font-bold" style={{ color: colors.darkForeground }}>
              {product.price != null
                ? formatHuf(product.price)
                : '–'}
            </Text>
            {changePct != null && changeFt != null && (
              <PriceBadge
                direction={changeFt >= 0 ? 'up' : 'down'}
                pct={Math.abs(changePct)}
                ft={Math.abs(changeFt)}
              />
            )}
          </View>
          {product.last_price != null && (
            <Text className="text-body-sm mt-1" style={{ color: colors.muted }}>
              Előző ár: {formatHuf(product.last_price)}
            </Text>
          )}
        </View>

        {/* Area chart section */}
        {product.price_history.length > 0 && (
          <View className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card p-4 mb-4">
            {/* Period selector */}
            <View className="flex-row gap-2 mb-4">
              {(['1hó', '3hó', '1év'] as Period[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={`h-8 px-4 rounded-fab items-center justify-center ${
                    period === p
                      ? 'bg-primary'
                      : 'bg-background dark:bg-dark-background border border-border dark:border-dark-border'
                  }`}
                  style={({ pressed }) => (pressed ? styles.pressed : undefined)}
                >
                  <Text
                    className={`text-body-sm font-semibold ${
                      period === p ? 'text-white' : 'text-foreground dark:text-dark-foreground'
                    }`}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Chart */}
            <AreaChart history={product.price_history} period={period} chartWidth={chartWidth} />

            {/* Min/max labels below chart */}
            {(() => {
              const filtered = filterByPeriod(product.price_history, period)
              if (filtered.length < 2) return null
              const prices = filtered.map((e) => e.price)
              const minP = Math.min(...prices)
              const maxP = Math.max(...prices)
              return (
                <View className="flex-row justify-between mt-2">
                  <Text className="text-body-sm text-muted">
                    Min: {formatHuf(minP)}
                  </Text>
                  <Text className="text-body-sm text-muted">
                    Max: {formatHuf(maxP)}
                  </Text>
                </View>
              )
            })()}
          </View>
        )}

        {/* Price history log */}
        {sortedHistory.length > 0 && (
          <View className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-card overflow-hidden">
            <View className="px-4 py-3 border-b border-border dark:border-dark-border">
              <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
                Árnapló
              </Text>
            </View>
            {sortedHistory.map((entry, idx) => {
              const srcLabel = SOURCE_LABELS[entry.source] ?? entry.source
              const srcBg = SOURCE_BG[entry.source] ?? '#CBD5E1'
              const isLast = idx === sortedHistory.length - 1
              const dateStr = new Date(entry.date).toLocaleDateString('hu-HU', {
                year: 'numeric', month: 'short', day: 'numeric',
              })
              return (
                <View
                  key={idx}
                  className={`flex-row items-center px-4 py-3 ${!isLast ? 'border-b border-border dark:border-dark-border' : ''}`}
                >
                  {/* Source badge */}
                  <View
                    className="rounded-badge px-2 py-0.5 mr-3"
                    style={{ backgroundColor: srcBg }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.5)', letterSpacing: 0.5 }}>
                      {srcLabel}
                    </Text>
                  </View>

                  {/* Date */}
                  <Text className="text-body-sm text-muted flex-1">{dateStr}</Text>

                  {/* Store */}
                  {entry.store_name && (
                    <Text className="text-body-sm text-muted mr-3" numberOfLines={1}>
                      {entry.store_name}
                    </Text>
                  )}

                  {/* Price */}
                  <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
                    {formatHuf(entry.price)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
      {/* Footer: hozzáadás listához */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<ShoppingCart size={20} color="#fff" strokeWidth={1.75} />}
          onPress={() => setAddSheetVisible(true)}
        >
          Hozzáadás listához
        </Button>
      </View>

      {/* Lista választó sheet */}
      <BottomSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        title="Lista kiválasztása"
      >
        {activeLists.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Nincs aktív lista.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {activeLists.map((list, idx) => (
              <View key={list.id}>
                {idx > 0 && (
                  <View style={{ height: 1, backgroundColor: dark ? colors.darkBorder : colors.border, marginHorizontal: 4 }} />
                )}
                <Pressable
                  style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}
                  onPress={() => handleAddToList(list.id)}
                  accessibilityLabel={`Hozzáadás: ${list.name}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.listRowName, { color: dark ? colors.darkForeground : colors.foreground }]}
                      numberOfLines={1}
                    >
                      {list.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {list.items.length} tétel
                    </Text>
                  </View>
                  <ShoppingCart size={18} color={colors.primary} strokeWidth={1.75} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pressed: { opacity: 0.75 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    minHeight: 56,
  },
  listRowName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
})
