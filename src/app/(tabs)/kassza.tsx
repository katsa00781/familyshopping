import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Wallet } from 'lucide-react-native'

import { BudgetCategoryRow } from '@/components/kassza/BudgetCategoryRow'
import { BudgetPieChart } from '@/components/kassza/BudgetPieChart'
import { CategorySpendingSheet } from '@/components/kassza/CategorySpendingSheet'
import { SavingsGoalRow } from '@/components/kassza/SavingsGoalRow'
import { useBudgetStore } from '@/store/budgetStore'
import { budgetPieInputs, currentMonthStart, summarizeBudget } from '@/lib/budget'
import { buildPieSlices } from '@/lib/pie'
import { formatHuf } from '@/lib/format'
import { colors } from '@/constants/colors'

type PieMode = 'teny' | 'terv'

const PIE_MODES: { mode: PieMode; label: string; a11y: string }[] = [
  { mode: 'teny', label: 'Tény', a11y: 'Tényleges költés megoszlása' },
  { mode: 'terv', label: 'Terv', a11y: 'Tervezett keret megoszlása' },
]

export default function KasszaScreen() {
  const plan = useBudgetStore((s) => s.plan)
  const savingsGoals = useBudgetStore((s) => s.savingsGoals)
  const spending = useBudgetStore((s) => s.spending)
  const isLoading = useBudgetStore((s) => s.isLoading)
  const loadBudget = useBudgetStore((s) => s.loadBudget)

  const [detailCategory, setDetailCategory] = useState<string | null>(null)
  const [pieMode, setPieMode] = useState<PieMode>('teny')

  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  const summary = plan ? summarizeBudget(plan, spending) : null
  const detailPlanned = summary?.categories.find((c) => c.name === detailCategory)?.amount ?? 0

  // Tortadiagram: valós költés (Wallet), ha van; különben csak a terv-megoszlás.
  const effectivePieMode: PieMode = summary?.hasSpending ? pieMode : 'terv'
  const pieInputs = summary ? budgetPieInputs(summary, spending) : null
  const pieSlices = pieInputs
    ? buildPieSlices(effectivePieMode === 'teny' ? pieInputs.spent : pieInputs.planned)
    : []

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-dark-background" edges={['top']}>
      <View
        className="px-screen-x border-b border-border dark:border-dark-border"
        style={{ height: 96, justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Text className="text-heading-xl font-bold text-foreground dark:text-dark-foreground">
          Kassza
        </Text>
      </View>

      {!summary && isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !summary ? (
        <View className="flex-1 items-center justify-center px-screen-x gap-3">
          <View
            className="items-center justify-center rounded-full bg-border dark:bg-dark-border"
            style={{ width: 72, height: 72 }}
          >
            <Wallet size={32} color={colors.muted} strokeWidth={1.75} />
          </View>
          <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground text-center">
            Még nincs havi költségvetés
          </Text>
          <Text className="text-body-md text-muted text-center">
            A havi tervet a familybudget weben hozhatod létre. Ha kész, itt jelenik meg a
            keret, a kategória-bontás és a megtakarítási célok.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadBudget} tintColor={colors.primary} />
          }
        >
          {/* Összegző kártya */}
          <View className="mx-screen-x mt-4 rounded-3xl border border-border dark:border-dark-border bg-card dark:bg-dark-card p-5">
            {summary.hasActualIncome ? (
              // Tényleges bevétel + kiadás → szabad keret kiszámítva
              <>
                <Text className="text-body-sm text-muted">Havi bevétel</Text>
                <Text className="mt-1 text-heading-xl font-bold text-foreground dark:text-dark-foreground">
                  {formatHuf(summary.totalIncome)}
                </Text>
                <View className="mt-4 flex-row">
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Kiadás</Text>
                    <Text className="mt-0.5 text-body-lg font-semibold text-foreground dark:text-dark-foreground">
                      {formatHuf(summary.totalSpent)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Szabad keret</Text>
                    <Text
                      className={`mt-0.5 text-body-lg font-semibold ${
                        summary.remainingAfterSpent < 0
                          ? 'text-warning'
                          : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {formatHuf(summary.remainingAfterSpent)}
                    </Text>
                  </View>
                </View>
              </>
            ) : summary.hasSpending ? (
              // Van kiadás-adat, de nincs bevétel → tervezett keret alapján
              <>
                <Text className="text-body-sm text-muted">Tervezett keret</Text>
                <Text className="mt-1 text-heading-xl font-bold text-foreground dark:text-dark-foreground">
                  {formatHuf(summary.keret)}
                </Text>
                <View className="mt-4 flex-row">
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Elköltve</Text>
                    <Text className="mt-0.5 text-body-lg font-semibold text-foreground dark:text-dark-foreground">
                      {formatHuf(summary.totalSpent)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Szabad keret</Text>
                    <Text
                      className={`mt-0.5 text-body-lg font-semibold ${
                        summary.remainingAfterSpent < 0
                          ? 'text-warning'
                          : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {formatHuf(summary.remainingAfterSpent)}
                    </Text>
                  </View>
                </View>
              </>
            ) : summary.hasIncome ? (
              // Csak tervezési nézet (nincs Wallet-kapcsolat)
              <>
                <Text className="text-body-sm text-muted">Tervezett keret</Text>
                <Text className="mt-1 text-heading-xl font-bold text-foreground dark:text-dark-foreground">
                  {formatHuf(summary.keret)}
                </Text>
                <View className="mt-4 flex-row">
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Betervezve</Text>
                    <Text className="mt-0.5 text-body-lg font-semibold text-foreground dark:text-dark-foreground">
                      {formatHuf(summary.allocated)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-sm text-muted">Szabad keret</Text>
                    <Text
                      className={`mt-0.5 text-body-lg font-semibold ${
                        summary.remaining < 0
                          ? 'text-warning'
                          : 'text-foreground dark:text-dark-foreground'
                      }`}
                    >
                      {formatHuf(summary.remaining)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text className="text-body-sm text-muted">Havi terv</Text>
                <Text className="mt-1 text-heading-xl font-bold text-foreground dark:text-dark-foreground">
                  {formatHuf(summary.keret)}
                </Text>
                <Text className="mt-2 text-body-sm text-muted">
                  {summary.categories.length} kategóriában tervezve
                </Text>
              </>
            )}
          </View>

          {/* Megoszlás – tortadiagram */}
          {pieSlices.length > 0 ? (
            <View className="mx-screen-x mt-4 rounded-3xl border border-border dark:border-dark-border bg-card dark:bg-dark-card p-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
                  Megoszlás
                </Text>
                {summary.hasSpending ? (
                  <View
                    className="bg-surface-sunken dark:bg-dark-border"
                    style={{ flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 }}
                  >
                    {PIE_MODES.map(({ mode, label, a11y }) => {
                      const active = effectivePieMode === mode
                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setPieMode(mode)}
                          accessibilityRole="button"
                          accessibilityLabel={a11y}
                          accessibilityState={{ selected: active }}
                          hitSlop={6}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 9,
                            backgroundColor: active ? colors.primary : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12.5,
                              fontWeight: '800',
                              color: active ? colors.primaryForeground : colors.muted,
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                ) : null}
              </View>
              <BudgetPieChart
                key={effectivePieMode}
                slices={pieSlices}
                totalLabel={effectivePieMode === 'teny' ? 'Elköltve összesen' : 'Betervezve összesen'}
              />
            </View>
          ) : null}

          {/* Kategória-bontás */}
          {summary.categories.length > 0 ? (
            <View className="mx-screen-x mt-4 rounded-3xl border border-border dark:border-dark-border bg-card dark:bg-dark-card p-5">
              <Text className="mb-1 text-heading-md font-semibold text-foreground dark:text-dark-foreground">
                Kategóriák
              </Text>
              {summary.categories.map((c) => (
                <BudgetCategoryRow
                  key={c.name}
                  name={c.name}
                  amount={c.amount}
                  spent={c.spent}
                  hasSpending={summary.hasSpending}
                  share={summary.allocated > 0 ? c.amount / summary.allocated : 0}
                  onPress={summary.hasSpending ? () => setDetailCategory(c.name) : undefined}
                />
              ))}
            </View>
          ) : null}

          {/* Megtakarítási célok */}
          {savingsGoals.length > 0 ? (
            <View className="mx-screen-x mt-4 rounded-3xl border border-border dark:border-dark-border bg-card dark:bg-dark-card p-5">
              <Text className="mb-1 text-heading-md font-semibold text-foreground dark:text-dark-foreground">
                Megtakarítási célok
              </Text>
              {savingsGoals.map((g) => (
                <SavingsGoalRow key={g.id} goal={g} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <CategorySpendingSheet
        visible={detailCategory != null}
        category={detailCategory}
        month={currentMonthStart()}
        planned={detailPlanned}
        onClose={() => setDetailCategory(null)}
      />
    </SafeAreaView>
  )
}
