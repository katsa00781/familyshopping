import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import DonutChart from '@/components/arak/DonutChart'
import KpiCard from '@/components/arak/KpiCard'
import ChangeRow from '@/components/arak/ChangeRow'
import { usePriceStore } from '@/store/priceStore'
import { useAuthStore } from '@/store/authStore'
import { catBg, colors } from '@/constants/colors'
import { formatHuNumber } from '@/lib/format'
import type { ItemCategory } from '@/types'
import type { Period } from '@/store/priceStore'

type Direction = 'all' | 'up' | 'down'

const PERIODS: { label: string; value: Period }[] = [
  { label: '7n', value: 7 },
  { label: '30n', value: 30 },
  { label: '90n', value: 90 },
]

const ALL_CATEGORIES: ItemCategory[] = ['Zöldség', 'Tejtermék', 'Hús', 'Pékáru', 'Egyéb']

export default function ArakScreen() {
  const router = useRouter()
  const [direction, setDirection] = useState<Direction>('all')
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null)

  const userEmail = useAuthStore((s) => s.user?.email)

  const priceHistory     = usePriceStore((s) => s.priceHistory)
  const statistics       = usePriceStore((s) => s.statistics)
  const period           = usePriceStore((s) => s.period)
  const isLoading        = usePriceStore((s) => s.isLoading)
  const error            = usePriceStore((s) => s.error)
  const loadPriceData    = usePriceStore((s) => s.loadPriceData)
  const setPeriod        = usePriceStore((s) => s.setPeriod)
  const computeChanges   = usePriceStore((s) => s.computePriceChanges)
  const computeInflation = usePriceStore((s) => s.computeInflation)
  const computeKpis      = usePriceStore((s) => s.computeKpis)

  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void loadPriceData()
    }, [loadPriceData])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPriceData()
    setRefreshing(false)
  }, [loadPriceData])

  const changes   = useMemo(() => computeChanges(),   [priceHistory, computeChanges])
  const inflation = useMemo(() => computeInflation(), [priceHistory, computeInflation])
  const kpis      = useMemo(() => computeKpis(),      [priceHistory, statistics, period, computeKpis])

  const filteredChanges = useMemo(() => {
    let result = changes
    if (selectedCategory) {
      result = result.filter((c) => c.product_category === selectedCategory)
    }
    if (direction === 'up')   result = result.filter((c) => c.change_pct > 0)
    if (direction === 'down') result = result.filter((c) => c.change_pct < 0)
    return result
  }, [changes, selectedCategory, direction])

  const hasData = priceHistory.length > 0

  // ─── Header ────────────────────────────────────────────────────────────────
  function renderHeader() {
    return (
      <View className="px-screen-x border-b border-border dark:border-dark-border" style={{ paddingBottom: 12, paddingTop: 4 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', marginLeft: -6, marginBottom: 2, alignSelf: 'flex-start' })}
          accessibilityLabel="Vissza"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.muted} strokeWidth={1.75} />
          <Text className="text-body-md text-muted">Bevásárlás</Text>
        </Pressable>
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Árfigyelés
        </Text>
        {/* Period segmented control */}
        <View className="flex-row mt-3 gap-2">
          {PERIODS.map((p) => {
            const active = period === p.value
            return (
              <Pressable
                key={p.value}
                onPress={() => {
                  setSelectedCategory(null)
                  setPeriod(p.value)
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                className={`px-4 py-1.5 rounded-fab ${
                  active
                    ? 'bg-primary'
                    : 'bg-border dark:bg-dark-border'
                }`}
              >
                <Text
                  className={`text-body-sm font-semibold ${
                    active ? 'text-white' : 'text-muted'
                  }`}
                >
                  {p.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  // ─── No data ────────────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
        {renderHeader()}
        {error && (
          <View className="mx-screen-x mt-3 px-4 py-2 rounded-card bg-warning/10">
            <Text className="text-caption text-warning">{error}</Text>
          </View>
        )}
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        >
          <View className="flex-1 items-center justify-center px-screen-x gap-3">
            <View
              className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
              style={{ width: 72, height: 72 }}
            >
              <Text style={{ fontSize: 32 }}>📊</Text>
            </View>
            <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground text-center">
              Még nincs adat
            </Text>
            <Text className="text-body-md text-muted text-center">
              Adj meg legalább 2 árat ugyanarra a termékre, hogy megjelenjen az árváltozás.
            </Text>
            {userEmail ? (
              <Text className="text-caption text-muted text-center">
                Bejelentkezve: {userEmail}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── KPI values ─────────────────────────────────────────────────────────────
  const mostExpMonth = kpis.mostExpensiveMonth
  const kpiCards = [
    {
      title: 'Legdrágább hónap',
      value: mostExpMonth ? formatHuNumber(mostExpMonth.amount) : '—',
      unit:  mostExpMonth ? mostExpMonth.label : 'Ft',
    },
    {
      title: 'Heti átlag',
      value: formatHuNumber(kpis.weeklyAverage),
      unit:  'Ft/hét',
    },
    {
      title: 'Figyelt termékek',
      value: String(kpis.trackedProducts),
      unit:  'termék',
    },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      {renderHeader()}

      {error && (
        <View className="mx-screen-x mt-3 px-4 py-2 rounded-card bg-warning/10">
          <Text className="text-caption text-warning">{error}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── KPI kártyák ─────────────────────────────────────────────────── */}
        <View className="mt-section">
          <Text className="text-body-sm font-semibold text-muted uppercase px-screen-x mb-3" style={{ letterSpacing: 0.8 }}>
            Összesítés
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {kpiCards.map((card) => (
              <KpiCard key={card.title} title={card.title} value={card.value} unit={card.unit} />
            ))}
          </ScrollView>
        </View>

        {/* ── Személyes infláció ──────────────────────────────────────────── */}
        <View className="mx-screen-x mt-section rounded-card bg-card dark:bg-dark-card p-4">
          <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground mb-4">
            Személyes infláció
          </Text>
          <View className="flex-row gap-4 items-center">
            <DonutChart
              data={inflation}
              period={period}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            {/* Legend */}
            <View className="flex-1 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const item = inflation.find((d) => d.category === cat)
                const pct = item ? Math.round(item.change_pct) : 0
                const isSelected = selectedCategory === cat
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <View className="flex-row items-center gap-2">
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: catBg[cat],
                          opacity: selectedCategory === null || isSelected ? 1 : 0.35,
                        }}
                      />
                      <Text
                        className={`text-body-sm flex-1 ${
                          selectedCategory === null || isSelected
                            ? 'text-foreground dark:text-dark-foreground'
                            : 'text-muted'
                        }`}
                        numberOfLines={1}
                      >
                        {cat}
                      </Text>
                      <Text
                        className={`text-caption font-semibold ${
                          pct > 0 ? 'text-destructive' : pct < 0 ? 'text-success' : 'text-muted'
                        }`}
                      >
                        {pct > 0 ? '+' : ''}{pct}%
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>

        {/* ── Árváltozások ────────────────────────────────────────────────── */}
        <View className="mt-section">
          <View className="flex-row items-center justify-between px-screen-x mb-3">
            <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
              Árváltozások
            </Text>
            {/* Filter pills */}
            <View className="flex-row gap-1.5">
              {(['all', 'up', 'down'] as Direction[]).map((d) => {
                const label = d === 'all' ? 'Mind' : d === 'up' ? '↑' : '↓'
                const active = direction === d
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDirection(d)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    className={`px-3 py-1 rounded-fab ${
                      active ? 'bg-primary' : 'bg-border dark:bg-dark-border'
                    }`}
                  >
                    <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {filteredChanges.length === 0 ? (
            <View className="items-center py-10 px-screen-x">
              <Text className="text-body-md text-muted text-center">
                Nincs találat a szűrési feltételekre.
              </Text>
            </View>
          ) : (
            <View className="border-t border-border dark:border-dark-border">
              {filteredChanges.map((change, idx) => (
                <View key={`${change.product_name}-${idx}`}>
                  <ChangeRow change={change} />
                  {idx < filteredChanges.length - 1 && (
                    <View className="h-px bg-border dark:bg-dark-border mx-screen-x" />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
