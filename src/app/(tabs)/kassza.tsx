import { useEffect } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Wallet } from 'lucide-react-native'

import { BudgetCategoryRow } from '@/components/kassza/BudgetCategoryRow'
import { SavingsGoalRow } from '@/components/kassza/SavingsGoalRow'
import { useBudgetStore } from '@/store/budgetStore'
import { summarizeBudget } from '@/lib/budget'
import { formatHuf } from '@/lib/format'
import { colors } from '@/constants/colors'

export default function KasszaScreen() {
  const plan = useBudgetStore((s) => s.plan)
  const savingsGoals = useBudgetStore((s) => s.savingsGoals)
  const isLoading = useBudgetStore((s) => s.isLoading)
  const loadBudget = useBudgetStore((s) => s.loadBudget)

  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  const summary = plan ? summarizeBudget(plan) : null

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
            <Text className="text-body-sm text-muted">Havi keret</Text>
            <Text className="mt-1 text-heading-xl font-bold text-foreground dark:text-dark-foreground">
              {formatHuf(summary.keret)}
            </Text>

            {summary.hasIncome ? (
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
            ) : (
              <Text className="mt-2 text-body-sm text-muted">
                Teljes havi terv {summary.categories.length} kategóriában
              </Text>
            )}
          </View>

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
                  share={summary.allocated > 0 ? c.amount / summary.allocated : 0}
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
    </SafeAreaView>
  )
}
