import { Text, View } from 'react-native'
import { Wallet } from 'lucide-react-native'

import { DashboardCard } from './DashboardCard'
import { formatHuNumber } from '@/lib/format'
import type { BudgetSummary } from '@/types'

interface BudgetCardProps {
  summary: BudgetSummary | null
  onPress: () => void
}

function currentMonthLabel(): string {
  const month = new Date().toLocaleDateString('hu-HU', { month: 'long' })
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1)
  // hu: hónapnév + „i" képző (június → júniusi)
  return `${capitalized}i keret`
}

/**
 * Kassza kártya – havi terv áttekintése (v1 tervezési nézet).
 * Nagy szám = szabad keret, alatta vékony sáv a betervezett arányról.
 * v1-ben NINCS valós „elköltött" adat (a tényleges tranzakciók a Wallet
 * rendszerben élnek), ezért a sáv a betervezett allokációt mutatja.
 */
export function BudgetCard({ summary, onPress }: BudgetCardProps) {
  if (!summary) {
    return (
      <DashboardCard
        icon={Wallet}
        tint="primary"
        title="Kassza"
        subtitle={currentMonthLabel()}
        accessibilityLabel="Kassza megnyitása"
        onPress={onPress}
      >
        <Text className="text-muted" style={{ marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Még nincs havi költségvetés
        </Text>
      </DashboardCard>
    )
  }

  const { keret, allocated, remaining } = summary
  const ratio = keret > 0 ? Math.min(allocated / keret, 1) : 0
  const pct = keret > 0 ? Math.round((allocated / keret) * 100) : 0
  const over = remaining < 0

  return (
    <DashboardCard
      icon={Wallet}
      tint="primary"
      title="Kassza"
      subtitle={currentMonthLabel()}
      accessibilityLabel="Kassza megnyitása"
      onPress={onPress}
    >
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text
          className={over ? 'text-warning' : 'text-foreground dark:text-dark-foreground'}
          style={{ fontSize: 38, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] }}
        >
          {formatHuNumber(remaining)}
        </Text>
        <Text
          className={over ? 'text-warning' : 'text-foreground dark:text-dark-foreground'}
          style={{ fontSize: 22, fontWeight: '800' }}
        >
          Ft
        </Text>
        <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700', marginLeft: 2 }}>
          szabad keret
        </Text>
      </View>

      <View
        className="bg-border dark:bg-dark-border"
        style={{ marginTop: 13, height: 8, borderRadius: 99, overflow: 'hidden' }}
      >
        <View
          className={over ? 'bg-warning' : 'bg-primary'}
          style={{ height: '100%', borderRadius: 99, width: `${Math.round(ratio * 100)}%` }}
        />
      </View>

      <View
        style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text className="text-muted" style={{ fontSize: 13, fontWeight: '700' }}>
          {'Betervezve '}
          <Text className="text-foreground dark:text-dark-foreground" style={{ fontWeight: '700' }}>
            {formatHuNumber(allocated)} Ft
          </Text>
          {` / ${formatHuNumber(keret)} Ft`}
        </Text>
        <Text className={over ? 'text-warning' : 'text-primary'} style={{ fontSize: 13, fontWeight: '700' }}>
          {pct}%
        </Text>
      </View>
    </DashboardCard>
  )
}
